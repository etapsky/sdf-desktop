// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, getApiClientTokens } from "@/stores/authStore";
import { createDocumentsEndpoints } from "@/lib/api/endpoints/documents";
import { createBillingEndpoints } from "@/lib/api/endpoints/billing";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";

const documentsApi = createDocumentsEndpoints(API_BASE_URL, getApiClientTokens());
const billingApi = createBillingEndpoints(API_BASE_URL, getApiClientTokens());

const PAGE = 1;
const PER_PAGE = 50;

export function useCloudSync() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: queryKeys.cloud.documents(PAGE, PER_PAGE),
    queryFn: () => documentsApi.list({ page: PAGE, perPage: PER_PAGE }),
    enabled: isAuthenticated,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.billing.usage(user?.tenantId),
    queryFn: () => billingApi.usage(),
    enabled: isAuthenticated,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cloud"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cloud"] });
    },
  });

  return {
    documentsQuery,
    usageQuery,
    uploadMutation,
    deleteMutation,
    downloadBytes: (id: string) => documentsApi.downloadBytes(id),
  };
}
