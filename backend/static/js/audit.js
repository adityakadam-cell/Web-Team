(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'teal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const state = { industry: 'general', deep: false, reportHtml: '' };

  // industry chips
  document.querySelectorAll('#industries .opt').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#industries .opt').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      state.industry = b.dataset.v;
    });
  });

  // deep toggle
  const deepBtn = document.getElementById('deepToggle');
  deepBtn.addEventListener('click', () => {
    state.deep = !state.deep;
    deepBtn.classList.toggle('sel', state.deep);
    deepBtn.textContent = (state.deep ? 'On' : 'Off') + ' - also check images + CTA links';
  });

  const url = document.getElementById('url');
  const startBtn = document.getElementById('startBtn');
  url.addEventListener('input', () => { startBtn.disabled = !url.value.trim(); document.getElementById('urlErr').classList.add('hidden'); });

  const validUrl = (u) => { try { new URL(u.startsWith('http') ? u : 'https://' + u); return true; } catch (e) { return false; } };

  startBtn.addEventListener('click', async () => {
    const u = url.value.trim();
    if (!validUrl(u)) { document.getElementById('urlErr').classList.remove('hidden'); return; }
    const full = u.startsWith('http') ? u : 'https://' + u;
    const maxPages = +document.getElementById('maxPages').value || 10;
    goto(1);
    document.getElementById('crawlError').classList.add('hidden');
    document.getElementById('crawlLoading').classList.remove('hidden');
    document.getElementById('crawlPhase').textContent = 'Crawling & analysing...';
    document.getElementById('crawlCount').textContent = 'up to ' + maxPages + ' pages - this can take ~20-40s';
    document.getElementById('crawlBar').style.width = '45%';
    try {
      const res = await fetch('/api/audit/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: full, industry: state.industry, keyword: document.getElementById('keyword').value, max_pages: maxPages, deep: state.deep }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      document.getElementById('crawlBar').style.width = '100%';
      renderResults(data);
    } catch (e) { failCrawl(e.message); }
  });

  function failCrawl(msg) {
    document.getElementById('crawlLoading').classList.add('hidden');
    document.getElementById('crawlError').classList.remove('hidden');
    document.getElementById('crawlErrMsg').textContent = msg;
  }

  const sClass = (s) => (s >= 80 ? 'good' : s >= 50 ? 'mid' : 'bad');

  function renderResults(r) {
    if (!r) return failCrawl('No results returned');
    document.getElementById('resScore').textContent = r.overallScore;
    document.getElementById('resScore').className = 'score-big ' + sClass(r.overallScore);
    document.getElementById('resPages').textContent = r.totalPages + ' pages analysed';
    document.getElementById('resPass').textContent = r.passCount;
    document.getElementById('resFail').textContent = r.failCount;
    document.getElementById('resInfo').textContent = r.infoCount;
    state.reportHtml = r.reportHtml || '';
    document.getElementById('dlBtn').disabled = !state.reportHtml;
    goto(2);
  }

  // download report (client-side blob)
  document.getElementById('dlBtn').addEventListener('click', () => {
    if (state.reportHtml) WT.downloadBlob(new Blob([state.reportHtml], { type: 'text/html' }), 'seo-audit-report.html');
  });

  document.getElementById('crawlRetry').addEventListener('click', () => goto(0));
  document.getElementById('newBtn').addEventListener('click', () => { url.value = ''; startBtn.disabled = true; goto(0); });

  WT.initFinish();
})();
