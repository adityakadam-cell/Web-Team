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

  function renderScores(d) {
    const m = d.scores.mobile, k = d.scores.desktop;
    const note = document.getElementById('scoreNote');
    if (d.scoresEstimated && d.scoreNote) {
      note.textContent = d.scoreNote;
      note.classList.remove('hidden');
    } else { note.classList.add('hidden'); }
    const suffix = d.scoresEstimated ? ' (est.)' : '';
    document.getElementById('mScore').textContent = m;
    document.getElementById('mScore').className = 'score-big ' + sClass(m);
    document.getElementById('mLabel').textContent = sLabel(m) + suffix;
    document.getElementById('mLabel').className = sClass(m);
    document.getElementById('dScore').textContent = k;
    document.getElementById('dScore').className = 'score-big ' + sClass(k);
    document.getElementById('dLabel').textContent = sLabel(k) + suffix;
    document.getElementById('dLabel').className = sClass(k);
    document.getElementById('fixCount').textContent = d.autoFixCount;

    const list = document.getElementById('fixList');
    list.innerHTML = '';
    if (d.fixes && d.fixes.length) {
      const head = document.createElement('div');
      head.style.cssText = 'padding:15px 18px;border-bottom:1px solid var(--line);font-size:14px;color:var(--muted)';
      head.textContent = d.aiSuggestions ? 'AI Smart Suggestions - tailored to this page (Gemini)' : 'Manual fixes needed for 90+';
      list.appendChild(head);
      d.fixes.forEach((f) => {
        const row = document.createElement('div');
        row.className = 'fix';
        row.innerHTML =
          '<div class="fix-head"><span>' + WT.esc(f.title) + '</span><span style="color:var(--faint)">+</span></div>' +
          '<div class="fix-body"><p><span class="k">What: </span>' + WT.esc(f.what || '') + '</p>' +
          '<p><span class="k">Why: </span>' + WT.esc(f.why || '') + '</p>' +
          '<p><span class="k">How: </span>' + WT.esc(f.how || '') + '</p></div>';
        row.querySelector('.fix-head').addEventListener('click', () => row.classList.toggle('open'));
        list.appendChild(row);
      });
    }
    document.getElementById('optLoading').classList.add('hidden');
    goto(3);
  }

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
