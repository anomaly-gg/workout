# Hidden local server for the workout app (pythonw = no console window).
# pythonw sets sys.stdout/stderr to None; http.server logs every request to stderr, so redirect first.
import os, sys
sys.stdout = sys.stderr = open(os.devnull, "w")
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
try:
    ThreadingHTTPServer(("127.0.0.1", 8753), SimpleHTTPRequestHandler).serve_forever()
except OSError:
    pass  # port already in use = a server is already running; nothing to do
