package ui

type UIs struct {
	Header Header
	Footer Footer
}

func NewUIs() UIs {
	return UIs{
		Header: NewHeader(),
		Footer: NewFooter(),
	}
}
