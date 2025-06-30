import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";
import Spinner from "@atlaskit/spinner";
import Avatar from "@atlaskit/avatar";
import Button from "@atlaskit/button/new";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/glyph/chevron-right";
import PersonIcon from "@atlaskit/icon/glyph/person";
import EditIcon from "@atlaskit/icon/glyph/edit";
import TrashIcon from "@atlaskit/icon/glyph/trash";
import Modal, {
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    ModalTransition,
} from "@atlaskit/modal-dialog";

function App() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedIssues, setExpandedIssues] = useState({});
    const [prevTokens, setPrevTokens] = useState([""]);
    const [currentToken, setCurrentToken] = useState("");
    const [nextToken, setNextToken] = useState("");
    const [isLastPage, setIsLastPage] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [issueToDelete, setIssueToDelete] = useState(null);

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

            console.log("result: ", result);

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

    const handleUpdate = (issueKey) => {
        console.log(`Update issue ${issueKey}`);
    };

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
                        <Avatar src={typeUrl} size="xsmall" />
                    </div>

                    <div
                        style={{
                            width: "80px",
                            fontWeight: "bold",
                            color: "#172B4D",
                            marginRight: "8px",
                        }}
                    >
                        {issue.key}
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
                            onClick={() => handleUpdate(issue.key)}
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
    const handleDelete = async () => {
        if (!issueToDelete) return;

        try {
            await invoke("deleteIssue", { issueKey: issueToDelete });
            fetchIssues(currentToken);
        } catch (error) {
            console.error(`Error deleting issue ${issueToDelete}:`, error);
        } finally {
            setIsDeleteModalOpen(false);
            setIssueToDelete(null);
        }
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
            <DeleteConfirmationModal />

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
        </div>
    );
}

export default App;
