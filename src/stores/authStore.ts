// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { create } from "zustand";
import { openUrl } from "@tauri-apps/plugin-opener";
import { createAuthEndpoints, type AuthUser, type LoginInput, type RegisterInput } from "@/lib/api/endpoints/auth";
import type { ApiClientTokens } from "@/lib/api/client";
import { deleteRefreshToken, getRefreshToken, setRefreshToken } from "@/lib/tauri/keychain";
import { useDocumentStore } from "@/stores/documentStore";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "https://api.etapsky.com";

/** Shared token getters for API clients (auth, documents, billing). */
export function getApiClientTokens(): ApiClientTokens {
  return {
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshAccessToken: () => useAuthStore.getState().refresh(),
    clearSession: () => useAuthStore.getState()._setSignedOut(),
  };
}

type AuthStatus = "booting" | "signed_out" | "signed_in";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  init: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
  _setSignedOut: () => Promise<void>;
};

const authApi = createAuthEndpoints(API_BASE_URL, getApiClientTokens());

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "booting",
  user: null,
  accessToken: null,

  async init() {
    try {
      const rt = await getRefreshToken();
      if (!rt) {
        set({ status: "signed_out", user: null, accessToken: null });
        return;
      }
      const res = await authApi.refresh(rt);
      await setRefreshToken(res.tokens.refreshToken);
      set({
        status: "signed_in",
        accessToken: res.tokens.accessToken,
        user: res.user,
      });
      useDocumentStore.getState().resetForTenant(res.user.tenantId);
    } catch {
      await get()._setSignedOut();
    }
  },

  async login(input) {
    const res = await authApi.login(input);
    await setRefreshToken(res.tokens.refreshToken);
    set({
      status: "signed_in",
      accessToken: res.tokens.accessToken,
      user: res.user,
    });
    useDocumentStore.getState().resetForTenant(res.user.tenantId);
  },

  async register(input) {
    const res = await authApi.register(input);
    await setRefreshToken(res.tokens.refreshToken);
    set({
      status: "signed_in",
      accessToken: res.tokens.accessToken,
      user: res.user,
    });
    useDocumentStore.getState().resetForTenant(res.user.tenantId);
  },

  async loginWithMicrosoft() {
    const started = await authApi.startMicrosoftSso();
    await openUrl(started.authorizationUrl);

    const deadline = Date.now() + started.expiresIn * 1000;
    while (Date.now() < deadline) {
      const poll = await authApi.pollMicrosoftSso(started.flowId, started.pollToken);
      if (poll.status === "failed") {
        throw new Error(poll.error);
      }
      if (poll.status === "completed") {
        await setRefreshToken(poll.tokens.refreshToken);
        set({
          status: "signed_in",
          accessToken: poll.tokens.accessToken,
          user: poll.user,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Microsoft sign-in timed out. Please try again.");
  },

  async refresh() {
    try {
      const rt = await getRefreshToken();
      if (!rt) return null;
      const res = await authApi.refresh(rt);
      await setRefreshToken(res.tokens.refreshToken);
      set({
        status: "signed_in",
        accessToken: res.tokens.accessToken,
        user: res.user,
      });
      useDocumentStore.getState().resetForTenant(res.user.tenantId);
      return res.tokens.accessToken;
    } catch {
      await get()._setSignedOut();
      return null;
    }
  },

  async logout() {
    const rt = await getRefreshToken();
    await authApi.logout(rt).catch(() => {});
    await get()._setSignedOut();
  },

  async _setSignedOut() {
    await deleteRefreshToken().catch(() => {});
    set({
      status: "signed_out",
      user: null,
      accessToken: null,
    });
    useDocumentStore.getState().resetForTenant(null);
  },
}));
