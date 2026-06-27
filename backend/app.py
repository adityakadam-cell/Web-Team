"""
web-team — Flask backend
Serves API routes for all 4 tools + the React frontend build.
Run: python app.py  |  gunicorn app:app
"""
import json
import logging
import os
import secrets
import subprocess
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, Response, stream_with_context, send_from_directory, send_file
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=os.getenv("LOG_LEVEL","INFO"),
                    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("web-team")

# React build lives at ../frontend/dist (built by build.sh before gunicorn starts)
BASE_DIR   = Path(__file__).resolve().parent
REACT_DIST = BASE_DIR.parent / "frontend" / "dist"

app = Flask(__name__, static_folder=str(REACT_DIST), static_url_path="")
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))
CORS(app, resources={r"/api/*": {"origins": "*"}})

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# In-memory job store (single worker)
# ──────────────────────────────────────────────────────────────────────────────
JOBS: dict = {}


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "tools": ["audit","optimize","clone","github"]})


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT WIZARD
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/audit/start", methods=["POST"])
def audit_start():
    data = request.get_json(force=True)
    url  = data.get("url","").strip()
    if not url:
        return jsonify({"error":"URL is required"}), 400

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "status": "running",
        "phase":  "Crawling pages…",
        "current": 0,
        "total":   data.get("max_pages", 30),
    }

    def _run():
        try:
            # Import the audit engine from the existing audit-wizard project
            # Fallback: use a simplified built-in crawler if not available
            try:
                import sys
                audit_path = Path(__file__).parent.parent / "Audit wizard" / "trial" / "audit" / "audit-wizard"
                sys.path.insert(0, str(audit_path))
                from audit_engine import Crawler, Analyzer, ReportGen

                crawler  = Crawler(url, max_pages=data.get("max_pages",30), deep=data.get("deep",False))
                pages_data = []
                for i, page in enumerate(crawler.crawl()):
                    pages_data.append(page)
                    JOBS[job_id].update({"phase":"Crawling…","current":i+1})

                JOBS[job_id]["phase"] = "Analysing pages…"
                analyzer = Analyzer(industry=data.get("industry","general"), keyword=data.get("keyword",""))
                results  = analyzer.analyze_all(pages_data)

                JOBS[job_id]["phase"] = "Generating report…"
                rg = ReportGen(results)
                html_path = OUTPUT_DIR / f"audit_{job_id}.html"
                rg.to_html(html_path)

                overall = int(sum(r.get("score",0) for r in results) / max(len(results),1))
                JOBS[job_id].update({
                    "status": "done",
                    "results": {
                        "overallScore": overall,
                        "totalPages":   len(results),
                        "passCount":    sum(1 for r in results if r.get("score",0)>=70),
                        "failCount":    sum(1 for r in results if r.get("score",0)<50),
                        "infoCount":    sum(1 for r in results if 50<=r.get("score",0)<70),
                        "categories":   [],
                        "htmlReport":   f"/api/audit/report/{job_id}",
                    }
                })

            except ImportError:
                # Simplified fallback using requests + bs4
                _simple_audit(job_id, url, data)

        except Exception as e:
            log.exception("audit failed")
            JOBS[job_id].update({"status":"error","error":str(e)})

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"job_id": job_id})


def _simple_audit(job_id:str, url:str, data:dict):
    """Minimal built-in audit when audit_engine is not importable."""
    try:
        import requests
        from bs4 import BeautifulSoup
        max_pages = min(data.get("max_pages",30), 5)  # cap for simple mode
        visited, queue = set(), [url]
        pages_data = []

        while queue and len(visited) < max_pages:
            cur = queue.pop(0)
            if cur in visited: continue
            visited.add(cur)
            JOBS[job_id].update({"phase":"Crawling…","current":len(visited)})
            try:
                r = requests.get(cur, timeout=10, headers={"User-Agent":"Mozilla/5.0"})
                soup = BeautifulSoup(r.text, "html.parser")
                title = soup.title.string.strip() if soup.title else ""
                h1s   = [h.get_text().strip() for h in soup.find_all("h1")]
                meta_desc = ""
                m = soup.find("meta",{"name":"description"})
                if m: meta_desc = m.get("content","")

                score = 50
                if title:    score += 10
                if h1s:      score += 10
                if meta_desc: score += 10
                if soup.find("link",{"rel":"canonical"}): score += 10
                if len(r.text) > 1000: score += 10

                pages_data.append({"url":cur,"title":title,"score":score})

                # collect links
                for a in soup.find_all("a",href=True):
                    href = a["href"]
                    if href.startswith("/") and url:
                        from urllib.parse import urljoin
                        href = urljoin(url, href)
                    if href.startswith(url) and href not in visited:
                        queue.append(href)
            except Exception:
                pass

        overall = int(sum(p["score"] for p in pages_data)/max(len(pages_data),1))
        JOBS[job_id].update({
            "status": "done",
            "results": {
                "overallScore": overall,
                "totalPages":   len(pages_data),
                "passCount":    sum(1 for p in pages_data if p["score"]>=70),
                "failCount":    sum(1 for p in pages_data if p["score"]<50),
                "infoCount":    sum(1 for p in pages_data if 50<=p["score"]<70),
                "categories":   [],
                "htmlReport":   None,
            }
        })
    except Exception as e:
        JOBS[job_id].update({"status":"error","error":str(e)})


@app.route("/api/audit/status/<job_id>")
def audit_status(job_id):
    job = JOBS.get(job_id)
    if not job: return jsonify({"error":"not found"}), 404
    return jsonify(job)


@app.route("/api/audit/report/<job_id>")
def audit_report(job_id):
    from flask import send_file
    path = OUTPUT_DIR / f"audit_{job_id}.html"
    if not path.exists(): return "Not found", 404
    return send_file(path, as_attachment=True, download_name="audit-report.html")


# ══════════════════════════════════════════════════════════════════════════════
# PAGE OPTIMIZER
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/optimize", methods=["POST"])
def optimize():
    data = request.get_json(force=True)
    url  = data.get("url","").strip()
    html = data.get("html","").strip()
    email_to = data.get("email","").strip()

    if not url or not html:
        return jsonify({"error":"url and html are required"}), 400

    try:
        # Try to use existing optimizer module
        opt_path = Path(__file__).parent.parent / "optimizer-app" / "optimizer-wizard-main"
        import sys
        sys.path.insert(0, str(opt_path))
        try:
            from optimizer   import HTMLOptimizer
            from pagespeed   import PageSpeedClient

            optimizer = HTMLOptimizer(html)
            optimized = optimizer.optimize()
            auto_count = optimizer.fix_count

            ps = PageSpeedClient(api_key=os.getenv("PAGESPEED_API_KEY",""))
            mobile_score  = ps.score(url, strategy="mobile")
            desktop_score = ps.score(url, strategy="desktop")
            manual_fixes  = optimizer.manual_fixes()
        except ImportError:
            # Fallback: basic HTML fixes without PageSpeed
            optimized, auto_count, mobile_score, desktop_score, manual_fixes = _basic_optimize(html)

        result = {
            "scores":       {"mobile": mobile_score, "desktop": desktop_score},
            "autoFixCount": auto_count,
            "fixes":        [{"title":f["title"],"what":f.get("what",""),"why":f.get("why",""),"how":f.get("how","")} for f in manual_fixes[:8]],
            "optimizedHtml": optimized,
        }

        # Email if requested
        if email_to:
            try:
                _send_optimizer_email(email_to, result, url)
            except Exception as e:
                log.warning("email failed: %s", e)

        return jsonify(result)

    except Exception as e:
        log.exception("optimize failed")
        return jsonify({"error": str(e)}), 500


def _basic_optimize(html:str):
    """Minimal HTML optimiser when optimizer module not available."""
    import re
    out = html
    count = 0

    # Add loading=lazy to non-hero images
    def lazy_img(m):
        nonlocal count
        if "fetchpriority" not in m.group(0) and "loading=" not in m.group(0):
            count += 1
            return m.group(0).replace("<img", '<img loading="lazy"', 1)
        return m.group(0)
    out = re.sub(r"<img\b[^>]*>", lazy_img, out)

    # Defer non-essential scripts
    def defer_script(m):
        nonlocal count
        tag = m.group(0)
        if "defer" not in tag and "async" not in tag and "src=" in tag:
            count += 1
            return tag.replace("<script", '<script defer', 1)
        return tag
    out = re.sub(r"<script\b[^>]*src=[^>]+>", defer_script, out)

    fixes = [
        {"title":"Enable gzip/brotli","what":"Compress server responses","why":"Reduces transfer size by ~70%","how":"Enable in nginx: gzip on; gzip_types text/html text/css application/javascript;"},
        {"title":"Set cache headers","what":"Cache static assets for 1 year","why":"Eliminates repeat downloads","how":"Cache-Control: public, max-age=31536000, immutable for CSS/JS/images"},
        {"title":"Add a CDN","what":"Serve assets from edge nodes","why":"Reduces TTFB globally","how":"Cloudflare free tier: change nameservers, enable proxy mode on DNS records"},
        {"title":"Minify CSS & JS","what":"Remove whitespace/comments","why":"Reduces file size ~30%","how":"Use Vite, Webpack, or Parcel in production build"},
    ]
    return out, count, 0, 0, fixes


def _send_optimizer_email(to:str, result:dict, url:str):
    import smtplib
    from email.mime.text import MIMEText
    gmail_user = os.getenv("GMAIL_USER","")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD","")
    if not gmail_user or not gmail_pass: return
    body = f"PageSpeed scores for {url}\nMobile: {result['scores']['mobile']}  Desktop: {result['scores']['desktop']}\nAuto-fixes applied: {result['autoFixCount']}"
    msg = MIMEText(body)
    msg["Subject"] = f"Optimizer Report — {url}"
    msg["From"] = gmail_user
    msg["To"]   = to
    with smtplib.SMTP_SSL("smtp.gmail.com",465) as s:
        s.login(gmail_user, gmail_pass.replace(" ",""))
        s.sendmail(gmail_user, [to], msg.as_string())


# ══════════════════════════════════════════════════════════════════════════════
# PAGE CLONER
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/clone/build", methods=["POST"])
def clone_build():
    url  = request.form.get("url","").strip()
    html = request.form.get("html","").strip()
    mode = request.form.get("mode","files")

    if not url or not html:
        return jsonify({"error":"url and html required"}), 400

    try:
        agent_path = Path(__file__).parent.parent / "api-agent"
        import sys
        sys.path.insert(0, str(agent_path))

        from core.utils import parse_file
        from agents.agent2_design_capture import run as cap_design
        from agents.agent3_content_intake import run_files, run_sheet
        from agents.agent4_analysis       import run as analyse
        from agents.agent5_recheck_sync   import run as sync
        from agents.agent6_output         import build as build_output
        from agents.agent7_preview_approve import approve, preview

        state = {}
        from agents.agent1_url_input import run as url_run
        state["agent1"] = url_run(url)["data"]
        state["agent2"] = cap_design(html=html, base_url=url)["data"]

        if mode=="sheet":
            sheet_url = request.form.get("sheet_url","")
            state["agent3"] = run_sheet(sheet_url)["data"]
        else:
            files = request.files.getlist("files")
            state["agent3"] = run_files(files)["data"]

        state["agent4"] = analyse(state)["data"]
        state["agent5"] = sync(state)["data"]
        prev = preview(state)["data"]
        ids  = [it["id"] for it in prev.get("items",[])]
        state["agent7"] = approve(state, ids)["data"]
        built = build_output(state)["data"]["built"]

        return jsonify({"pages": [{"id":p["id"],"filename":p["filename"],"title":p.get("title","Page")} for p in built]})

    except ImportError:
        # Stub response when agent pipeline not importable
        return jsonify({"pages": [
            {"id":"demo1","filename":"page-1.html","title":"Demo Page 1 (connect api-agent for real output)"},
        ]})
    except Exception as e:
        log.exception("clone build failed")
        return jsonify({"error":str(e)}), 500


@app.route("/api/clone/download/<filename>")
def clone_download(filename):
    from flask import send_from_directory
    output_base = Path(__file__).parent.parent / "api-agent" / "output"
    return send_from_directory(output_base, filename, as_attachment=True)


@app.route("/api/clone/zip", methods=["POST"])
def clone_zip():
    import zipfile, io
    data = request.get_json(force=True)
    filenames = data.get("filenames",[])
    output_base = Path(__file__).parent.parent / "api-agent" / "output"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf,"w",zipfile.ZIP_DEFLATED) as zf:
        for fn in filenames:
            p = output_base / fn
            if p.exists(): zf.write(p, fn)
    buf.seek(0)
    from flask import send_file
    return send_file(buf, mimetype="application/zip", as_attachment=True, download_name="cloned-pages.zip")


# ══════════════════════════════════════════════════════════════════════════════
# GITHUB PUSH (streaming)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/github/push", methods=["POST"])
def github_push():
    data        = request.get_json(force=True)
    username    = data.get("username","").strip()
    token       = data.get("token","").strip()
    folder_path = data.get("folder_path","").strip()
    repo_url    = data.get("repo_url","").strip()
    branch      = data.get("branch","main").strip() or "main"
    message     = data.get("message","").strip() or f"Update {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    if not all([username, token, folder_path, repo_url]):
        return jsonify({"error":"username, token, folder_path, repo_url are required"}), 400

    # Normalise repo URL to include credentials
    clean_url = repo_url.rstrip("/")
    if not clean_url.endswith(".git"): clean_url += ".git"
    if clean_url.startswith("https://"):
        auth_url = f"https://{username}:{token}@{clean_url[len('https://'):]}"
    else:
        auth_url = clean_url

    folder = Path(folder_path)
    if not folder.exists():
        return jsonify({"error":f"Folder not found: {folder_path}"}), 400

    def _stream():
        def emit(type_:str, text:str):
            yield json.dumps({"type":type_, "text":text}) + "\n"

        yield from emit("info", f"📁 Folder: {folder_path}")
        yield from emit("info", f"🔗 Repo:   {repo_url}")
        yield from emit("info", f"🌿 Branch: {branch}")

        def run(cmd, **kw):
            return subprocess.run(cmd, cwd=str(folder), capture_output=True, text=True, **kw)

        # git init
        if not (folder/".git").exists():
            yield from emit("cmd", "git init")
            r = run(["git","init"])
            yield from emit("info" if r.returncode==0 else "error", r.stdout.strip() or r.stderr.strip())
            run(["git","branch","-M", branch])

        # config
        run(["git","config","user.name", username])
        run(["git","config","user.email", f"{username}@users.noreply.github.com"])

        # remote
        yield from emit("cmd", "git remote set-url origin <repo>")
        existing = run(["git","remote","get-url","origin"])
        if existing.returncode==0:
            run(["git","remote","set-url","origin", auth_url])
        else:
            run(["git","remote","add","origin", auth_url])

        # stage
        yield from emit("cmd", "git add -A")
        r = run(["git","add","-A"])
        yield from emit("info", "All files staged")

        # commit
        yield from emit("cmd", f'git commit -m "{message}"')
        r = run(["git","commit","-m", message])
        out = r.stdout.strip()
        if r.returncode != 0 and "nothing to commit" in (r.stdout+r.stderr).lower():
            yield from emit("info", "Nothing new to commit — will still push")
        elif r.returncode != 0:
            yield from emit("error", r.stderr.strip())
        else:
            yield from emit("success", out.split("\n")[0] if out else "Committed")

        # push
        yield from emit("cmd", f"git push -u origin {branch}")
        r = run(["git","push","-u","origin", branch])
        if r.returncode == 0:
            yield from emit("success", "✅ Pushed successfully!")
        else:
            yield from emit("info", "Normal push rejected — trying force-with-lease…")
            run(["git","fetch","origin"])
            r2 = run(["git","push","-u","origin", branch,"--force-with-lease"])
            if r2.returncode == 0:
                yield from emit("success", "✅ Pushed (force-with-lease)")
            else:
                r3 = run(["git","push","-u","origin", branch,"--force"])
                if r3.returncode == 0:
                    yield from emit("success", "✅ Pushed (force)")
                else:
                    yield from emit("error", r3.stderr.strip() or "Push failed")

    return Response(stream_with_context(_stream()), mimetype="application/x-ndjson")


# ══════════════════════════════════════════════════════════════════════════════
# React catch-all — serve index.html for any non-API route (React Router)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    # If the file exists in dist (CSS, JS, images etc.) serve it directly
    if path and (REACT_DIST / path).exists():
        return send_from_directory(str(REACT_DIST), path)
    # Otherwise hand over to React Router
    index = REACT_DIST / "index.html"
    if index.exists():
        return send_file(str(index))
    return jsonify({"error": "React build not found. Run build.sh first."}), 404


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    log.info("web-team backend → http://localhost:%d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
