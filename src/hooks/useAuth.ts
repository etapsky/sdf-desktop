// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const init = useAuthStore((s) => s.init);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginWithMicrosoft = useAuthStore((s) => s.loginWithMicrosoft);
  const logout = useAuthStore((s) => s.logout);
  const refresh = useAuthStore((s) => s.refresh);

  return useMemo(
    () => ({
      status,
      user,
      isLoading: status === "booting",
      isAuthenticated: status === "signed_in",
      init,
      login,
      register,
      loginWithMicrosoft,
      logout,
      refresh,
    }),
    [status, user, init, login, register, loginWithMicrosoft, logout, refresh]
  );
}
