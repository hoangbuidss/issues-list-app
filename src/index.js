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
    console.log("projectKey::", projectKey);
    console.log("property::", property);

    try {
        const response = await api
            .asUser()
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
            .asUser()
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

export const handler = resolver.getDefinitions();
