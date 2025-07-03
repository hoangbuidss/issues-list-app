import React, { useCallback, useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";
import Spinner from "@atlaskit/spinner";
import Avatar from "@atlaskit/avatar";
import Button from "@atlaskit/button/new";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/glyph/chevron-right";
import PersonIcon from "@atlaskit/icon/glyph/person";
import EditIcon from "@atlaskit/icon/glyph/edit";
import TrashIcon from "@atlaskit/icon/glyph/trash";
import { ViewIssueModal } from "@forge/jira-bridge";
import Modal, {
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    ModalTransition,
} from "@atlaskit/modal-dialog";
import UpdateIssueDialog from "./UpdateIssueDialog";
import AddIcon from "@atlaskit/icon/glyph/add";
import CreateIssueDialog from "./CreateIssueDialog";
import { Pressable } from "@atlaskit/primitives/compiled";
import ErrorIcon from "@atlaskit/icon/glyph/error";
import SuccessIcon from "@atlaskit/icon/glyph/check-circle";
import Flag, { FlagGroup } from "@atlaskit/flag";
import { token } from "@atlaskit/tokens";

function IssuesList() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedIssues, setExpandedIssues] = useState({});
    // pagination state
    const [prevTokens, setPrevTokens] = useState([""]);
    const [currentToken, setCurrentToken] = useState("");
    const [nextToken, setNextToken] = useState("");
    const [isLastPage, setIsLastPage] = useState(false);
    // delete issue state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [issueToDelete, setIssueToDelete] = useState(null);
    // update issue state
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [issueToUpdate, setIssueToUpdate] = useState(null);
    // create issue state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // flag state
    const [flags, setFlags] = useState([]);

    // limit issue each page
    const MAX_RESULTS = 5;

    useEffect(() => {
        fetchIssues(currentToken);
    }, [currentToken]);

    const fetchIssues = async (token) => {
        setLoading(true);
        try {
            const context = await view.getContext();
            const projectKey = context?.extension?.project?.key;
            const result = await invoke("getListIssues", {
                projectKey,
                maxResults: MAX_RESULTS,
                nextPageToken: token,
            });

            const rootIssues = result.issues || [];

            const rootIssuesWithChildren = await Promise.all(
                rootIssues.map(async (issue) => {
                    if (issue.fields.subtasks?.length > 0) {
                        const keys = issue.fields.subtasks
                            .map((sub) => sub.key)
                            .join(",");
                        try {
                            const subtasksRes = await invoke(
                                "getIssuesByKeys",
                                {
                                    issueKeys: keys,
                                }
                            );
                            return {
                                ...issue,
                                children: subtasksRes.issues || [],
                            };
                        } catch {
                            return { ...issue, children: [] };
                        }
                    }
                    return { ...issue, children: [] };
                })
            );

            setIssues(rootIssuesWithChildren);
            setNextToken(result.nextPageToken || "");
            setIsLastPage(result.isLast || false);
        } catch (error) {
            console.error("Error fetching issues:", error);
        } finally {
            setLoading(false);
        }
    };

    // handle pagination
    const handleNext = () => {
        setPrevTokens((prev) => [...prev, currentToken]);
        setCurrentToken(nextToken);
    };

    const handlePrevious = () => {
        if (prevTokens.length <= 1) return;
        const newPrev = [...prevTokens];
        newPrev.pop();
        const newCurrent = newPrev[newPrev.length - 1];
        setPrevTokens(newPrev);
        setCurrentToken(newCurrent);
    };

    // handle flags
    const iconMap = (key) => {
        const icons = {
            success: (
                <SuccessIcon
                    label="Success"
                    primaryColor={token("color.icon.success")}
                />
            ),
            error: (
                <ErrorIcon
                    label="Error"
                    primaryColor={token("color.icon.danger")}
                />
            ),
        };
        return icons[key];
    };

    const addFlag = (description, icon, title) => {
        const uniqueId = `flag-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const flagData = {
            id: uniqueId,
            key: uniqueId,
            title: title,
            description: description,
            icon: iconMap(icon),
            created: Date.now(),
        };
        setFlags((current) => [flagData, ...current]);
    };

    const dismissFlag = useCallback((id) => {
        setFlags((current) => current.filter((flag) => flag.id !== id));
    }, []);

    // handle view issues
    const handleOpenViewIssue = (issueKey) => {
        const viewIssueModal = new ViewIssueModal({
            context: {
                issueKey: issueKey,
            },
        });
        viewIssueModal.open();
    };

    // handle update issue
    const handleUpdateIssue = (issue) => {
        setIssueToUpdate(issue);
        setIsUpdateModalOpen(true);
    };

    const handleCloseUpdateDialog = () => {
        setIsUpdateModalOpen(false);
        setIssueToUpdate(null);
    };

    const handleUpdateComplete = (success, message, issueKey) => {
        fetchIssues(currentToken);
        if (success) {
            addFlag(
                `Issue ${issueKey} updated successfully!`,
                "success",
                "Issue Updated"
            );
        } else {
            addFlag(
                `Failed to update issue: ${message}`,
                "error",
                "Issue Update Failed"
            );
        }
    };

    // handle create issue
    const handleCreateIssue = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateDialog = () => {
        setIsCreateModalOpen(false);
    };

    const handleCreateComplete = (success, message, issueKey) => {
        fetchIssues(currentToken);
        if (success) {
            addFlag(
                `Issue ${issueKey} created successfully!`,
                "success",
                "Issue Created"
            );
        } else {
            addFlag(
                `Failed to create issue: ${message}`,
                "error",
                "Issue Creation Failed"
            );
        }
    };

    // handle delete issue
    const handleDelete = async () => {
        if (!issueToDelete) return;

        try {
            await invoke("deleteIssue", { issueKey: issueToDelete });
            addFlag(
                `Issue ${issueToDelete} deleted successfully!`,
                "success",
                "Issue Deleted"
            );
            fetchIssues(currentToken);
        } catch (error) {
            console.error(`Error deleting issue ${issueToDelete}:`, error);
            addFlag(
                `Failed to delete issue: ${error.message || "Unknown Error"}`,
                "error",
                "Issue Deletion Failed"
            );
        } finally {
            setIsDeleteModalOpen(false);
            setIssueToDelete(null);
        }
    };

    // hande get sub-task
    const toggleExpand = (issueId) => {
        setExpandedIssues((prev) => ({
            ...prev,
            [issueId]: !prev[issueId],
        }));
    };

    const getIssueStatusColor = (issue) => {
        if (!issue || !issue.fields || !issue.fields.status) {
            return "#dfe1e6";
        }

        const statusName = issue.fields.status.name.toLowerCase();
        const statusColorMap = {
            done: "#36B37E",
            "in progress": "#0052CC",
            "to do": "#42526E",
        };
        return statusColorMap[statusName] || "#42526E";
    };

    const IssueItem = ({ issue, depth = 0 }) => {
        const hasChildren = issue.children && issue.children.length > 0;
        const isExpanded = expandedIssues[issue.id] || false;
        const typeUrl = issue.fields?.issuetype?.iconUrl;
        const summary = issue.fields?.summary || "";
        const statusName = issue.fields?.status?.name || "TO DO";
        const statusColor = getIssueStatusColor(issue);
        const assigneeAvatar = issue.fields?.assignee?.avatarUrls?.["24x24"];

        return (
            <>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        borderBottom: "1px solid #dfe1e6",
                        height: "40px",
                        paddingLeft: `${8 + depth * 24}px`,
                        backgroundColor: isExpanded ? "#f4f5f7" : "white",
                        fontFamily:
                            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                    }}
                >
                    <div style={{ width: "16px", marginRight: "8px" }}>
                        {hasChildren && (
                            <span
                                style={{ cursor: "pointer" }}
                                onClick={() => toggleExpand(issue.id)}
                            >
                                {isExpanded ? (
                                    <ChevronDownIcon
                                        size="small"
                                        primaryColor="#6B778C"
                                    />
                                ) : (
                                    <ChevronRightIcon
                                        size="small"
                                        primaryColor="#6B778C"
                                    />
                                )}
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            width: "24px",
                            marginRight: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Avatar
                            appearance="square"
                            src={typeUrl}
                            size="xsmall"
                        />
                    </div>

                    <div
                        style={{
                            width: "80px",
                            fontWeight: "bold",
                            color: "#172B4D",
                            marginRight: "8px",
                        }}
                    >
                        <Pressable
                            onClick={() => handleOpenViewIssue(issue.key)}
                        >
                            {issue.key}
                        </Pressable>
                    </div>

                    <div
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#172B4D",
                            marginRight: "8px",
                        }}
                    >
                        {summary}
                    </div>

                    <div style={{ marginRight: "8px" }}>
                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "white",
                                backgroundColor: statusColor,
                                padding: "2px 4px",
                                borderRadius: "3px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}
                        >
                            {statusName}
                        </span>
                    </div>

                    <div style={{ marginRight: "8px", flex: 1 }}>
                        {assigneeAvatar ? (
                            <Avatar
                                size="xsmall"
                                src={assigneeAvatar}
                                borderColor="transparent"
                                appearance="circle"
                            />
                        ) : (
                            <PersonIcon label="Unassigned" size="small" />
                        )}
                    </div>

                    {/* 7. Actions */}
                    <div
                        style={{
                            display: "flex",
                            marginRight: "8px",
                        }}
                    >
                        <span
                            style={{
                                cursor: "pointer",
                                padding: "4px",
                                marginRight: "4px",
                            }}
                            onClick={() => handleUpdateIssue(issue)}
                        >
                            <EditIcon size="small" primaryColor="#42526E" />
                        </span>
                        <span
                            style={{ cursor: "pointer", padding: "4px" }}
                            onClick={() => openDeleteModal(issue.key)}
                        >
                            <TrashIcon size="small" primaryColor="#42526E" />
                        </span>
                    </div>
                </div>

                {isExpanded &&
                    hasChildren &&
                    issue.children.map((child) => (
                        <IssueItem
                            key={child.id}
                            issue={child}
                            depth={depth + 1}
                        />
                    ))}
            </>
        );
    };
    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "40px",
                }}
            >
                <Spinner size="large" />
            </div>
        );
    }

    const openDeleteModal = (issueKey) => {
        setIssueToDelete(issueKey);
        setIsDeleteModalOpen(true);
    };

    const DeleteConfirmationModal = () => (
        <ModalTransition>
            {isDeleteModalOpen && (
                <Modal onClose={() => setIsDeleteModalOpen(false)}>
                    <ModalHeader hasCloseButton>
                        <ModalTitle>Delete this issue</ModalTitle>
                    </ModalHeader>
                    <ModalBody>Are you sure deleting this issue?</ModalBody>
                    <ModalFooter>
                        <Button
                            appearance="subtle"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            appearance="danger"
                            onClick={() => handleDelete()}
                        >
                            Delete
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </ModalTransition>
    );

    return (
        <div
            style={{
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                color: "#172B4D",
            }}
        >
            <CreateIssueDialog
                isOpen={isCreateModalOpen}
                onClose={handleCloseCreateDialog}
                onCreate={handleCreateComplete}
            />

            <UpdateIssueDialog
                isOpen={isUpdateModalOpen}
                onClose={handleCloseUpdateDialog}
                issue={issueToUpdate}
                onUpdate={handleUpdateComplete}
            />
            <DeleteConfirmationModal />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    borderBottom: "2px solid #dfe1e6",
                    paddingBottom: "16px",
                }}
            >
                <h1 style={{ margin: 0 }}></h1>
                <Button
                    appearance="primary"
                    iconBefore={() => <AddIcon size="small" />}
                    onClick={handleCreateIssue}
                >
                    Create Issue
                </Button>
            </div>

            <div style={{ borderTop: "1px solid #dfe1e6" }}>
                {issues.map((issue) => (
                    <IssueItem key={issue.id} issue={issue} />
                ))}
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "16px",
                    gap: "8px",
                }}
            >
                <Button
                    appearance="subtle"
                    isDisabled={prevTokens.length <= 1}
                    onClick={handlePrevious}
                >
                    Previous
                </Button>
                <Button
                    appearance="subtle"
                    isDisabled={isLastPage}
                    onClick={handleNext}
                >
                    Next
                </Button>
            </div>
            <FlagGroup onDismissed={dismissFlag}>
                {flags.map((flag) => (
                    <Flag
                        key={flag.id}
                        actions={[
                            {
                                content: "Dismiss",
                                onClick: () => dismissFlag(flag.id),
                            },
                        ]}
                        {...flag}
                    />
                ))}
            </FlagGroup>
        </div>
    );
}

export default IssuesList;
