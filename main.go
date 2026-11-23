// Command spenicle is the whole product: one binary, one container, two
// supervised processes.
//
// "spenicle http" serves the API, "spenicle worker" posts the due recurring
// rules, and the hidden "spenicle all" runs both in one process for local
// development. The commands themselves live in cmd/.
package main

import (
	"os"

	"github.com/dimasbaguspm/spenicle/cmd"
)

func main() {
	os.Exit(cmd.Execute())
}
