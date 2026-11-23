"""Contract-faithful stand-in for the SnapToJSON partner route.

Used by the UAT testcontainers scenario: the adapter is pointed at this container and
must speak exactly what https://snaptojson.com/docs/api documents.

    POST /partner/v1/snaps
    Authorization: Bearer <key>
    multipart: file=<bytes>   -> 202 SnapReport (EXECUTING)
    multipart: snap_id=<id>   -> 200 SnapReport (COMPLETED, result)
    anything else             -> ErrorEnvelope
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json

RESULT = {
    "job_ref": "snap_container_1",
    "status": "COMPLETED",
    "result": {
        "data": {"total": "25000", "merchant": "KOPI KENANGAN"},
        "valid": True,
        "violations": [],
    },
    "error_message": "",
}


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/healthz":
            self._send(200, {"status": "ok"})
            return
        self._send(404, {"error": {"code": "snap_not_found", "message": "no route"}})

    def do_POST(self):
        if self.path != "/partner/v1/snaps":
            self._send(404, {"error": {"code": "snap_not_found", "message": self.path}})
            return

        if not self.headers.get("Authorization", "").startswith("Bearer "):
            self._send(401, {"error": {"code": "missing_api_key", "message": "no key"}})
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)

        if b'name="snap_id"' in body:
            self._send(200, RESULT)
            return

        if b'name="file"' in body:
            self._send(202, {"job_ref": "snap_container_1", "status": "EXECUTING"})
            return

        self._send(400, {"error": {"code": "invalid_body", "message": "file or snap_id"}})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
