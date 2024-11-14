import { Api } from '@/api-client/api';

export const api = new Api({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://granite-dev-wk5yf4fywa-an.a.run.app'
});

export const apiUrlFileUploader = `${api.baseUrl}/data/document`;

//ドキュメントデータを取得する
export const apiUrlCheckDocumentData = `${api.baseUrl}/data/document`;
// テーブルデータを取得する
export const apiUrlCheckTableData = `${api.baseUrl}/data/table`;
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
export const apiUrlGetParameterSales = `${api.baseUrl}/parameter/sales`;
