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
        if (issue && isOpen) {
            initializeForm();
            loadOptions();
        }
    }, [issue, isOpen]);

    const initializeForm = () => {
        setSummary(issue.fields?.summary || "");
        setDescription(issue.fields?.description || "");

        if (issue.fields?.issuetype) {
            setSelectedIssueType({
                label: issue.fields.issuetype.name,
                value: issue.fields.issuetype.id,
                iconUrl: issue.fields.issuetype.iconUrl,
            });
        }

        if (issue.fields?.status) {
            setSelectedStatus({
                label: issue.fields.status.name,
                value: issue.fields.status.id,
            });
        }

        if (issue.fields?.assignee) {
            setSelectedAssignee({
                label: issue.fields.assignee.displayName,
                value: issue.fields.assignee.accountId,
                avatarUrls: issue.fields.assignee.avatarUrls,
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

            console.log("projectId:::", projectId);

            // Load issue types
            const issueTypesRes = await invoke("getIssueTypes", { projectId });
            const issueTypeOptions = issueTypesRes.issueTypes.map((type) => ({
                label: type.name,
                value: type.id,
                iconUrl: type.iconUrl,
            }));
            setIssueTypes(issueTypeOptions);

            // Load statuses for current issue type
            if (issue.fields?.issuetype?.id) {
                const statusesRes = await invoke("getStatuses", {
                    projectKey,
                    issueTypeId: issue.fields.issuetype.id,
                });
                const statusOptions = statusesRes.statuses.map((status) => ({
                    label: status.name,
                    value: status.id,
                }));
                console.log("statusOptions:::", statusOptions);
                setStatuses(statusOptions);
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
            console.log("userOptions:::", userOptions);
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
                const statusOptions = statusesRes.statuses.map((status) => ({
                    label: status.name,
                    value: status.id,
                }));
                setStatuses(statusOptions);

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

            // Update status if changed
            if (
                selectedStatus &&
                selectedStatus.value !== issue.fields?.status?.id
            ) {
                fields.status = { id: selectedStatus.value };
            }

            // Update assignee if changed
            if (selectedAssignee) {
                const currentAssigneeId =
                    issue.fields?.assignee?.accountId || null;
                if (selectedAssignee.value !== currentAssigneeId) {
                    fields.assignee = selectedAssignee.value
                        ? { accountId: selectedAssignee.value }
                        : null;
                }
            }

            // Only make API call if there are changes
            if (Object.keys(fields).length === 0) {
                onClose();
                return;
            }

            const result = await invoke("updateIssue", {
                issueKey: issue.key,
                fields: fields,
            });

            if (result.success) {
                onUpdate(); // Refresh the issues list
                onClose();
            } else {
                console.error("Failed to update issue:", result.error);
            }
        } catch (error) {
            console.error("Error updating issue:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        initializeForm();
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
