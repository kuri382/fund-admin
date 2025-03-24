import React, { useState } from "react";
import { Input, Button } from "antd";
import { SendOutlined, LoadingOutlined } from "@ant-design/icons";

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [inputText, setInputText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageToSend = inputText;
    setInputText("");
    setIsSending(true);
    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleComposition = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    if (e.type === "compositionstart") {
      setIsComposing(true);
    } else if (e.type === "compositionend") {
      setIsComposing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSending || isComposing) return;
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
        placeholder="質問を入力してください..."
      />
      <Button
        type="primary"
        onClick={handleSend}
        disabled={isSending}
        icon={isSending ? <LoadingOutlined /> : <SendOutlined />}
      >
        送信
      </Button>
    </div>
  );
};

export default ChatInput;
