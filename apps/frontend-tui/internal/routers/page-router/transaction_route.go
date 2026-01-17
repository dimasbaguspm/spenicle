package pagerouter

type TransactionPageRoute struct{}

func NewTransactionPageRoute() TransactionPageRoute {
	return TransactionPageRoute{}
}

func (tr TransactionPageRoute) Render() string {
	return "This is the Transaction Page."
}
