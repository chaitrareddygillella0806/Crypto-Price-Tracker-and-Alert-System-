#!/usr/bin/env python3
"""
Lightweight local HTTP development server for Crypto & Stock Price and Alert Tracker.
Serves static files and automatically opens the user's default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for live development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    
    port = PORT
    while port < 8090:
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                url = f"http://localhost:{port}"
                print(f"=======================================================")
                print(f"🚀 Crypto & Stock Price and Alert Tracker is live at:")
                print(f"👉 {url}")
                print(f"Press Ctrl+C to stop the server.")
                print(f"=======================================================")
                webbrowser.open(url)
                httpd.serve_forever()
        except OSError as e:
            if "Address already in use" in str(e) or e.errno == 10048 or e.errno == 98:
                port += 1
            else:
                raise e

if __name__ == "__main__":
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
