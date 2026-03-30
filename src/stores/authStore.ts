// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { create } from "zustand";
import { createAuthEndpoints, type AuthUser, type LoginInput, type RegisterInput } from "@/lib/api/endpoints/auth";
import { deleteRefreshToken, getRefreshToken, setRefreshToken } from "@/lib/tauri/keychain";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "https://api.etapsky.com";

type AuthStatus = "booting" | "signed_out" | "signed_in";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  init: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
  _setSignedOut: () => Promise<void>;
};

const authApi = createAuthEndpoints(API_BASE_URL, {
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: () => useAuthStore.getState().refresh(),
  clearSession: () => useAuthStore.getState()._setSignedOut(),
});

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
  },

  async register(input) {
    const res = await authApi.register(input);
    await setRefreshToken(res.tokens.refreshToken);
    set({
      status: "signed_in",
      accessToken: res.tokens.accessToken,
      user: res.user,
    });
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
  },
}));
