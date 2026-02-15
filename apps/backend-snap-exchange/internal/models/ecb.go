package models

import "encoding/xml"

// ECB XML Envelope structure
type ECBEnvelope struct {
	XMLName xml.Name     `xml:"Envelope"`
	Cube    ECBCubeOuter `xml:"Cube"`
}

type ECBCubeOuter struct {
	XMLName xml.Name    `xml:"Cube"`
	Cube    ECBCubeDate `xml:"Cube"`
}

type ECBCubeDate struct {
	XMLName xml.Name  `xml:"Cube"`
	Time    string    `xml:"time,attr"`
	Cubes   []ECBCube `xml:"Cube"`
}

type ECBCube struct {
	Currency string  `xml:"currency,attr"`
	Rate     float64 `xml:"rate,attr"`
}
