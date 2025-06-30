import { useEffect, useState } from "react";
import { view } from "@forge/bridge";
import PermissionSetting from "./PermissionSetting";
import IssuesList from "./IssuesList";

function App() {
    const [moduleKey, setModuleKey] = useState("");
    const settingKey =
        "access-permission-toggle-app-hello-world-project-settings-page";

    const fetchModuleKey = async () => {
        const context = await view.getContext();
        const key = context?.moduleKey;
        setModuleKey(key);
    };

    useEffect(() => {
        fetchModuleKey();
    }, []);

    if (moduleKey === settingKey) {
        return <PermissionSetting />;
    }

    return <IssuesList />;
}

export default App;
