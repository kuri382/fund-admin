import React from "react";
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
      {references.map((ref, idx) => (
        <div key={idx}>
          {ref.sourceText && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onOpenReference(ref);
              }}
              style={{ textDecoration: "underline", color: "#1890ff", cursor: "pointer" }}
            >
              引用: {ref.fileName}, p{ref.pageNumber}
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReferenceList;
