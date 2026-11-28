import type { components, operations, paths } from '@/types/generated/openapi'

export type { components, operations }
export type Paths = paths

type Schemas = components['schemas']

/**
 * A schema as the API sends it: `openapi-typescript` marks every field optional because the
 * Go struct carries no `required`, so `-?` and `Exclude<…, undefined>` put the value back,
 * recursing through objects and arrays.
 */
export type Fixed<T> = T extends readonly (infer Item)[]
  ? Fixed<Item>[]
  : T extends object
    ? { [Key in keyof T]-?: Fixed<Exclude<T[Key], undefined>> }
    : Exclude<T, undefined>

/**
 * A response field whose Go tag is `omitempty` is genuinely absent sometimes, and `Fixed`
 * would claim it is there. Opening it again is what keeps this module honest.
 */
type Omitted<T, Key extends keyof T> = Omit<T, Key> & { [Field in Key]?: T[Field] }

/**
 * Request bodies keep the schema's own optionality: on the way in, an absent field is an
 * instruction ("leave it alone"), never a missing value.
 */
export type AccountCreate = Schemas['accountCreateRequest']
export type AccountPatch = Schemas['accountPatchRequest']
export type EntryCreate = Schemas['postEntryRequest']
export type EntryPatch = Schemas['entryPatchRequest']
export type CaptureReview = Schemas['capturePatchRequest']
export type ImportReview = Schemas['importReviewRequest']
export type ImportRowPatch = Schemas['importRowPatchRequest']
export type PayeeCreate = Schemas['payeeCreateRequest']
export type PayeePatch = Schemas['payeePatchRequest']
export type TokenCreate = Schemas['tokenCreateRequest']

/** The journal's read side: `actor_ref` is absent for the worker's own runs. */
export type AuditRow = Omitted<Fixed<Schemas['auditResponse']>, 'actor_ref'>

/** One pair on one day, as the rate rail priced it. */
export type Rate = Fixed<Schemas['rateResponse']>

/** A list envelope: `next_cursor` is the one pagination field a full page still omits. */
export type Paged<Envelope, Key extends keyof Envelope, Row> = Omit<
  Fixed<Envelope>,
  Key | 'next_cursor'
> & { [Field in Key]: Row[] } & { next_cursor?: string }

export type Account = Omitted<Fixed<Schemas['accountResponse']>, 'icon' | 'parent_ref'>
export type AccountDetail = Omitted<Fixed<Schemas['accountDetailResponse']>, 'icon' | 'parent_ref'>
export type AccountSummary = Fixed<Schemas['accountSummary']>
export type Currency = Fixed<Schemas['currencyResponse']>

export type Posting = Fixed<Schemas['postingResponse']>
export type Entry = Omitted<
  Fixed<Schemas['entryResponse']>,
  'idempotency_key' | 'note' | 'payee' | 'reversed_at' | 'running_balance_minor'
>
export type PayeeSummary = Fixed<Schemas['payeeSummary']>

/** A running balance is a decimal minor-unit string, present only with `with_balance=true`. */
export type EntryBalance = NonNullable<Entry['running_balance_minor']>

export type Capture = Omitted<
  Fixed<Schemas['captureResponse']>,
  | 'draft_json'
  | 'extraction_model'
  | 'extraction_rail'
  | 'job_ref'
  | 'raw_text'
  | 'resolution_note'
  | 'resolved_at'
  | 'resolved_entry_ref'
  | 'suggested_category_ref'
>
/** An approval answers the capture and the entry it posted, both always present. */
export type CaptureApproval = {
  capture: Capture
  entry: Entry
}

export type Payee = Omitted<
  Fixed<Schemas['payeeResponse']>,
  'default_account_ref' | 'default_category_ref'
>
export type RecurringRule = Omitted<
  Fixed<Schemas['recurringResponse']>,
  'category_ref' | 'day_of_month' | 'ends_on'
>

export type Settings = Fixed<Schemas['settingsResponse']>
export type Dashboard = Omitted<Fixed<Schemas['dashboardResponse']>, 'top_category'> & {
  top_category?: Fixed<Schemas['topCategoryResponse']>
}
export type MonthTotal = Fixed<Schemas['monthTotalResponse']>
export type CategoryTotal = Fixed<Schemas['categoryTotalResponse']>
export type CategoryReport = Omitted<Fixed<Schemas['categoryAnalyticsResponse']>, 'categories'> & {
  categories: CategoryTotal[]
}
export type Bootstrap = Fixed<Schemas['bootstrapResponse']>
export type LedgerSetup = Schemas['setupRequest']
export type PasswordChange = Omitted<Fixed<Schemas['passwordChangeResponse']>, 'token'> & {
  token?: TokenIssued
}
export type Meta = Omit<Fixed<Schemas['metaResponse']>, 'accounts' | 'payees' | 'recurring'> & {
  accounts: Account[]
  payees: Payee[]
  recurring: RecurringRule[]
}

export type Token = Omitted<
  Fixed<Schemas['tokenResponse']>,
  'expires_at' | 'last_used_at' | 'revoked_at'
>
export type TokenIssued = Omitted<
  Fixed<Schemas['tokenIssuedResponse']>,
  'expires_at' | 'last_used_at' | 'revoked_at'
>

/** A batch without its rows: the list route never inlines them, so the detail adds them back. */
export type ImportBatch = Omitted<
  Fixed<Schemas['importBatchResponse']>,
  'committed_at' | 'rejected_at' | 'rows'
>
export type ImportRow = Omitted<
  Fixed<Schemas['importRowResponse']>,
  'category_ref' | 'clash_entry_ref' | 'clash_kind' | 'payee_ref' | 'suggested_category_ref'
>
export type ImportDetail = ImportBatch & { rows: ImportRow[] }
export type ImportEvent = Omitted<Fixed<Schemas['importEventResponse']>, 'payload' | 'row_index'>
export type ExportJob = Omitted<
  Fixed<Schemas['exportResponse']>,
  'counts' | 'error_message' | 'expires_at' | 'finished_at' | 'from' | 'started_at' | 'to'
>
