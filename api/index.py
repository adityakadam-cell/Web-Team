"""
Vercel serverless entrypoint.

Vercel runs the whole Flask app as a single Serverless Function. This shim adds
the backend/ folder to the import path and exposes the Flask `app` object, which
Vercel serves via the rewrite in vercel.json.

IMPORTANT — serverless limitations (work fine on Railway, NOT here):
  • Web — Audit starts a background thread and polls in-memory job state, which
    does not persist across serverless invocations.
  • Push to GitHub streams logs and runs `git` on a server folder; the Vercel
    filesystem is read-only/ephemeral with no git repo to push.
  • Optimizer calls Google PageSpeed (30–90s) and may exceed the function limit.
The landing page and tool UIs load; for full functionality use the Railway deploy.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import app  # noqa: E402  (exposed for Vercel's Python runtime)
