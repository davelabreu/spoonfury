const BASE = "/api";

async function request(method: string, path: string, body?: unknown, token?: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(res.statusText), { status: res.status, data: err });
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path: string, token?: string) => request("GET", path, undefined, token),
  post: (path: string, body: unknown, token?: string) => request("POST", path, body, token),
  patch: (path: string, body: unknown, token?: string) => request("PATCH", path, body, token),
  delete: (path: string, token?: string) => request("DELETE", path, undefined, token),
};
