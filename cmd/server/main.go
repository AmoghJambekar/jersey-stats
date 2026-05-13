// Command server is the Go HTTP API. Target: serve Postgres only; ingest
// NBA.com data on a schedule via scripts/test_stats (batch), not per request.
package main

import "fmt"

func main() {
	fmt.Println("Hi")
}
