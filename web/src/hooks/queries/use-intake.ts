import { useMutation, useQuery } from '@tanstack/react-query'

import {
  getConnection,
  revokeConnection,
  startConnection,
  type ConnectionStartRequest,
} from '@/api/connections'
import {
  getIntakeConfig,
  listMessages,
  patchIntakeConfig,
  refreshMessage,
  runIntake,
  type IntakeConfigPatch,
  type MessageFilters,
} from '@/api/intake'
import { queryClient } from '@/api/query'

/** Root-only every one of them: the instance password is what opens the mailbox settings. */
export function useConnection(credential: string) {
  return useQuery({
    queryKey: ['connections', credential],
    queryFn: () => getConnection(credential),
    enabled: credential !== '',
  })
}

export function useStartConnection() {
  return useMutation({
    mutationFn: ({ body, credential }: { body: ConnectionStartRequest; credential: string }) =>
      startConnection(body, credential),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useRevokeConnection() {
  return useMutation({
    mutationFn: ({ ref, credential }: { ref: string; credential: string }) =>
      revokeConnection(ref, credential),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useIntakeConfig(credential: string) {
  return useQuery({
    queryKey: ['intake', 'config', credential],
    queryFn: () => getIntakeConfig(credential),
    enabled: credential !== '',
  })
}

export function usePatchIntakeConfig() {
  return useMutation({
    mutationFn: ({ body, credential }: { body: IntakeConfigPatch; credential: string }) =>
      patchIntakeConfig(body, credential),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['intake'] })
    },
  })
}

export function useRunIntake() {
  return useMutation({
    mutationFn: (credential: string) => runIntake(credential),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['intake'] })
      await queryClient.invalidateQueries({ queryKey: ['captures'] })
    },
  })
}

export function useMessages(credential: string, filters: MessageFilters = {}) {
  return useQuery({
    queryKey: ['intake', 'messages', credential, filters],
    queryFn: () => listMessages(filters, credential),
    enabled: credential !== '',
  })
}

export function useRefreshMessage() {
  return useMutation({
    mutationFn: ({ ref, credential }: { ref: string; credential: string }) =>
      refreshMessage(ref, credential),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['intake', 'messages'] })
    },
  })
}
