// src/components/Chat/ChatPane.tsx
import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/dashboard/Chat/types";
import { List } from "antd";

// Markdown風の記法をHTMLに変換する関数
const formatText = (text: string | undefined) => {
    if (!text) return "";

    // まずMarkdown風の記法(####, ###, ##, #, ** **)だけを処理
    let replaced = text
        .replace(/####\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/###\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/##\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/#\s(.*?)(?:\n|$)/g, '<strong>$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // ハッシュタグ (#) や箇条書き記号 (- や ・など) の前で改行を入れる
    replaced = replaced
        .replace(/([^>\n]|^)(#)/g, '$1<br/>$2') // # の前に改行
        .replace(/([^>\n]|^)([-・])\s/g, '$1<br/>$2 '); // - や ・の前に改行

    // 改行文字を <br/> に統一
    replaced = replaced.replace(/\n/g, '<br/>');

    return replaced;
};

interface ChatPaneProps {
    messages: ChatMessage[];
}

const ChatPane: React.FC<ChatPaneProps> = ({ messages }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // メッセージが更新されるたびにスクロールして最下部を表示
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div
            ref={containerRef}
            style={{
                maxHeight: "100%",
                overflowY: "auto",
                padding: "16px",
                background: "#f9f9f9",
                borderRadius: "8px",
            }}
        >
            <List
                dataSource={messages}
                renderItem={(msg) => {
                    const isUser = msg.sender === "user";
                    return (
                        <List.Item
                            style={{
                                display: "block",
                                textAlign: isUser ? "right" : "left",
                                marginBottom: "16px",
                            }}
                        >
                            {/*<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                                [{msg.sender}] {msg.timestamp}
                        </div>*/}
                            <div
                                style={{
                                    padding: "8px 12px",
                                    backgroundColor: isUser ? "#e6f7ff" : "#ffffff",
                                    display: "inline-block",
                                    borderRadius: "8px",
                                    maxWidth: "70%",
                                    wordBreak: "break-word",
                                }}
                                // HTMLを挿入するために dangerouslySetInnerHTML を利用
                                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                            />
                            {/* 参照情報があれば表示 */}
                            {msg.references && msg.references.length > 0 && (
                                <div style={{ marginTop: "4px", fontSize: "0.85em", color: "#888" }}>
                                    {msg.references.map((ref, idx) => (
                                        <div key={idx}>
                                            {ref.sourceText && <div>引用: {ref.fileName}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </List.Item>
                    );
                }}
            />
        </div>
    );
};

export default ChatPane;
