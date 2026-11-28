import { api } from './client'
import { apiError } from './error'
import type { IntakeConfig, IntakeResult, MailMessage, Paged, Paths } from './types'

type MessagesPage =
  Paths['/api/intake/messages']['get']['responses'][200]['content']['application/json']

export type MessageFilters = NonNullable<
  Paths['/api/intake/messages']['get']['parameters']['query']
>
export type MessageList = Paged<MessagesPage, 'messages', MailMessage>
export type IntakeConfigPatch =
  Paths['/api/intake']['patch']['requestBody']['content']['application/json']

/** Every route here is root-only, so the instance password is an argument. */
const auth = (credential: string) => ({ Authorization: `Bearer ${credential}` })

export async function getIntakeConfig(credential = ''): Promise<IntakeConfig> {
  const { data, error, response } = await api.GET('/api/intake', {
    headers: credential === '' ? {} : auth(credential),
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as IntakeConfig
}

export async function patchIntakeConfig(
  body: IntakeConfigPatch,
  credential: string,
): Promise<IntakeConfig> {
  const { data, error, response } = await api.PATCH('/api/intake', {
    headers: auth(credential),
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as IntakeConfig
}

export async function runIntake(credential: string): Promise<IntakeResult> {
  const { data, error, response } = await api.POST('/api/intake/run', {
    headers: auth(credential),
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as IntakeResult
}

export async function listMessages(
  filters: MessageFilters = {},
  credential = '',
): Promise<MessageList> {
  const { data, error, response } = await api.GET('/api/intake/messages', {
    headers: credential === '' ? {} : auth(credential),
    params: { query: filters },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as MessageList
}

export async function getMessage(ref: string, credential = ''): Promise<MailMessage> {
  const { data, error, response } = await api.GET('/api/intake/messages/{ref}', {
    headers: credential === '' ? {} : auth(credential),
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as MailMessage
}

export async function refreshMessage(ref: string, credential: string): Promise<MailMessage> {
  const { data, error, response } = await api.POST('/api/intake/messages/{ref}/refresh', {
    headers: auth(credential),
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as MailMessage
}
