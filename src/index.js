import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const resolver = new Resolver();
const listIssuesFields = [
    "key",
    "issuetype",
    "summary",
    "status",
    "assignee",
    "subtasks",
    "parent",
];

resolver.define("getListIssues", async (req) => {
    const { projectKey, nextPageToken, maxResults } = req.payload;
    const project = `project=${encodeURIComponent(projectKey)}`;
    const token = nextPageToken ? nextPageToken : "";
    const response = await api
        .asUser()
        .requestJira(
            route`/rest/api/3/search/jql?jql=${project} AND parent is EMPTY&maxResults=${maxResults}&nextPageToken=${token}&fields=${listIssuesFields}`
        );
    const data = await response.json();
    return data;
});

resolver.define("getIssuesByKeys", async (req) => {
    const { issueKeys } = req.payload;
    if (!issueKeys) return { issues: [] };
    const response = await api
        .asUser()
        .requestJira(
            route`/rest/api/3/search/jql?jql=key in (${issueKeys})&fields=${listIssuesFields}`
        );
    const data = await response.json();
    return data;
});

resolver.define("updateIssue", async (req) => {
    const { issueKey, fields } = req.payload;

    try {
        const response = await api
            .asUser()
            .requestJira(route`/rest/api/3/issue/${issueKey}`, {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fields: fields,
                }),
            });

        return { success: true };
    } catch (error) {
        console.error("Error updating issue:", error);
        return { success: false, error: error.message };
    }
});

resolver.define("deleteIssue", async (req) => {
    const { issueKey } = req.payload;

    try {
        const response = await api
            .asUser()
            .requestJira(route`/rest/api/3/issue/${issueKey}`, {
                method: "DELETE",
            });

        return { success: true };
    } catch (error) {
        console.error("Error deleting issue:", error);
        return {
            success: false,
            error: error.message,
        };
    }
});

resolver.define("getProperty", async (req) => {
    const { projectKey, property } = req.payload;

    try {
        const response = await api
            .asApp()
            .requestJira(
                route`/rest/api/3/project/${projectKey}/properties/${property}`,
                {
                    headers: {
                        Accept: "application/json",
                    },
                }
            );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error getting property:", error);
        // Return null if property doesn't exist (404) or other errors
        return null;
    }
});

resolver.define("deleteProperty", async (req) => {
    const { projectKey, property } = req.payload;
    try {
        await api
            .asUser()
            .requestJira(
                route`/rest/api/3/project/${projectKey}/properties/${property}`,
                {
                    headers: {
                        Accept: "application/json",
                    },
                    method: "DELETE",
                }
            );
        return { success: true };
    } catch (error) {
        console.error("Error delete property: ", error);
        return { success: false, error: error.message };
    }
});

resolver.define("saveProperty", async (req) => {
    const { projectKey, property } = req.payload;
    try {
        const response = await api
            .asApp()
            .requestJira(
                route`/rest/api/3/project/${projectKey}/properties/${property}`,
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    method: "PUT",
                    body: JSON.stringify({ value: true }),
                }
            );
        return { success: true };
    } catch (error) {
        console.error("Error saving property:", error);
        return { success: false, error: error.message };
    }
});

resolver.define("getIssueTypes", async (req) => {
    const { projectId } = req.payload;
    try {
        const response = await api
            .asApp()
            .requestJira(route`/rest/api/3/project/${projectId}`, {
                headers: {
                    Accept: "application/json",
                },
            });
        const data = await response.json();

        console.log("Project data:", JSON.stringify(data, null, 2));

        // Get issue types from project data
        const issueTypes = data.issueTypes || [];

        return {
            issueTypes: issueTypes.map((type) => ({
                id: type.id,
                name: type.name,
                iconUrl: type.iconUrl,
            })),
        };
    } catch (error) {
        console.error("Error getting issue types:", error);
        return { issueTypes: [] };
    }
});

resolver.define("getStatuses", async (req) => {
    const { projectKey } = req.payload;
    try {
        const response = await api
            .asApp()
            .requestJira(route`/rest/api/3/project/${projectKey}/statuses`, {
                headers: {
                    Accept: "application/json",
                },
            });
        const data = await response.json();

        console.log("Statuses data:", data);
        const statuses = data[0].statuses;
        console.log("Statuses response:: ", statuses);
        return statuses;
    } catch (error) {
        console.error("Error getting statuses:", error);
        return { statuses: [] };
    }
});

resolver.define("getAssignableUsers", async (req) => {
    const { projectKey, issueKey } = req.payload;
    try {
        const response = await api
            .asUser()
            .requestJira(
                route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`,
                {
                    headers: {
                        Accept: "application/json",
                    },
                }
            );
        const data = await response.json();

        console.log("Assignable users data:", JSON.stringify(data, null, 2));

        // Check if data is an array
        if (!Array.isArray(data)) {
            console.error("Assignable users response is not an array:", data);
            return { users: [] };
        }

        return {
            users: data.map((user) => ({
                accountId: user.accountId,
                displayName: user.displayName,
                emailAddress: user.emailAddress,
                avatarUrls: user.avatarUrls,
            })),
        };
    } catch (error) {
        console.error("Error getting assignable users:", error);
        return { users: [] };
    }
});

resolver.define("createIssue", async (req) => {
    const { projectKey, fields } = req.payload;

    try {
        const response = await api
            .asUser()
            .requestJira(route`/rest/api/3/issue`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fields: {
                        project: {
                            key: projectKey,
                        },
                        ...fields,
                    },
                }),
            });

        const data = await response.json();
        console.log("Created issue:", data);

        return {
            success: true,
            issue: data,
        };
    } catch (error) {
        console.error("Error creating issue:", error);
        return {
            success: false,
            error: error.message,
        };
    }
});

resolver.define("getTransitions", async (req) => {
    const { issueKey } = req.payload;
    try {
        const response = await api
            .asUser()
            .requestJira(route`/rest/api/3/issue/${issueKey}/transitions`, {
                headers: {
                    Accept: "application/json",
                },
            });
        const data = await response.json();
        console.log("Transitions data:", JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error("Error getting transitions:", error);
        return { transitions: [] };
    }
});

resolver.define("transitionIssue", async (req) => {
    const { issueKey, transitionId } = req.payload;

    try {
        const response = await api
            .asUser()
            .requestJira(route`/rest/api/3/issue/${issueKey}/transitions`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    transition: {
                        id: transitionId,
                    },
                }),
            });
        if (response.status >= 200 && response.status < 300) {
            return { success: true };
        } else {
            const error = await response.text();
            console.error(`Error transitioning issue ${issueKey}:`, error);
            return { success: false, error: `Status update failed: ${error}` };
        }
    } catch (error) {
        console.error(`Error in transitionIssue for ${issueKey}:`, error);
        return { success: false, error: error.message };
    }
});

export const handler = resolver.getDefinitions();
