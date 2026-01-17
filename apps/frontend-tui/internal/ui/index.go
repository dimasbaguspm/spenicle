package ui

type UIs struct {
	Header  Header
	Footer  Footer
	Sidebar Sidebar
	Layout  *Layout
}

func NewUIs() UIs {
	return UIs{
		Header:  NewHeader(),
		Footer:  NewFooter(),
		Sidebar: NewSidebar(nil),
		Layout:  NewLayout(),
	}
}
