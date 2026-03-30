// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { z } from "zod";
import { createApiClient, type ApiClientTokens } from "@/lib/api/client";

const UserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional().transform((v) => v ?? ""),
  role: z.string(),
  permissions: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional().default(""),
});

const TokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().optional().default(0),
});

const AuthResponseSchema = z.object({
  tokens: TokensSchema,
  user: UserSchema,
});

const MeResponseSchema = z.object({
  user: UserSchema,
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterInputSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export type AuthUser = z.infer<typeof UserSchema>;
export type AuthTokens = z.infer<typeof TokensSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export function createAuthEndpoints(baseUrl: string, tokens: ApiClientTokens) {
  const client = createApiClient(baseUrl, tokens);

  return {
    async login(input: LoginInput) {
      const body = LoginInputSchema.parse(input);
      const raw = await client.post<unknown>("/v1/auth/login", body);
      return AuthResponseSchema.parse(raw);
    },
    async register(input: RegisterInput) {
      const body = RegisterInputSchema.parse(input);
      const raw = await client.post<unknown>("/v1/auth/register", body);
      return AuthResponseSchema.parse(raw);
    },
    async refresh(refreshToken: string) {
      const raw = await client.post<unknown>("/v1/auth/refresh", { refreshToken });
      return AuthResponseSchema.parse(raw);
    },
    async me() {
      const raw = await client.get<unknown>("/v1/auth/me");
      return MeResponseSchema.parse(raw).user;
    },
    async logout(refreshToken: string | null) {
      await client.post("/v1/auth/logout", refreshToken ? { refreshToken } : undefined);
    },
  };
}
