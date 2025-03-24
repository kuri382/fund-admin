import { Api } from '@/api-client/api';

export const api = new Api({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://granite-dev-wk5yf4fywa-an.a.run.app'
});

export const apiUrlFileUploader = `${api.baseUrl}/data/document`;

//ドキュメントデータを取得する
export const apiUrlCheckDocumentData = `${api.baseUrl}/data/document`;
// テーブルデータを取得する
export const apiUrlCheckTableData = `${api.baseUrl}/data/table`;
export const apiUrlGetDataReport = `${api.baseUrl}/data/report`;

// プロジェクトデータを管理する
export const apiUrlGetProjects = `${api.baseUrl}/projects`;
export const apiUrlSelectProject = `${api.baseUrl}/projects`;
export const apiUrlGetSelectedProject = `${api.baseUrl}/projects/selected`;
export const apiUrlPostProjects = `${api.baseUrl}/projects`;
export const apiUrlArciveProjects = `${api.baseUrl}/projects`;

// llm オペレーション
// old

export const apiUrlCreateEmbeddings = `${api.baseUrl}/explorer/create`;
export const apiUrlQueryQuestionAnswer = `${api.baseUrl}/explorer/query/qa`;
export const apiUrlQueryRag = `${api.baseUrl}/explorer/query`;
export const apiUrlQueryIssueAnalysis = `${api.baseUrl}/explorer/query/ia`;

// ページごと分析
export const apiUrlGetExplorerFinancialStatements = `${api.baseUrl}/explorer/financial_statements`;
export const apiUrlGetExplorerFinancialStatementsUUID = `${api.baseUrl}/explorer/financial_statements`;
export const apiUrlGetExplorerFinancialStatementsUUIDPages = `${api.baseUrl}/explorer/financial_statements`;

export const apiUrlGetImageList = `${api.baseUrl}/image/list`;

export const apiUrlGetParameterSummary = `${api.baseUrl}/parameter/summary`;
export const apiUrlGetParameterSales = `${api.baseUrl}/parameter/sales`;

// projection 事業計画書
export const apiUrlGetProjectionProfitAndLoss = `${api.baseUrl}/projection/profit_and_loss/metrics`;
export const apiUrlPostProjectionProfitAndLoss = `${api.baseUrl}/projection/profit_and_loss/metrics`;
export const apiUrlPostProjectionSaaSCustomerRevenue = `${api.baseUrl}/projection/saas/customer_revenue`;

// task カウント
export const apiUrlGetWorkerCount = `${api.baseUrl}/worker/count`;

// 例：ファイルリスト取得用APIエンドポイント
export const apiUrlGetRetrieverFiles = `${api.baseUrl}/retriever/files`;
// 例：選択されたファイルを送信するAPIエンドポイント
export const apiUrlPostRetrieverDebug = `${api.baseUrl}/api/sendSelectedFileUuids`;
export const apiUrlGetRetrieverChatSessions = `${api.baseUrl}/retriever/chat/sessions`;
export const apiUrlGetRetrieverChatSessionsSessionId = (sessionId: string) =>
  `${api.baseUrl}/retriever/chat/sessions/${sessionId}`;
export const apiUrlPostRetrieverChatSessions = `${api.baseUrl}/retriever/chat/sessions`;
export const apiUrlPostRetrieverChatSendMessage = `${api.baseUrl}/retriever/chat/send_message`;