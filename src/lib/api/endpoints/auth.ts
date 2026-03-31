// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { z } from "zod";
import { createApiClient, type ApiClientTokens } from "@/lib/api/client";

const UserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  // SSO identities (e.g. Azure B2B guests) may return non-RFC mailbox principal strings.
  email: z.string().min(1),
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

const SsoStartResponseSchema = z.object({
  flowId: z.string().uuid(),
  pollToken: z.string().min(8),
  authorizationUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
});

const SsoPollResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("pending"),
    expiresIn: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal("failed"),
    error: z.string().min(1),
  }),
  z.object({
    status: z.literal("completed"),
    tokens: TokensSchema,
    user: UserSchema,
  }),
]);

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
    async startMicrosoftSso() {
      const raw = await client.get<unknown>("/v1/auth/microsoft/start");
      return SsoStartResponseSchema.parse(raw);
    },
    async pollMicrosoftSso(flowId: string, pollToken: string) {
      const raw = await client.get<unknown>(
        `/v1/auth/microsoft/poll?flowId=${encodeURIComponent(flowId)}&pollToken=${encodeURIComponent(pollToken)}`
      );
      return SsoPollResponseSchema.parse(raw);
    },
  };
}
