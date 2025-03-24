// 1) ファイル一覧を表す型
export interface FileItem {
    fileUuid: string;
    fileName: string;
}

// 2) チャットの参照元情報
export interface ChatReference {
    fileUuid: string;
    fileName: string;
    pageNumber: number;     // ページ番号など
    sourceText: string;    // 該当部分の原文など(オプション)
}

// 3) チャットメッセージ
export interface ChatMessage {
    messageId: string;                   // メッセージのユニークID
    text: string;                        // メッセージ本文
    sender: "user" | "system";           // 送信者
    timestamp: string;                   // 送信時刻
    references?: ChatReference[];        // 参照されたドキュメント情報
}

// 4) チャットエンドポイントのレスポンス例
export interface ChatResponse {
    responseMessage: string;            // AI 等から返ってきた回答
    references: ChatReference[];        // 参照情報一覧
    timestamp: string;
}

// 5) タブごとに独立したチャットセッションを持ちたい場合の管理
export interface ChatSession {
    sessionId: string;                  // セッションID
    sessionName: string;                // タブに表示する名前等
    messages: ChatMessage[];            // メッセージ履歴
    selectedFileUuids: string[];        // このセッションで選択中のファイル
}
