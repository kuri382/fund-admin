// =============================
// Markdown風の記法をHTMLに変換する関数（元の実装）
// =============================
export const formatText = (text: string | undefined) => {
    if (!text) return "";
    let replaced = text
        .replace(/####\s(.*?)(?:\n|$)/g, "<strong>$1</strong>")
        .replace(/###\s(.*?)(?:\n|$)/g, "<strong>$1</strong>")
        .replace(/##\s(.*?)(?:\n|$)/g, "<strong>$1</strong>")
        .replace(/#\s(.*?)(?:\n|$)/g, "<strong>$1</strong>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    replaced = replaced
        .replace(/([^>\n]|^)(#)/g, "$1<br/>$2")
        .replace(/([^>\n]|^)([-・])\s/g, "$1<br/>&bull; ");

    replaced = replaced.replace(/\n/g, "<br/>");
    return replaced;
};