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
import Spinner from "@atlaskit/spinner";

function CreateIssueDialog({ isOpen, onClose, onCreate }) {
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIssueType, setSelectedIssueType] = useState(null);

    const [issueTypes, setIssueTypes] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (isOpen) {
            initializeForm();
            loadOptions();
        }
    }, [isOpen]);

    const initializeForm = () => {
        setSummary("");
        setDescription("");
        setSelectedIssueType(null);
    };

    const loadOptions = async () => {
        setLoadingOptions(true);
        try {
            const context = await view.getContext();
            const projectKey = context?.extension?.project?.key;

            // Load issue types
            const issueTypesRes = await invoke("getIssueTypes", {
                projectId: projectKey,
            });
            console.log("Issue types response:", issueTypesRes);

            if (
                issueTypesRes.issueTypes &&
                Array.isArray(issueTypesRes.issueTypes)
            ) {
                const issueTypeOptions = issueTypesRes.issueTypes.map(
                    (type) => ({
                        label: type.name,
                        value: type.id,
                        iconUrl: type.iconUrl,
                    })
                );
                setIssueTypes(issueTypeOptions);

                // Auto-select first issue type if available
                if (issueTypeOptions.length > 0) {
                    setSelectedIssueType(issueTypeOptions[0]);
                }
            } else {
                setIssueTypes([]);
            }
        } catch (error) {
            console.error("Error loading options:", error);
            setIssueTypes([]);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleCreate = async () => {
        // Validation
        if (!summary.trim()) {
            alert("Please enter a summary");
            return;
        }

        if (!selectedIssueType) {
            alert("Please select an issue type");
            return;
        }

        setLoading(true);

        try {
            const context = await view.getContext();
            const projectKey = context?.extension?.project?.key;

            const fields = {
                summary: summary.trim(),
                issuetype: { id: selectedIssueType.value },
            };

            // Add description if provided
            if (description.trim()) {
                fields.description = description.trim();
            }

            console.log("Creating issue with fields:", fields);

            const result = await invoke("createIssue", {
                projectKey,
                fields: fields,
            });

            if (result.success) {
                onCreate(); // Refresh the issues list
                onClose();
                alert(`Issue ${result.issue.key} created successfully!`);
            } else {
                console.error("Failed to create issue:", result.error);
                alert(
                    "Failed to create issue: " +
                        (result.error || "Unknown error")
                );
            }
        } catch (error) {
            console.error("Error creating issue:", error);
            alert("Error creating issue: " + error.message);
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
            <span>{data.label}</span>
        </div>
    );

    return (
        <ModalTransition>
            {isOpen && (
                <Modal onClose={handleClose} width="medium">
                    <ModalHeader>
                        <ModalTitle>Create New Issue</ModalTitle>
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
                                        Issue Type *
                                    </Label>
                                    <Select
                                        inputId="issue-type"
                                        value={selectedIssueType}
                                        onChange={setSelectedIssueType}
                                        options={issueTypes}
                                        components={{ Option: customOption }}
                                        isDisabled={loading}
                                        placeholder="Select issue type"
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <Label htmlFor="summary">Summary *</Label>
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
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
                                    <TextArea
                                        id="description"
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(e.target.value)
                                        }
                                        placeholder="Enter issue description (optional)"
                                        minimumRows={4}
                                        isDisabled={loading}
                                    />
                                </div>

                                <div
                                    style={{
                                        padding: "8px",
                                        backgroundColor: "#f4f5f7",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                    }}
                                >
                                    <strong>Note:</strong> Fields marked with *
                                    are required. The issue will be created with
                                    default status and unassigned.
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
                            onClick={handleCreate}
                            isLoading={loading}
                            isDisabled={loadingOptions}
                        >
                            Create Issue
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </ModalTransition>
    );
}

export default CreateIssueDialog;
