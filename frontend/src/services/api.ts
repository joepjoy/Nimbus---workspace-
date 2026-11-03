import axios from 'axios';

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  withCredentials: true,
});

/** Extract a readable message from an API error. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message ?? (err.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the API running?' : err.message);
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

/** Unwrap the { success, data } envelope. */
export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>) => (await http.get(url, { params })).data.data as T,
  post: async <T>(url: string, body?: unknown) => (await http.post(url, body)).data.data as T,
  put: async <T>(url: string, body?: unknown) => (await http.put(url, body)).data.data as T,
  del: async <T = { message: string }>(url: string) => (await http.delete(url)).data.data as T,
};
