import React from "react";
import { Drawer, Image } from "antd";
import { formatText } from "@/components/dashboard/Chat/chatFormat";

interface ReferenceDrawerProps {
    visible: boolean;
    onClose: () => void;
    imageUrl: string;
    transcription: string;
}

const ReferenceDrawer: React.FC<ReferenceDrawerProps> = ({
    visible,
    onClose,
    imageUrl,
    transcription,
}) => {
    return (
        <Drawer
            title="引用情報"
            placement="right"
            onClose={onClose}
            open={visible}
            width="50%"
        >
            {imageUrl && (
                <img src={imageUrl} alt="引用画像" style={{ maxWidth: "100%" }} />
            )}
            {transcription && (
                <div style={{ marginTop: "16px" }}>
                    <strong>内容:</strong>
                    <p><div dangerouslySetInnerHTML={{ __html: formatText(transcription) }} /></p>
                </div>
            )}
        </Drawer>
    );
};

export default ReferenceDrawer;
