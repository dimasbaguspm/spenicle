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
)

const (
	AuditActionCreate   = "create"
	AuditActionUpdate   = "update"
	AuditActionVoid     = "void"
	AuditActionApprove  = "approve"
	AuditActionReject   = "reject"
	AuditActionRetry    = "retry"
	AuditActionGenerate = "generate"
	AuditActionAdvance  = "advance"
	AuditActionRevoke   = "revoke"
)

const (
	AuditActorUser   = "user"
	AuditActorWorker = "worker"
	AuditActorSystem = "system"
)
