package routers

type TransactionRoute struct{}

func NewTransactionRoute() TransactionRoute {
	return TransactionRoute{}
}

func (tr TransactionRoute) Render() string {
	return "This is the Transaction Page."
}
