# Local dev server with caching disabled (ES modules otherwise go stale between reloads).
# python3 tools/serve.py [port] [directory]: serves the current directory unless another (a worktree) is given.
import functools, http.server, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
handler = functools.partial(NoCache, directory=sys.argv[2]) if len(sys.argv) > 2 else NoCache
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
