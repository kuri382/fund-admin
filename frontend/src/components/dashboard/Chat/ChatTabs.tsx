import React from "react";
import { Tabs } from "antd";
import { ChatSession } from "@/components/dashboard/Chat/types";

interface ChatTabsProps {
    sessions: ChatSession[];
    activeSessionId: string;
    onChangeTab: (sessionId: string) => void;
}

const ChatTabs: React.FC<ChatTabsProps> = ({
    sessions,
    activeSessionId,
    onChangeTab
}) => {
    // Tabs に渡す items 配列を組み立てる
    // label: タブの表示名
    // key: タブ切り替え時に扱う一意なキー
    // children: タブのコンテンツ（子要素）
    const tabItems = sessions.map((session) => ({
        label: session.sessionName,
        key: session.sessionId,
        children: (
            <div style={{ padding: 8 }}>
                {/* タブの中に表示したい内容があればここに書く */}
            </div>
        )
    }));

    return (
        <Tabs
            type="card"
            activeKey={activeSessionId}
            onChange={onChangeTab}
            style={{ height: "100%" }}
            items={tabItems}
        />
    );
};

export default ChatTabs;
