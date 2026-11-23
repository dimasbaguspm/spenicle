package main

import (
	"io"
	"net/http"
)

const (
	ratesPath       = "/stats/eurofxref/eurofxref-daily.xml"
	ratesDownPath   = "/stats/eurofxref/down.xml"
	ratesBrokenPath = "/stats/eurofxref/malformed.xml"

	truncatedSheet = `<?xml version="1.0" encoding="UTF-8"?><gesmes:Envelope
  xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"><Cube><Cube time="2026-11-20">`
)

const ratesSheet = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope
  xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
  xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender>
    <gesmes:name>European Central Bank</gesmes:name>
  </gesmes:Sender>
  <Cube>
    <Cube time="2026-11-20">
      <Cube currency="USD" rate="1.0990"/>
      <Cube currency="JPY" rate="174.35"/>
      <Cube currency="IDR" rate="16000.50"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

func registerECB(mux *http.ServeMux) {
	mux.HandleFunc("GET "+ratesPath, handleRates)
	mux.HandleFunc("GET "+ratesDownPath, handleDown)
	mux.HandleFunc("GET "+ratesBrokenPath, handleBrokenRates)
}

func handleRates(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", xmlType)
	_, _ = io.WriteString(w, ratesSheet)
}

func handleBrokenRates(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", xmlType)
	_, _ = io.WriteString(w, truncatedSheet)
}
