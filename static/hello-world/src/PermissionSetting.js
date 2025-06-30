import { useEffect, useState } from "react";
import { requestJira, view } from "@forge/bridge";
import Heading from "@atlaskit/heading";
import { Text } from "@atlaskit/primitives/compiled";
import Toggle from "@atlaskit/toggle";

function PermissionSetting() {
    const [isEnabled, setIsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [projectKey, setProjectKey] = useState("");
    const property = "show-project-page";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const context = await view.getContext();
                const key = context?.extension?.project?.key;

                setProjectKey(key);

                const response = await requestJira(
                    `/rest/api/3/project/${key}/properties/${property}`,
                    {
                        headers: { Accept: "application/json" },
                    }
                );

                if (response.status === 200) {
                    // Property tồn tại → nghĩa là đang "ẩn" → Toggle sẽ hiện là OFF
                    setIsEnabled(false);
                } else if (response.status === 404 || response.status === 409) {
                    // Property không tồn tại → hiện là BẬT
                    setIsEnabled(true);
                } else {
                    throw new Error(`Unexpected response: ${response.status}`);
                }
            } catch (err) {
                console.error("Lỗi khi load:", err);
                setError("Không thể tải cài đặt");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleToggle = async () => {
        const newValue = !isEnabled;
        setSaving(true);
        setError(null);

        try {
            if (newValue) {
                // XÓA property → bật trang
                await requestJira(
                    `/rest/api/3/project/${projectKey}/properties/${property}`,
                    {
                        method: "DELETE",
                        headers: { Accept: "application/json" },
                    }
                );
            } else {
                // GHI property → ẩn trang
                await requestJira(
                    `/rest/api/3/project/${projectKey}/properties/${property}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({ value: true }),
                    }
                );
            }

            setIsEnabled(newValue);
        } catch (err) {
            console.error("Lỗi khi cập nhật property:", err);
            setError("Không thể lưu cài đặt");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Heading size="large">Project Setting Page</Heading>
            <Text size="medium" weight="bold" color="blue">
                Bật tắt Page
            </Text>
            <Toggle
                size="large"
                onChange={handleToggle}
                isChecked={isEnabled}
                isDisabled={saving || loading}
            />
            <Text size="large" weight="bold" color="red">
                Trạng thái hiện tại: {isEnabled ? "Bật" : "Tắt"}
            </Text>
            {error && (
                <Text size="medium" color="red">
                    {error}
                </Text>
            )}
        </>
    );
}

export default PermissionSetting;
