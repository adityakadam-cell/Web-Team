(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2, 3].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'indigo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let zip = null, files = [], origName = 'project', changedFiles = [];
  const TEXT_EXT = /\.(html?|css|js|json|txt|xml|svg|md)$/i;

  const fileInput = document.getElementById('zipInput');
  const uploadZone = document.getElementById('uploadZone');
  const fileInfo = document.getElementById('fileInfo');
  const fileErr = document.getElementById('fileErr');
  const toDocBtn = document.getElementById('toDocBtn');
  const showErr = (m) => { fileErr.textContent = m; fileErr.classList.remove('hidden'); };

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    fileErr.classList.add('hidden'); fileInfo.classList.add('hidden'); toDocBtn.disabled = true;
    origName = f.name.replace(/\.zip$/i, '') || 'project';
    if (typeof JSZip === 'undefined') { showErr('Zip library not loaded - refresh and try again.'); return; }
    try {
      zip = await JSZip.loadAsync(f);
      files = [];
      const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir && TEXT_EXT.test(p));
      for (const p of paths) files.push({ path: p, content: await zip.files[p].async('string') });
      if (!files.length) { showErr('No editable text files (html/css/js) found in that zip.'); return; }
      fileInfo.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + WT.esc(f.name) + '</span>' +
        '<span style="color:var(--faint);font-size:12px">' + files.length + ' editable files</span>';
      fileInfo.classList.remove('hidden');
      toDocBtn.disabled = false;
    } catch (e) { showErr('Could not read that zip file.'); }
  });

  toDocBtn.addEventListener('click', () => goto(1));
  document.getElementById('backToUpload').addEventListener('click', () => goto(0));

  const docUrl = document.getElementById('docUrl');
  const docText = document.getElementById('docText');
  const applyBtn = document.getElementById('applyBtn');
  docText.addEventListener('input', () => { applyBtn.disabled = !docText.value.trim(); });

  const fetchDocBtn = document.getElementById('fetchDocBtn');
  fetchDocBtn.addEventListener('click', async () => {
    if (!docUrl.value.trim()) return;
    fetchDocBtn.disabled = true; fetchDocBtn.textContent = '...';
    try {
      const res = await fetch('/api/html/doc?url=' + encodeURIComponent(docUrl.value.trim()));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not fetch the document');
      docText.value = data.text || '';
      applyBtn.disabled = !docText.value.trim();
    } catch (e) { showErr(e.message); }
    finally { fetchDocBtn.disabled = false; fetchDocBtn.textContent = 'Fetch'; }
  });

  applyBtn.addEventListener('click', async () => {
    goto(2);
    document.getElementById('applyError').classList.add('hidden');
    document.getElementById('applyLoading').classList.remove('hidden');
    try {
      const res = await fetch('/api/html/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, instructions: docText.value.trim() }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch (_) { throw new Error(res.status === 504 ? 'Timed out - too many/large files or the AI is busy. Try fewer files or again.' : 'The AI editor is busy right now - please try again in a moment.'); }
      if (!res.ok) throw new Error(data.error || 'Could not apply changes');
      changedFiles = data.changed || [];
      changedFiles.forEach((c) => { zip.file(c.path, c.content); });
      renderReport();
      document.getElementById('applyLoading').classList.add('hidden');
      goto(3);
    } catch (e) {
      document.getElementById('applyLoading').classList.add('hidden');
      document.getElementById('applyError').classList.remove('hidden');
      document.getElementById('applyErrMsg').textContent = e.message;
    }
  });
  document.getElementById('applyRetry').addEventListener('click', () => goto(1));

  function renderReport() {
    const list = document.getElementById('reportList');
    list.innerHTML = '';
    if (!changedFiles.length) {
      list.innerHTML = '<div style="padding:16px 18px;color:var(--faint);font-size:13px">The AI did not change any files for these instructions. Try more specific changes.</div>';
      return;
    }
    changedFiles.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'pagerow';
      row.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '<div style="flex:1;min-width:0"><p style="font-size:14px;font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + WT.esc(c.path) + '</p></div>' +
        '<span style="color:var(--faint);font-size:12px">updated</span>';
      list.appendChild(row);
    });
  }

  document.getElementById('dlBtn').addEventListener('click', async () => {
    if (!zip) return;
    WT.downloadBlob(await zip.generateAsync({ type: 'blob' }), origName + '-updated.zip');
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    zip = null; files = []; changedFiles = [];
    fileInput.value = ''; docUrl.value = ''; docText.value = '';
    applyBtn.disabled = true; toDocBtn.disabled = true;
    fileInfo.classList.add('hidden');
    goto(0);
  });
})();
