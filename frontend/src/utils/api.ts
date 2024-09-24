import { Api } from '@/api-client/api';

export const api = new Api({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://granite-dev-wk5yf4fywa-an.a.run.app'
});
