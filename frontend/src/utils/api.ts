import { Api } from '@/api-client/api';

export const api = new Api({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://granite-dev-wk5yf4fywa-an.a.run.app'
});

//ドキュメントデータを取得する
export const apiUrlCheckDocumentData = `${api.baseUrl}/check/document_data`;
// テーブルデータを取得する
export const apiUrlCheckTableData = `${api.baseUrl}/check/table_data`;
