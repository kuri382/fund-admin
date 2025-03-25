import { marked } from 'marked';

export const formatText = (text: string) => {
    if (!text) return "";
    return marked(text);
};
