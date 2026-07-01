(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2, 3, 4].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'indigo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let result = null;

  const url = document.getElementById('url');
  const toHtml = document.getElementById('toHtmlBtn');
  url.addEventListener('input', () => { toHtml.disabled = !url.value.trim(); });
  toHtml.addEventListener('click', () => goto(1));
  document.getElementById('backToUrl').addEventListener('click', () => goto(0));

  const html = document.getElementById('html');
  const runBtn = document.getElementById('runBtn');
  html.addEventListener('input', () => {
    runBtn.disabled = !html.value.trim();
    document.getElementById('charCount').textContent = html.value.length.toLocaleString() + ' chars';
  });

  runBtn.addEventListener('click', async () => {
    goto(2);
    document.getElementById('optError').classList.add('hidden');
    document.getElementById('optLoading').classList.remove('hidden');
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.value.trim(), html: html.value, email: document.getElementById('email').value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      result = data;
      renderScores(data);
    } catch (e) {
      document.getElementById('optLoading').classList.add('hidden');
      document.getElementById('optError').classList.remove('hidden');
      document.getElementById('optErrMsg').textContent = e.message;
    }
  });
  document.getElementById('optRetry').addEventListener('click', () => goto(1));

  const sClass = (s) => (s >= 90 ? 'good' : s >= 50 ? 'mid' : 'bad');
  const sLabel = (s) => (s >= 90 ? 'Excellent' : s >= 50 ? 'Needs Work' : 'Critical');
  const CAT_ORDER = ['Image', 'Font', 'CSS', 'JS', 'Server', 'General'];
  let reportMeta = '';

  const groupBy = (items) => {
    const g = {};
    (items || []).forEach((it) => { const c = it.category || 'General'; (g[c] = g[c] || []).push(it); });
    return g;
  };
  const orderedCats = (g) =>
    CAT_ORDER.filter((c) => g[c]).concat(Object.keys(g).filter((c) => CAT_ORDER.indexOf(c) < 0));

  function catLabel(c, n) {
    const el = document.createElement('div');
    el.className = 'cat-label';
    el.innerHTML = '<span>' + WT.esc(c) + '</span><span class="cat-n">' + n + '</span>';
    return el;
  }

  function renderScores(d) {
    const m = d.scores.mobile, k = d.scores.desktop;
    const note = document.getElementById('scoreNote');
    if (d.scoresEstimated && d.scoreNote) { note.textContent = d.scoreNote; note.classList.remove('hidden'); }
    else { note.classList.add('hidden'); }
    const suffix = d.scoresEstimated ? ' (est.)' : '';
    const setScore = (iv, il, v) => {
      const e = document.getElementById(iv), l = document.getElementById(il);
      e.textContent = v; e.className = 'score-big ' + sClass(v);
      l.textContent = sLabel(v) + suffix; l.className = sClass(v);
    };
    setScore('mScore', 'mLabel', m); setScore('dScore', 'dLabel', k);
    reportMeta = 'Site: ' + (url.value.trim() || '—') + '   ·   Mobile ' + m + ' / Desktop ' + k + suffix +
      '   ·   ' + new Date().toLocaleString();

    // Report 1 — auto-applied optimizations
    document.getElementById('autoCount').textContent = (d.autoFixCount != null ? d.autoFixCount : (d.autoApplied || []).length);
    document.getElementById('aiTag').classList.toggle('hidden', !d.aiApplied);
    const autoList = document.getElementById('autoList');
    autoList.innerHTML = '';
    const ag = groupBy(d.autoApplied);
    const acats = orderedCats(ag);
    if (!acats.length) {
      autoList.innerHTML = '<div class="opt-empty">No auto-changes were needed — your HTML already covers the safe optimizations.</div>';
    } else {
      acats.forEach((c) => {
        autoList.appendChild(catLabel(c, ag[c].length));
        ag[c].forEach((it) => {
          const row = document.createElement('div');
          row.className = 'opt-item';
          row.innerHTML = '<div class="opt-t"><span class="opt-tick">✓</span>' + WT.esc(it.title) + '</div>' +
            (it.detail ? '<p class="opt-d">' + WT.esc(it.detail) + '</p>' : '');
          autoList.appendChild(row);
        });
      });
    }

    // Report 2 — manual to-do
    const manualList = document.getElementById('manualList');
    manualList.innerHTML = '';
    const mg = groupBy(d.manualTodo);
    orderedCats(mg).forEach((c) => {
      manualList.appendChild(catLabel(c, mg[c].length));
      mg[c].forEach((it) => {
        const row = document.createElement('div');
        row.className = 'fix';
        row.innerHTML =
          '<div class="fix-head"><span>' + WT.esc(it.title) + '</span><span style="color:var(--faint)">+</span></div>' +
          '<div class="fix-body"><p><span class="k">What: </span>' + WT.esc(it.what || '') + '</p>' +
          '<p><span class="k">Why: </span>' + WT.esc(it.why || '') + '</p>' +
          '<p><span class="k">How: </span>' + WT.esc(it.how || '') + '</p></div>';
        row.querySelector('.fix-head').addEventListener('click', () => row.classList.toggle('open'));
        manualList.appendChild(row);
      });
    });

    document.getElementById('optLoading').classList.add('hidden');
    goto(3);
  }

  // ---- downloadable standalone HTML reports ----
  function reportDoc(title, intro, sections) {
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>' +
      'body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;color:#1e1b4b;line-height:1.55}' +
      'h1{font-size:24px;margin:0 0 4px}.meta{color:#6b7280;font-size:13px;margin:0 0 10px}.intro{color:#374151;margin:0 0 22px}' +
      'h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#4338ca;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:26px 0 12px}' +
      '.item{margin:0 0 12px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px}.item h3{font-size:14px;margin:0 0 6px}' +
      '.item p{margin:2px 0;font-size:13px}.k{color:#4338ca;font-weight:600}.d{color:#374151;font-size:13px;margin:0}' +
      '</style></head><body><h1>' + title + '</h1><div class="meta">' + WT.esc(reportMeta) + '</div>' +
      '<p class="intro">' + intro + '</p>' + sections + '</body></html>';
  }

  function buildAutoReport() {
    const g = groupBy(result.autoApplied);
    let sec = '';
    orderedCats(g).forEach((c) => {
      sec += '<h2>' + WT.esc(c) + '</h2>';
      g[c].forEach((it) => {
        sec += '<div class="item"><h3>✓ ' + WT.esc(it.title) + '</h3>' +
          (it.detail ? '<p class="d">' + WT.esc(it.detail) + '</p>' : '') + '</div>';
      });
    });
    if (!sec) sec = '<p>No automatic changes were required — the page already covers the safe optimizations.</p>';
    return reportDoc('Auto-Applied Optimizations',
      'These layout-safe changes were applied directly to your page HTML. The optimized page renders visually identical to the original.', sec);
  }

  function buildManualReport() {
    const g = groupBy(result.manualTodo);
    let sec = '';
    orderedCats(g).forEach((c) => {
      sec += '<h2>' + WT.esc(c) + '</h2>';
      g[c].forEach((it) => {
        sec += '<div class="item"><h3>' + WT.esc(it.title) + '</h3>' +
          '<p><span class="k">What:</span> ' + WT.esc(it.what || '') + '</p>' +
          '<p><span class="k">Why:</span> ' + WT.esc(it.why || '') + '</p>' +
          '<p><span class="k">How:</span> ' + WT.esc(it.how || '') + '</p></div>';
      });
    });
    return reportDoc('Manual Optimization To-Do',
      "Apply these on your server, host, or build pipeline. They deliver the remaining PageSpeed gains that page-HTML edits can't achieve on their own.", sec);
  }

  document.getElementById('dlAutoReport').addEventListener('click', () => {
    if (!result) return;
    WT.downloadBlob(new Blob([buildAutoReport()], { type: 'text/html' }), 'auto-applied-report.html');
  });
  document.getElementById('dlManualReport').addEventListener('click', () => {
    if (!result) return;
    WT.downloadBlob(new Blob([buildManualReport()], { type: 'text/html' }), 'manual-changes-report.html');
  });

  document.getElementById('toShipBtn').addEventListener('click', () => {
    document.getElementById('codePreview').textContent =
      result.optimizedHtml.slice(0, 3000) + (result.optimizedHtml.length > 3000 ? '\n…' : '');
    goto(4);
  });

  // download optimized html
  document.getElementById('dlBtn').addEventListener('click', () => {
    if (!result) return;
    WT.downloadBlob(new Blob([result.optimizedHtml], { type: 'text/html' }), 'optimized.html');
  });

  document.getElementById('startOver').addEventListener('click', () => {
    url.value = ''; html.value = ''; result = null; toHtml.disabled = true; runBtn.disabled = true;
    document.getElementById('charCount').textContent = '0 chars';
    goto(0);
  });

  WT.initFinish();
})();
