// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { z } from "zod";
import { httpFetch } from "@/lib/api/httpFetch";

const ApiErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiClientTokens = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  clearSession: () => Promise<void> | void;
};

export class ApiHttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Human-readable line for UI; in `import.meta.env.DEV` includes status + code for debugging. */
export function describeApiError(e: unknown): string {
  if (e instanceof ApiHttpError) {
    const base = e.message;
    if (import.meta.env.DEV) {
      return `[HTTP ${e.statusCode}] ${e.code}: ${base}`;
    }
    return base;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

function buildUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  if (!signal) return AbortSignal.timeout(timeoutMs);
  const timeout = AbortSignal.timeout(timeoutMs);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  timeout.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

async function throwApiErrorFromResponse(response: Response): Promise<never> {
  const text = await response.text();
  let raw: unknown = null;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  const parsed = ApiErrorSchema.safeParse(raw);
  const code = parsed.success ? parsed.data.error ?? "HTTP_ERROR" : "HTTP_ERROR";
  const message = parsed.success
    ? parsed.data.message ?? `Request failed (${response.status})`
    : text
      ? text.slice(0, 280)
      : `Request failed (${response.status})`;
  const details = parsed.success ? parsed.data.details : undefined;
  throw new ApiHttpError(response.status, code, message, details);
}

export function createApiClient(baseUrl: string, tokens: ApiClientTokens) {
  async function authorizedFetch(
    path: string,
    init: RequestInit = {},
    retryOn401: boolean,
    timeoutMs: number
  ): Promise<Response> {
    const accessToken = tokens.getAccessToken();
    const headers = new Headers(init.headers ?? {});
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    let response: Response;
    try {
      response = await httpFetch(buildUrl(baseUrl, path), {
        ...init,
        credentials: "include",
        headers,
        signal: withTimeout(init.signal ?? undefined, timeoutMs),
      });
    } catch (e) {
      const msg =
        e instanceof TypeError
          ? "Network error (offline, DNS, TLS, or CORS blocked the request)."
          : e instanceof Error
            ? e.message
            : String(e);
      throw new ApiHttpError(0, "NETWORK", msg);
    }

    if (response.status === 401 && retryOn401) {
      const nextToken = await tokens.refreshAccessToken();
      if (nextToken) return authorizedFetch(path, init, false, timeoutMs);
      await tokens.clearSession();
    }

    return response;
  }

  async function doRequest<T>(
    path: string,
    init: RequestInit = {},
    retryOn401 = true
  ): Promise<T> {
    const response = await authorizedFetch(path, init, retryOn401, 15000);
    if (!response.ok) await throwApiErrorFromResponse(response);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async function getBinary(path: string): Promise<ArrayBuffer> {
    const response = await authorizedFetch(
      path,
      { method: "GET", headers: { Accept: "*/*" } },
      true,
      120000
    );
    if (!response.ok) await throwApiErrorFromResponse(response);
    return response.arrayBuffer();
  }

  async function postMultipart<T>(path: string, formData: FormData): Promise<T> {
    const response = await authorizedFetch(path, { method: "POST", body: formData }, true, 120000);
    if (!response.ok) await throwApiErrorFromResponse(response);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => doRequest<T>(path, { method: "GET" }),
    post: <T>(path: string, body?: unknown) =>
      doRequest<T>(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    delete: <T = void>(path: string) => doRequest<T>(path, { method: "DELETE" }),
    getBinary,
    postMultipart,
  };
}
