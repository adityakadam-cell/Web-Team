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

from flask import Flask, jsonify, request, Response, stream_with_context, send_from_directory, send_file, render_template
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=os.getenv("LOG_LEVEL","INFO"),
                    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("web-team")

# All-Python app: Flask serves the Jinja pages (templates/) + assets (static/).
BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Output dir for generated reports/zips. On read-only hosts (e.g. Vercel
# serverless) the local folder can't be created, so fall back to /tmp.
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", str(Path(__file__).parent / "output")))
try:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    OUTPUT_DIR = Path("/tmp/web-team-output")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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
# PAGES (server-rendered Jinja templates)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/")
def home():
    return render_template("home.html", active="home")

@app.route("/clone")
def clone_page():
    return render_template("clone.html", active="clone")

@app.route("/audit")
def audit_page():
    return render_template("audit.html", active="audit")

@app.route("/optimizer")
def optimizer_page():
    return render_template("optimizer.html", active="optimizer")

@app.route("/wp-report")
def wp_report_page():
    return render_template("wp-report.html", active="wp")


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


# ── Synchronous audit (serverless-friendly: one request, no background jobs) ──
@app.route("/api/audit/run", methods=["POST"])
def audit_run():
    data = request.get_json(force=True)
    url  = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400
    try:
        return jsonify(_run_audit_sync(url, data))
    except Exception as e:
        log.exception("audit run failed")
        return jsonify({"error": str(e)}), 500


@app.route("/api/audit/scan")
def audit_scan():
    """GET util — run the synchronous audit and return the report HTML directly."""
    url = (request.args.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url query param required"}), 400
    try:
        data = _run_audit_sync(url, {
            "max_pages": int(request.args.get("max_pages", 8) or 8),
            "keyword": request.args.get("keyword", ""),
        })
    except Exception as e:
        log.exception("audit scan failed")
        return jsonify({"error": str(e)}), 500
    return Response(data.get("reportHtml") or "<p>No pages crawled.</p>", mimetype="text/html")


def _check_page(soup, resp, keyword: str):
    """Run an on-page SEO checklist for one page. Returns (score, checks)."""
    checks = []
    def add(name, ok, info=""):
        checks.append({"name": name, "ok": bool(ok), "info": info})

    title = (soup.title.string or "").strip() if soup.title else ""
    add("Title tag present", bool(title), title[:80])
    add("Title length 30–60", 30 <= len(title) <= 60, f"{len(title)} chars")

    m = soup.find("meta", attrs={"name": "description"})
    desc = (m.get("content", "").strip() if m else "")
    add("Meta description present", bool(desc), desc[:80])
    add("Meta description 70–160", 70 <= len(desc) <= 160, f"{len(desc)} chars")

    h1s = soup.find_all("h1")
    add("Exactly one H1", len(h1s) == 1, f"{len(h1s)} found")

    add("Canonical link", bool(soup.find("link", attrs={"rel": "canonical"})))
    add("Viewport meta", bool(soup.find("meta", attrs={"name": "viewport"})))
    add("HTTPS", resp.url.startswith("https://"))
    add("Open Graph title", bool(soup.find("meta", property="og:title")))
    add("Open Graph image", bool(soup.find("meta", property="og:image")))

    imgs = soup.find_all("img")
    with_alt = [i for i in imgs if i.get("alt", "").strip()]
    add("Images have alt text", (not imgs) or len(with_alt) / len(imgs) >= 0.8,
        f"{len(with_alt)}/{len(imgs)} with alt")

    words = len(soup.get_text(" ", strip=True).split())
    add("Word count > 300", words > 300, f"{words} words")

    if keyword:
        add("Keyword in title", keyword.lower() in title.lower(), keyword)

    passed = sum(1 for c in checks if c["ok"])
    score = int(round(passed / max(len(checks), 1) * 100))
    return score, checks


def _run_audit_sync(url: str, data: dict):
    import requests
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin, urlparse

    if not url.startswith("http"):
        url = "https://" + url
    keyword   = (data.get("keyword") or "").strip()
    max_pages = min(int(data.get("max_pages", 10) or 10), 12)  # cap for serverless time budget
    root      = urlparse(url).netloc

    visited, queue, pages = set(), [url], []
    headers = {"User-Agent": "Mozilla/5.0 (web-team audit)"}

    while queue and len(visited) < max_pages:
        cur = queue.pop(0)
        if cur in visited:
            continue
        visited.add(cur)
        try:
            r = requests.get(cur, timeout=12, headers=headers)
            soup = BeautifulSoup(r.text, "html.parser")
            score, checks = _check_page(soup, r, keyword)
            title = (soup.title.string or "").strip() if soup.title else cur
            pages.append({"url": cur, "title": title, "score": score, "checks": checks})
            for a in soup.find_all("a", href=True):
                nxt = urljoin(cur, a["href"]).split("#")[0]
                if urlparse(nxt).netloc == root and nxt not in visited and nxt not in queue:
                    queue.append(nxt)
        except Exception:
            continue

    if not pages:
        return {"overallScore": 0, "totalPages": 0, "passCount": 0, "failCount": 0,
                "infoCount": 0, "categories": [], "reportHtml": ""}

    overall = int(round(sum(p["score"] for p in pages) / len(pages)))
    # Aggregate per-check pass rates into "categories"
    agg = {}
    for p in pages:
        for c in p["checks"]:
            agg.setdefault(c["name"], [0, 0])
            agg[c["name"]][1] += 1
            if c["ok"]:
                agg[c["name"]][0] += 1
    categories = [{"name": k, "score": int(round(v[0] / v[1] * 100))} for k, v in agg.items()]

    ai_fixes = _gemini_audit_analysis(url, pages)
    return {
        "overallScore": overall,
        "totalPages":   len(pages),
        "passCount":    sum(1 for p in pages if p["score"] >= 70),
        "failCount":    sum(1 for p in pages if p["score"] < 50),
        "infoCount":    sum(1 for p in pages if 50 <= p["score"] < 70),
        "categories":   categories,
        "aiFixes":      ai_fixes,
        "reportHtml":   _audit_report_html(url, overall, pages, categories, ai_fixes),
    }


def _audit_report_html(url, overall, pages, categories, ai_fixes=None):
    """Standalone HTML report string (downloaded client-side as a Blob).
    Built with plain concatenation/.format to stay Python 3.9+ safe."""
    def color(s):
        return "#10b981" if s >= 70 else ("#f59e0b" if s >= 50 else "#ef4444")

    def esc(s):
        return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

    ai_html = ""
    if ai_fixes:
        cards = ""
        for f in ai_fixes:
            cards += (
                "<div style='margin:10px 0;padding:14px;border:1px solid #2a2f45;border-radius:10px;background:#0e1018'>"
                "<b style='color:#a5b4fc'>" + esc(f.get("title", "")) + "</b>"
                "<p style='margin:6px 0 0;color:#cbd5e1;font-size:13px'><b>What:</b> " + esc(f.get("what", "")) + "</p>"
                "<p style='margin:4px 0 0;color:#9aa3b8;font-size:13px'><b>Why:</b> " + esc(f.get("why", "")) + "</p>"
                "<p style='margin:4px 0 0;color:#9aa3b8;font-size:13px'><b>How:</b> " + esc(f.get("how", "")) + "</p></div>")
        ai_html = ("<h2 style='font-size:18px;margin-top:28px'>AI Recommendations "
                   "<span style='font-size:13px;color:#666'>(Gemini)</span></h2>" + cards)

    rows = []
    for p in pages:
        items = []
        for c in p["checks"]:
            c_color = "#10b981" if c["ok"] else "#ef4444"
            mark = "&#10003;" if c["ok"] else "&#10007;"
            info = ""
            if c.get("info"):
                info = " &mdash; <span style='color:#888'>{}</span>".format(c["info"])
            items.append("<li style='color:{}'>{} {}{}</li>".format(c_color, mark, c["name"], info))
        rows.append(
            "<div style='margin:18px 0;padding:16px;border:1px solid #222;border-radius:10px;background:#0d0d12'>"
            "<div style='display:flex;justify-content:space-between;align-items:center'>"
            "<a href='{url}' style='color:#a5b4fc;word-break:break-all'>{title}</a>"
            "<b style='color:{col};font-size:22px'>{score}</b></div>"
            "<ul style='margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.7'>{items}</ul></div>".format(
                url=p["url"], title=(p["title"] or p["url"]), col=color(p["score"]),
                score=p["score"], items="".join(items)))

    cats = "".join(
        "<tr><td style='padding:4px 12px'>{name}</td>"
        "<td style='padding:4px 12px;color:{col};text-align:right'>{score}%</td></tr>".format(
            name=c["name"], col=color(c["score"]), score=c["score"])
        for c in categories)

    css = ("<style>body{background:#050505;color:#e2e8f0;font-family:system-ui,sans-serif;"
           "max-width:900px;margin:0 auto;padding:40px 24px}h1{font-size:28px}"
           "table{border-collapse:collapse;width:100%;margin:16px 0}"
           "td{border-bottom:1px solid #1a1a22}</style>")
    # Built by concatenation (NOT .format) so the literal CSS braces are safe.
    return (
        "<!doctype html><html><head><meta charset='utf-8'><title>SEO Audit Report</title>"
        + css + "</head><body>"
        + "<h1>SEO Audit Report</h1><p style='color:#888'>" + str(url) + "</p>"
        + "<div style='font-size:64px;font-weight:800;color:" + color(overall) + "'>"
        + str(overall) + "<span style='font-size:22px;color:#666'>/100</span></div>"
        + "<p>" + str(len(pages)) + " pages analysed.</p>"
        + ai_html
        + "<h2 style='font-size:18px;margin-top:28px'>Checklist pass rates</h2><table>" + cats + "</table>"
        + "<h2 style='font-size:18px;margin-top:28px'>Per-page results</h2>" + "".join(rows)
        + "</body></html>")


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

    scores_estimated = False
    score_note = ""
    ai_suggestions = False
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
            # Standalone path (Vercel/Railway): basic HTML fixes + REAL PageSpeed scores
            optimized, auto_count, manual_fixes = _basic_optimize(html)
            mobile_score  = _pagespeed_score(url, "mobile")
            desktop_score = _pagespeed_score(url, "desktop")
            # Gemini-powered page-specific suggestions (replaces the generic checklist when available)
            ai_fixes = _gemini_optimize_suggestions(url, html)
            if ai_fixes:
                manual_fixes = ai_fixes
                ai_suggestions = True
            if not mobile_score and not desktop_score:
                # PageSpeed unavailable (API not enabled / quota) -> estimate from HTML
                est = _estimate_perf_score(html)
                mobile_score, desktop_score = est, min(100, est + 8)
                scores_estimated = True
                score_note = ("Estimated from page HTML - enable the PageSpeed Insights API "
                              "on your Google key for live Lighthouse scores.")

        result = {
            "scores":         {"mobile": mobile_score, "desktop": desktop_score},
            "scoresEstimated": scores_estimated,
            "scoreNote":      score_note,
            "aiSuggestions":  ai_suggestions,
            "autoFixCount":   auto_count,
            "fixes":          [{"title":f["title"],"what":f.get("what",""),"why":f.get("why",""),"how":f.get("how","")} for f in manual_fixes[:8]],
            "optimizedHtml":  optimized,
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
    return out, count, fixes


def _pagespeed_score(url: str, strategy: str = "mobile") -> int:
    """Real Google PageSpeed Insights performance score (0-100).
    Tries the configured key first; if it is rejected, falls back to a
    keyless call (works, just rate-limited)."""
    import requests
    base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    key = (os.getenv("PAGESPEED_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()

    attempts = []
    if key:
        attempts.append({"url": url, "strategy": strategy, "category": "performance", "key": key})
    attempts.append({"url": url, "strategy": strategy, "category": "performance"})  # keyless fallback

    for params in attempts:
        try:
            r = requests.get(base, params=params, timeout=55)
            data = r.json()
            if "lighthouseResult" in data:
                score = data["lighthouseResult"]["categories"]["performance"]["score"]
                return int(round(score * 100))
            err = (data.get("error") or {}).get("message", "no lighthouseResult in response")
            log.warning("pagespeed %s (keyed=%s): %s", strategy, "key" in params, err)
        except Exception as e:
            log.warning("pagespeed %s exception: %s", strategy, e)
    return 0


@app.route("/api/pagespeed")
def pagespeed_check():
    """Lightweight GET — real Google PageSpeed performance score for a URL.
    Example: /api/pagespeed?url=example.com&strategy=mobile"""
    url = (request.args.get("url") or "").strip()
    strategy = (request.args.get("strategy") or "mobile").strip()
    if not url:
        return jsonify({"error": "url query param required"}), 400
    if not url.startswith("http"):
        url = "https://" + url
    return jsonify({"url": url, "strategy": strategy, "score": _pagespeed_score(url, strategy)})


@app.route("/api/optimize/suggest")
def optimize_suggest():
    """GET util — fetch a URL and return Gemini-powered optimization suggestions."""
    url = (request.args.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url query param required"}), 400
    if not url.startswith("http"):
        url = "https://" + url
    try:
        import requests
        html = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"}).text
    except Exception as e:
        return jsonify({"error": "could not fetch page: %s" % e}), 400
    return jsonify({"url": url, "suggestions": _gemini_optimize_suggestions(url, html)})


def _estimate_perf_score(html: str) -> int:
    """Rough performance-hygiene score (0-100) from the HTML, used when the live
    PageSpeed API is unavailable so the tool still returns a meaningful number."""
    import re
    score = 100
    scripts = re.findall(r"<script\b[^>]*>", html, re.I)
    blocking = [s for s in scripts if "src=" in s.lower() and "defer" not in s.lower() and "async" not in s.lower()]
    score -= min(len(blocking) * 5, 35)                      # render-blocking scripts
    imgs = re.findall(r"<img\b[^>]*>", html, re.I)
    no_lazy = [i for i in imgs if "loading=" not in i.lower()]
    score -= min(len(no_lazy) * 2, 25)                       # non-lazy images
    if not re.search(r'name=["\']viewport', html, re.I):
        score -= 10
    inline_css = sum(len(x) for x in re.findall(r"<style[^>]*>(.*?)</style>", html, re.I | re.S))
    if inline_css > 30000:
        score -= 8
    if len(html) > 250000:
        score -= 8                                           # heavy DOM
    return max(0, min(100, score))


def _gemini_json_items(prompt: str):
    """Send a prompt to Gemini and parse a JSON array of {title,what,why,how}."""
    raw = _gemini_generate(prompt)
    if not raw:
        return []
    import json, re
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = re.sub(r"^json\s*", "", raw, flags=re.I).strip()
    m = re.search(r"\[.*\]", raw, re.S)
    if m:
        raw = m.group(0)
    try:
        items = json.loads(raw)
        out = []
        for it in items[:8]:
            if isinstance(it, dict) and it.get("title"):
                out.append({
                    "title": str(it.get("title", ""))[:140],
                    "what":  str(it.get("what", "")),
                    "why":   str(it.get("why", "")),
                    "how":   str(it.get("how", "")),
                })
        return out
    except Exception as e:
        log.warning("gemini json parse failed: %s", e)
        return []


def _gemini_optimize_suggestions(url: str, html: str):
    """Gemini page-specific performance/SEO suggestions for the Optimizer."""
    prompt = (
        "You are a senior web performance and SEO engineer. Analyse the HTML of the page below "
        "and produce the most impactful, SPECIFIC optimisation suggestions for THIS page. "
        "Reference concrete things you actually see (script/library names, image patterns, meta "
        "tags, render-blocking resources, third-party widgets). Return ONLY a JSON array of 5 to 7 "
        "objects, each with exactly these keys: title, what, why, how. No markdown, no text outside "
        "the JSON.\n\nURL: " + url + "\n\nHTML (truncated):\n" + html[:12000]
    )
    return _gemini_json_items(prompt)


def _gemini_audit_analysis(url: str, pages: list):
    """Gemini prioritised SEO action plan built from the audit findings."""
    lines = []
    for p in pages[:8]:
        fails = [c["name"] for c in p["checks"] if not c["ok"]]
        title = (p.get("title") or "")[:70]
        lines.append("- %s (score %s) [%s] failing: %s" % (
            p["url"], p["score"], title, ", ".join(fails) or "none"))
    prompt = (
        "You are a senior SEO consultant. Based on this multi-page website audit, write a "
        "prioritised action plan of the 5 to 7 highest-impact fixes for THIS site. Be specific and "
        "reference the actual pages/issues seen. Return ONLY a JSON array of objects with exactly "
        "these keys: title, what, why, how. No markdown, no text outside the JSON.\n\n"
        "SITE: " + url + "\n\nAUDIT FINDINGS:\n" + "\n".join(lines)
    )
    return _gemini_json_items(prompt)


# ══════════════════════════════════════════════════════════════════════════════
# WORDPRESS PLUGIN GENERATOR (Gemini)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/wp/generate", methods=["GET", "POST"])
def wp_generate():
    if request.method == "POST":
        data = request.get_json(force=True)
        name = (data.get("name") or "").strip()
        desc = (data.get("description") or "").strip()
    else:
        name = (request.args.get("name") or "").strip()
        desc = (request.args.get("description") or "").strip()
    if not name or not desc:
        return jsonify({"error": "Plugin name and description are required"}), 400
    php = _gemini_plugin(name, desc)
    if not php:
        return jsonify({"error": "Plugin generation is unavailable right now (Gemini key/quota). Try again shortly."}), 502
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "custom-plugin"
    return jsonify({"slug": slug, "name": name, "php": php, "readme": _plugin_readme(name, desc)})


def _gemini_plugin(name: str, description: str) -> str:
    prompt = (
        "You are a senior WordPress plugin developer. Generate a COMPLETE, single-file WordPress "
        "plugin from the requirement below.\n"
        "- Begin with the standard plugin header docblock (Plugin Name, Description, Version, Author, License).\n"
        "- Add `if (!defined('ABSPATH')) { exit; }` right after the header to block direct access.\n"
        "- Use correct WordPress hooks/filters. Sanitize all input (sanitize_*), escape all output "
        "(esc_*), and use nonces + current_user_can() checks anywhere the plugin handles input or "
        "admin actions.\n"
        "- Prefix all functions to avoid collisions.\n"
        "Output ONLY the raw PHP code. No markdown code fences, no commentary.\n\n"
        "Plugin Name: " + name + "\nRequirement: " + description
    )
    raw = _gemini_generate(prompt)
    if not raw:
        return ""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        import re as _re
        raw = _re.sub(r"^php\s*", "", raw, flags=_re.I).strip()
    if not raw.lstrip().startswith("<?php"):
        raw = "<?php\n" + raw
    return raw


def _plugin_readme(name: str, description: str) -> str:
    return (
        "=== " + name + " ===\n"
        "Contributors: web-team\n"
        "Requires at least: 5.0\n"
        "Tested up to: 6.5\n"
        "Stable tag: 1.0.0\n"
        "License: GPLv2 or later\n\n"
        "== Description ==\n" + description + "\n\n"
        "== Installation ==\n"
        "1. In WP admin go to Plugins > Add New > Upload Plugin and choose the .zip.\n"
        "2. Click Install Now, then Activate.\n\n"
        "Generated by web-team using Gemini. Review and test on a staging site before production use.\n"
    )


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
        # Standalone path (Vercel/Railway): generate the page with Gemini
        content = _gather_clone_content(request, mode)
        return jsonify({"pages": _clone_with_gemini(url, html, content)})
    except Exception as e:
        log.exception("clone build failed")
        return jsonify({"error":str(e)}), 500


def _gather_clone_content(req, mode: str) -> str:
    """Collect plain-text content from uploaded files or a public Google Sheet."""
    chunks = []
    if mode == "sheet":
        sheet_url = (req.form.get("sheet_url") or "").strip()
        if sheet_url:
            try:
                import re, requests
                m = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
                if m:
                    csv_url = f"https://docs.google.com/spreadsheets/d/{m.group(1)}/export?format=csv"
                    chunks.append(requests.get(csv_url, timeout=20).text)
            except Exception as e:
                log.warning("sheet fetch failed: %s", e)
    else:
        for f in req.files.getlist("files"):
            name = (f.filename or "").lower()
            try:
                raw = f.read()
                if name.endswith((".txt", ".csv", ".md", ".json", ".html")):
                    chunks.append(raw.decode("utf-8", "ignore"))
                else:  # docx/pdf: best-effort decodable text
                    chunks.append(raw.decode("utf-8", "ignore"))
            except Exception:
                continue
    return "\n\n".join(c for c in chunks if c and c.strip())[:24000]


def _gemini_generate(prompt: str):
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        log.warning("gemini: GEMINI_API_KEY not set")
        return None
    import requests
    models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-pro"]
    for model in models:
        try:
            endpoint = ("https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent?key=" + key)
            r = requests.post(endpoint, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=50)
            data = r.json()
            if data.get("candidates"):
                return data["candidates"][0]["content"]["parts"][0]["text"]
            err = (data.get("error") or {}).get("message", "") or str(list(data.keys()))
            log.warning("gemini model=%s http=%s err=%s", model, r.status_code, err[:240])
            # Key/permission/quota errors won't be fixed by another model name -> stop early.
            if r.status_code in (400, 401, 403, 429) and "model" not in err.lower() and "not found" not in err.lower():
                break
        except Exception as e:
            log.warning("gemini model=%s exception: %s", model, e)
    return None


def _clone_with_gemini(ref_url: str, design_html: str, content: str):
    prompt = (
        "You are an expert front-end engineer. Reproduce the DESIGN below as a single, "
        "complete, self-contained HTML document (inline CSS, no external files), but replace "
        "its textual content with the CONTENT provided. Keep the visual structure and styling "
        "faithful to the design. Output ONLY raw HTML — no markdown fences, no commentary.\n\n"
        f"REFERENCE URL: {ref_url}\n\nDESIGN (truncated):\n{design_html[:12000]}\n\n"
        f"CONTENT:\n{content or '(no content supplied — keep the design placeholder text)'}"
    )
    out = _gemini_generate(prompt)
    if out:
        out = out.strip()
        if out.startswith("```"):
            out = out.strip("`")
            if out[:4].lower() == "html":
                out = out[4:]
            out = out.strip()
        import re
        mt = re.search(r"<title[^>]*>(.*?)</title>", out, re.I | re.S)
        title = mt.group(1).strip()[:80] if mt else "Cloned Page"
        return [{"id": "p1", "filename": "cloned-page.html", "title": title, "html": out}]
    # No key or failure → return the captured design as a template fallback
    return [{
        "id": "p1", "filename": "cloned-page.html",
        "title": "Cloned Page (template fallback — add GEMINI_API_KEY for AI)",
        "html": design_html + "\n<!-- web-team: set GEMINI_API_KEY to enable AI cloning -->",
    }]


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
@app.errorhandler(404)
def not_found(_e):
    # API routes return JSON; everything else falls back to the home terminal.
    if request.path.startswith("/api/"):
        return jsonify({"error": "not found"}), 404
    return render_template("home.html", active="home"), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    log.info("web-team backend -> http://localhost:%d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
