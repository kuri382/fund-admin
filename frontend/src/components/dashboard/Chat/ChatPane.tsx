// src/components/Chat/ChatPane.tsx
import React, { useEffect, useRef, useState } from "react";
import { List } from "antd";
import ReferenceDrawer from "./References/ReferenceDrawer";
import ReferenceList from "./References/ReferenceList";
import { getAuth } from "firebase/auth";
import axios from "axios";

import { ChatMessage, ChatReference } from "@/components/dashboard/Chat/types";
import { formatText } from "@/components/dashboard/Chat/chatFormat";

import { apiUrlGetImageUrl } from "@/utils/api";

// =============================
// 1. 必要に応じた型の定義例
// =============================


export interface ChatPaneProps {
  messages: ChatMessage[];
}

// エンドポイントのレスポンス型
export interface ResGetImageUrl {
  imageUrl: string;
}

// Drawer に表示するデータ
interface DrawerContent {
  imageUrl: string;
  transcription: string;
}

// =============================
// 個別メッセージ項目コンポーネント
// =============================
interface ChatMessageItemProps {
  msg: ChatMessage;
  onOpenReference: (ref: ChatReference) => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  msg,
  onOpenReference,
}) => {
  const isUser = msg.sender === "user";
  return (
    <List.Item
      style={{
        display: "block",
        textAlign: isUser ? "right" : "left",
        marginBottom: "5px",
        padding: "5px",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: isUser ? "#e6f7ff" : "#ffffff",
          display: "inline-block",
          borderRadius: "8px",
          maxWidth: "70%",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
      />
      {msg.references && msg.references.length > 0 && (
        <ReferenceList
          references={msg.references}
          onOpenReference={onOpenReference}
        />
      )}
    </List.Item>
  );
};

// =============================
// メインチャットコンポーネント
// =============================
const ChatPane: React.FC<ChatPaneProps> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerContent, setDrawerContent] = useState<DrawerContent>({
    imageUrl: "",
    transcription: "",
  });

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user) {
    setError("認証が必要です");
    return null; // コンポーネントとして何も描画しない
  }

  // 引用ボタン押下時の処理
  const handleOpenReference = async (ref: ChatReference) => {
    try {
      const accessToken = await user.getIdToken(true);
      const url = apiUrlGetImageUrl(ref.fileUuid, ref.pageNumber);

      const response = await axios.get<ResGetImageUrl>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = response.data;

      setDrawerContent({
        imageUrl: data.imageUrl,
        transcription: ref.sourceText || "",
      });
      setDrawerVisible(true);
    } catch (error) {
      console.error("Error fetching image:", error);
      setError("画像の取得に失敗しました");
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        style={{
          maxHeight: "100%",
          overflowY: "auto",
          padding: "16px",
          background: "#f9f9f9",
          borderRadius: "8px",
          border: '5px solid #f0f0f0',
        }}
      >
        {/* エラーがある場合の表示 */}
        {error && (
          <div style={{ color: "red", marginBottom: "8px" }}>{error}</div>
        )}

        <List
          dataSource={messages}
          split={false}
          renderItem={(msg) => (
            <ChatMessageItem
              key={msg.messageId}
              msg={msg}
              onOpenReference={handleOpenReference}
            />
          )}
        />
      </div>

      <ReferenceDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        imageUrl={drawerContent.imageUrl}
        transcription={drawerContent.transcription}
      />
    </>
  );
};

export default ChatPane;
