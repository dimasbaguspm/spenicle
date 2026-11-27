package constant

const (
	AuditEntitySetting            = "setting"
	AuditEntityAccount            = "account"
	AuditEntityPayee              = "payee"
	AuditEntityRecurring          = "recurring_rule"
	AuditEntityEntry              = "ledger_entry"
	AuditEntityCapture            = "capture"
	AuditEntityToken              = "api_token"
	AuditEntityCategorizationRule = "categorization_rule"
	AuditEntitySystem             = "system"
)

const (
	AuditActionCreate   = "create"
	AuditActionUpdate   = "update"
	AuditActionReverse  = "reverse"
	AuditActionApprove  = "approve"
	AuditActionReject   = "reject"
	AuditActionRetry    = "retry"
	AuditActionGenerate = "generate"
	AuditActionAdvance  = "advance"
	AuditActionRevoke   = "revoke"
	AuditActionStart    = "start"
)

const (
	AuditActorUser   = "user"
	AuditActorWorker = "worker"
	AuditActorSystem = "system"
)
