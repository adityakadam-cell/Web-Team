(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2, 3, 4].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'emerald');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const state = { mode: 'files', files: [], pages: [] };

  // Step 0 → 1
  const url = document.getElementById('url');
  const toHtml = document.getElementById('toHtmlBtn');
  url.addEventListener('input', () => { toHtml.disabled = !url.value.trim(); });
  toHtml.addEventListener('click', () => goto(1));

  // Step 1 → 2
  const html = document.getElementById('html');
  const toContent = document.getElementById('toContentBtn');
  html.addEventListener('input', () => { toContent.disabled = !html.value.trim(); });
  document.getElementById('backToUrl').addEventListener('click', () => goto(0));
  toContent.addEventListener('click', () => goto(2));

  // Step 2: mode toggle
  const modeFiles = document.getElementById('modeFiles');
  const modeSheet = document.getElementById('modeSheet');
  const filesBox = document.getElementById('filesBox');
  const sheetBox = document.getElementById('sheetBox');
  const buildBtn = document.getElementById('buildBtn');
  const sheetUrl = document.getElementById('sheetUrl');

  function refreshBuild() {
    buildBtn.disabled = state.mode === 'files' ? state.files.length === 0 : !sheetUrl.value.trim();
  }
  modeFiles.addEventListener('click', () => {
    state.mode = 'files'; modeFiles.classList.add('sel'); modeSheet.classList.remove('sel');
    filesBox.classList.remove('hidden'); sheetBox.classList.add('hidden'); refreshBuild();
  });
  modeSheet.addEventListener('click', () => {
    state.mode = 'sheet'; modeSheet.classList.add('sel'); modeFiles.classList.remove('sel');
    sheetBox.classList.remove('hidden'); filesBox.classList.add('hidden'); refreshBuild();
  });
  sheetUrl.addEventListener('input', refreshBuild);

  // file upload
  const fileInput = document.getElementById('fileInput');
  document.getElementById('uploadZone').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    state.files = Array.from(fileInput.files || []).slice(0, 10);
    renderFiles(); refreshBuild();
  });
  function renderFiles() {
    const box = document.getElementById('fileList');
    box.innerHTML = '';
    state.files.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'filerow';
      row.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + WT.esc(f.name) + '</span>' +
        '<span style="color:rgba(255,255,255,.25);font-size:12px">' + Math.round(f.size / 1024) + 'KB</span>' +
        '<button class="x">&times;</button>';
      row.querySelector('.x').addEventListener('click', () => { state.files.splice(i, 1); renderFiles(); refreshBuild(); });
      box.appendChild(row);
    });
  }

  document.getElementById('backToHtml').addEventListener('click', () => goto(1));

  // build
  buildBtn.addEventListener('click', async () => {
    goto(3);
    document.getElementById('buildError').classList.add('hidden');
    document.getElementById('buildLoading').classList.remove('hidden');
    try {
      const fd = new FormData();
      fd.append('url', url.value.trim());
      fd.append('html', html.value);
      fd.append('mode', state.mode);
      if (state.mode === 'sheet') fd.append('sheet_url', sheetUrl.value.trim());
      else state.files.forEach((f) => fd.append('files', f));
      const res = await fetch('/api/clone/build', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Build failed');
      state.pages = (data.pages || []).map((p) => ({ ...p, approved: true }));
      renderPages();
      document.getElementById('buildLoading').classList.add('hidden');
      goto(4);
    } catch (e) {
      document.getElementById('buildLoading').classList.add('hidden');
      document.getElementById('buildError').classList.remove('hidden');
      document.getElementById('buildErrMsg').textContent = e.message;
    }
  });
  document.getElementById('buildRetry').addEventListener('click', () => goto(2));

  function renderPages() {
    const list = document.getElementById('pageList');
    list.innerHTML = '';
    state.pages.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'pagerow';
      row.innerHTML =
        '<button class="check ' + (p.approved ? 'on' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>' +
        '<div style="flex:1;min-width:0"><p style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + WT.esc(p.title || p.filename) + '</p>' +
        '<p style="font-size:11px;color:rgba(255,255,255,.25);font-family:var(--font-mono)">' + WT.esc(p.filename) + '</p></div>' +
        '<a href="/api/clone/download/' + encodeURIComponent(p.filename) + '" download style="color:rgba(255,255,255,.25)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>';
      row.querySelector('.check').addEventListener('click', (e) => {
        p.approved = !p.approved;
        e.currentTarget.classList.toggle('on', p.approved);
        updateSel();
      });
      list.appendChild(row);
    });
    document.getElementById('pageCount').textContent = state.pages.length;
    updateSel();
  }
  function updateSel() {
    document.getElementById('selCount').textContent = state.pages.filter((p) => p.approved).length + ' selected';
  }

  // download zip
  document.getElementById('dlBtn').addEventListener('click', async () => {
    const approved = state.pages.filter((p) => p.approved).map((p) => p.filename);
    if (!approved.length) return;
    const res = await fetch('/api/clone/zip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames: approved }),
    });
    WT.downloadBlob(await res.blob(), 'cloned-pages.zip');
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    url.value = ''; html.value = ''; state.files = []; state.pages = [];
    toHtml.disabled = true; toContent.disabled = true; renderFiles(); goto(0);
  });

  WT.initFinish();
})();
