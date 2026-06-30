(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'teal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const state = { industry: 'general', deep: false, jobId: '', reportUrl: '' };

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
    deepBtn.textContent = (state.deep ? 'On' : 'Off') + ' — also check images + CTA links';
  });

  const url = document.getElementById('url');
  const startBtn = document.getElementById('startBtn');
  url.addEventListener('input', () => { startBtn.disabled = !url.value.trim(); document.getElementById('urlErr').classList.add('hidden'); });

  const validUrl = (u) => { try { new URL(u.startsWith('http') ? u : 'https://' + u); return true; } catch { return false; } };

  startBtn.addEventListener('click', async () => {
    const u = url.value.trim();
    if (!validUrl(u)) { document.getElementById('urlErr').classList.remove('hidden'); return; }
    const full = u.startsWith('http') ? u : 'https://' + u;
    const maxPages = +document.getElementById('maxPages').value || 30;
    goto(1);
    document.getElementById('crawlError').classList.add('hidden');
    document.getElementById('crawlLoading').classList.remove('hidden');
    document.getElementById('crawlCount').textContent = '0 / ' + maxPages + ' pages';
    try {
      const res = await fetch('/api/audit/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: full, industry: state.industry, keyword: document.getElementById('keyword').value, email: document.getElementById('email').value, max_pages: maxPages, deep: state.deep }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      poll(data.job_id);
    } catch (e) { failCrawl(e.message); }
  });

  function failCrawl(msg) {
    document.getElementById('crawlLoading').classList.add('hidden');
    document.getElementById('crawlError').classList.remove('hidden');
    document.getElementById('crawlErrMsg').textContent = msg;
  }

  function poll(jobId) {
    state.jobId = jobId;
    const iv = setInterval(async () => {
      try {
        const r = await fetch('/api/audit/status/' + jobId);
        const d = await r.json();
        if (d.phase) document.getElementById('crawlPhase').textContent = d.phase;
        if (d.total) {
          document.getElementById('crawlCount').textContent = (d.current || 0) + ' / ' + d.total + ' pages';
          document.getElementById('crawlBar').style.width = Math.min(100, ((d.current || 0) / d.total) * 100) + '%';
        }
        if (d.status === 'done') { clearInterval(iv); renderResults(d.results); }
        else if (d.status === 'error') { clearInterval(iv); failCrawl(d.error || 'Audit failed'); }
      } catch (_) { /* keep polling */ }
    }, 2000);
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
    state.reportUrl = r.htmlReport || '';
    const dl = document.getElementById('dlBtn');
    if (!state.reportUrl) { dl.disabled = true; dl.title = 'No downloadable report in fallback mode'; }
    goto(2);
  }

  // download report
  document.getElementById('dlBtn').addEventListener('click', () => {
    if (state.reportUrl) window.location.href = state.reportUrl;
  });

  document.getElementById('crawlRetry').addEventListener('click', () => goto(0));
  document.getElementById('newBtn').addEventListener('click', () => { url.value = ''; startBtn.disabled = true; goto(0); });

  WT.initFinish();
})();
