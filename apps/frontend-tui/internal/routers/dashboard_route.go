package routers

type DashboardRoute struct{}

func NewDashboardRoute() DashboardRoute {
	return DashboardRoute{}
}

func (dr DashboardRoute) Render() string {
	return "Welcome to the Dashboard!"
}
