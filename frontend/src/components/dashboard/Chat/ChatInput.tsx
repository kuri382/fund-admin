import React, { useState } from "react";
import { Input, Button } from "antd";

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [inputText, setInputText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      await onSendMessage(inputText);
      setInputText("");
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Composition(日本語変換)の開始/終了を管理
  const handleComposition = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    if (e.type === "compositionstart") {
      setIsComposing(true);
    } else if (e.type === "compositionend") {
      setIsComposing(false);
    }
  };

  // Enter キー押下時に送信するが、日本語変換中は無視する
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <Input.TextArea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onCompositionStart={handleComposition}
        onCompositionEnd={handleComposition}
        onPressEnter={handleKeyPress}
        autoSize={{ minRows: 1, maxRows: 4 }}
        placeholder="メッセージを入力..."
        //disabled={isSending}  // 送信中は入力も無効にする
      />
      <Button type="primary" onClick={handleSend} disabled={isSending}>
        送信
      </Button>
    </div>
  );
};

export default ChatInput;
