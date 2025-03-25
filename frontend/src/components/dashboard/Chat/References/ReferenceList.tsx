import React from "react";
import { Tag } from "antd";
import { ChatReference } from "@/components/dashboard/Chat/types";

interface ReferenceListProps {
  references: ChatReference[];
  onOpenReference: (ref: ChatReference) => void;
}

const ReferenceList: React.FC<ReferenceListProps> = ({
  references,
  onOpenReference,
}) => {
  return (
    <div style={{ marginTop: "4px", fontSize: "0.85em", color: "#888" }}>
      {references.map((ref, idx) => {
        if (!ref.sourceText) return null;

        return (
          <Tag
            key={idx}
            color="blue"
            style={{ cursor: "pointer", marginBottom: "4px" }}
            onClick={() => onOpenReference(ref)}
          >
            {/** Tag の中の文言は自由に変更 */}
            引用: {ref.fileName}, p{ref.pageNumber}
          </Tag>
        );
      })}
    </div>
  );
};

export default ReferenceList;
