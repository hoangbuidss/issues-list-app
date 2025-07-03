import React, { useState, useEffect } from "react";
import { invoke, view } from "@forge/bridge";
import Modal, {
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    ModalTransition,
} from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import TextArea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import { Label } from "@atlaskit/form";
import Avatar from "@atlaskit/avatar";
import Spinner from "@atlaskit/spinner";

function UpdateIssueDialog({ isOpen, onClose, issue, onUpdate }) {
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIssueType, setSelectedIssueType] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedAssignee, setSelectedAssignee] = useState(null);

    const [issueTypes, setIssueTypes] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [assignableUsers, setAssignableUsers] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (isOpen && issue) {
            if (typeof issue === "string") {
                fetchIssueData(issue);
            } else {
                initializeForm(issue);
                loadOptions();
            }
        }
    }, [isOpen, issue]);

    // Update fetchIssueData to initialize the form
    const fetchIssueData = async (issueKey) => {
        setLoading(true);
        try {
            const result = await invoke("getIssue", { issueKey });
            if (result) {
                initializeForm(result);
                loadOptions();
            }
        } catch (error) {
            console.error("Error fetching issue details:", error);
        } finally {
            setLoading(false);
        }
    };

    // Modify initializeForm to accept the issue object as parameter
    const initializeForm = (issueData) => {
        // Use the passed issue data or fall back to the prop
        const issueToUse = issueData || issue;

        if (!issueToUse) return;

        setSummary(issueToUse.fields?.summary || "");
        setDescription(issueToUse.fields?.description || "");

        if (issueToUse.fields?.issuetype) {
            setSelectedIssueType({
                label: issueToUse.fields.issuetype.name,
                value: issueToUse.fields.issuetype.id,
                iconUrl: issueToUse.fields.issuetype.iconUrl,
            });
        }

        if (issueToUse.fields?.status) {
            setSelectedStatus({
                label: issueToUse.fields.status.name,
                value: issueToUse.fields.status.id,
            });
        }

        if (issueToUse.fields?.assignee) {
            setSelectedAssignee({
                label: issueToUse.fields.assignee.displayName,
                value: issueToUse.fields.assignee.accountId,
                avatarUrls: issueToUse.fields.assignee.avatarUrls,
            });
        } else {
            setSelectedAssignee({
                label: "Unassigned",
                value: null,
            });
        }
    };

    const loadOptions = async () => {
        setLoadingOptions(true);
        try {
            const context = await view.getContext();
            const projectKey = context?.extension?.project?.key;
            const projectId = context?.extension?.project?.id;
            // Load issue types
            const issueTypesRes = await invoke("getIssueTypes", { projectId });
            const issueTypeOptions = issueTypesRes.issueTypes.map((type) => ({
                label: type.name,
                value: type.id,
                iconUrl: type.iconUrl,
            }));
            setIssueTypes(issueTypeOptions);

            // Load statuses project
            const statusRes = await invoke("getStatuses", {
                projectKey,
            });

            if (Array.isArray(statusRes)) {
                const statusOptions = statusRes.map((status) => ({
                    label: status.name,
                    value: status.id,
                    statusCategory: status.statusCategory,
                    description: status.description,
                }));
                setStatuses(statusOptions);
            } else {
                console.error("Unexpected status response format:", statusRes);
                setStatuses([]);
            }

            // Load assignable users
            const usersRes = await invoke("getAssignableUsers", {
                projectKey,
                issueKey: issue.key,
            });
            const userOptions = [
                { label: "Unassigned", value: null },
                ...usersRes.users.map((user) => ({
                    label: user.displayName,
                    value: user.accountId,
                    avatarUrls: user.avatarUrls,
                })),
            ];
            setAssignableUsers(userOptions);
        } catch (error) {
            console.error("Error loading options:", error);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleIssueTypeChange = async (selectedOption) => {
        setSelectedIssueType(selectedOption);

        // Load statuses for the new issue type
        if (selectedOption) {
            try {
                const context = await view.getContext();
                const projectKey = context?.extension?.project?.key;

                const statusesRes = await invoke("getStatuses", {
                    projectKey,
                    issueTypeId: selectedOption.value,
                });

                // Check if statusesRes is an array
                if (Array.isArray(statusesRes)) {
                    const statusOptions = statusesRes.map((status) => ({
                        label: status.name,
                        value: status.id,
                        statusCategory: status.statusCategory,
                        description: status.description,
                    }));
                    setStatuses(statusOptions);
                } else {
                    console.error(
                        "Unexpected status response format:",
                        statusesRes
                    );
                    setStatuses([]);
                }

                // Reset status selection
                setSelectedStatus(null);
            } catch (error) {
                console.error("Error loading statuses:", error);
            }
        }
    };

    const handleUpdate = async () => {
        if (!issue) return;

        setLoading(true);

        try {
            const fields = {};
            let statusTransitionNeeded = false;
            let transitionId = null;

            // Update summary if changed
            if (summary !== issue.fields?.summary) {
                fields.summary = summary;
            }

            // Update description if changed
            if (description !== (issue.fields?.description || "")) {
                fields.description = description;
            }

            // Update issue type if changed
            if (
                selectedIssueType &&
                selectedIssueType.value !== issue.fields?.issuetype?.id
            ) {
                fields.issuetype = { id: selectedIssueType.value };
            }

            // Check if status needs updating
            if (
                selectedStatus &&
                selectedStatus.value !== issue.fields?.status?.id
            ) {
                statusTransitionNeeded = true;

                // find transition ID for the selected status
                const transitionsRes = await invoke("getTransitions", {
                    issueKey: issue.key,
                });

                if (transitionsRes.transitions) {
                    const transition = transitionsRes.transitions.find(
                        (t) => t.to.id === selectedStatus.value
                    );

                    if (transition) {
                        transitionId = transition.id;
                    } else {
                        throw new Error(
                            `No transition found for status: ${selectedStatus.label}`
                        );
                    }
                }
            }

            // update assignee if changed
            if (selectedAssignee) {
                const currentAssigneeId =
                    issue.fields?.assignee?.accountId || null;
                if (selectedAssignee.value !== currentAssigneeId) {
                    fields.assignee = selectedAssignee.value
                        ? { accountId: selectedAssignee.value }
                        : null;
                }
            }

            // check if need to make any updates
            const needsFieldUpdate = Object.keys(fields).length > 0;
            if (!needsFieldUpdate && !statusTransitionNeeded) {
                onClose();
                return;
            }
            let success = true;
            let errorMessage = null;
            if (needsFieldUpdate) {
                const fieldResult = await invoke("updateIssue", {
                    issueKey: issue.key,
                    fields: fields,
                });

                if (!fieldResult.success) {
                    success = false;
                    errorMessage =
                        fieldResult.error || "Failed to update issue fields";
                    console.error(
                        "Failed to update issue fields:",
                        fieldResult.error
                    );
                }
            }

            if (statusTransitionNeeded && success && transitionId) {
                const transitionResult = await invoke("transitionIssue", {
                    issueKey: issue.key,
                    transitionId: transitionId,
                });

                if (!transitionResult.success) {
                    success = false;
                    errorMessage =
                        transitionResult.error ||
                        "Failed to update issue status";
                    console.error(
                        "Failed to transition issue:",
                        transitionResult.error
                    );
                }
            }

            if (success) {
                onUpdate(
                    true,
                    `Issue ${issue.key} updated successfully`,
                    issue.key
                );
                onClose();
            } else {
                onUpdate(
                    false,
                    errorMessage || "Failed to update issue",
                    issue.key
                );
            }
        } catch (error) {
            console.error("Error updating issue:", error);
            onUpdate(false, error.message || "Error updating issue", issue.key);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    const customOption = ({ data, ...props }) => (
        <div
            {...props.innerProps}
            style={{ display: "flex", alignItems: "center", padding: "8px" }}
        >
            {data.iconUrl && (
                <img
                    src={data.iconUrl}
                    alt=""
                    style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "8px",
                    }}
                />
            )}
            {data.avatarUrls && (
                <Avatar
                    size="xsmall"
                    src={data.avatarUrls["24x24"]}
                    name={data.label}
                    appearance="circle"
                />
            )}
            <span style={{ marginLeft: data.avatarUrls ? "8px" : "0" }}>
                {data.label}
            </span>
        </div>
    );

    return (
        <ModalTransition>
            {isOpen && issue && (
                <Modal onClose={handleClose} width="medium">
                    <ModalHeader>
                        <ModalTitle>Update Issue: {issue.key}</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {loadingOptions && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    padding: "20px",
                                }}
                            >
                                <Spinner size="medium" />
                            </div>
                        )}

                        {!loadingOptions && (
                            <>
                                <div style={{ marginBottom: "16px" }}>
                                    <Label htmlFor="issue-type">
                                        Issue Type
                                    </Label>
                                    <Select
                                        inputId="issue-type"
                                        value={selectedIssueType}
                                        onChange={handleIssueTypeChange}
                                        options={issueTypes}
                                        components={{ Option: customOption }}
                                        isDisabled={loading}
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <Label htmlFor="summary">Summary</Label>
                                    <TextField
                                        id="summary"
                                        value={summary}
                                        onChange={(e) =>
                                            setSummary(e.target.value)
                                        }
                                        placeholder="Enter issue summary"
                                        isDisabled={loading}
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        inputId="status"
                                        value={selectedStatus}
                                        onChange={setSelectedStatus}
                                        options={statuses}
                                        isDisabled={
                                            loading || !selectedIssueType
                                        }
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <Label htmlFor="assignee">Assignee</Label>
                                    <Select
                                        inputId="assignee"
                                        value={selectedAssignee}
                                        onChange={setSelectedAssignee}
                                        options={assignableUsers}
                                        components={{ Option: customOption }}
                                        isDisabled={loading}
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
                                    <TextArea
                                        id="description"
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(e.target.value)
                                        }
                                        placeholder="Enter issue description"
                                        minimumRows={4}
                                        isDisabled={loading}
                                    />
                                </div>
                            </>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            appearance="subtle"
                            onClick={handleClose}
                            isDisabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleUpdate}
                            isLoading={loading}
                            isDisabled={loadingOptions}
                        >
                            Update Issue
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </ModalTransition>
    );
}

export default UpdateIssueDialog;
