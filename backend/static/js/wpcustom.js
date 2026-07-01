(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2, 3].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'amber');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let zip = null, mainPath = null, mainPhp = '', origName = 'plugin', modifiedPhp = '';

  const fileInput = document.getElementById('zipInput');
  const uploadZone = document.getElementById('uploadZone');
  const fileInfo = document.getElementById('fileInfo');
  const fileErr = document.getElementById('fileErr');
  const toChangesBtn = document.getElementById('toChangesBtn');
  const showErr = (m) => { fileErr.textContent = m; fileErr.classList.remove('hidden'); };

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    fileErr.classList.add('hidden'); fileInfo.classList.add('hidden'); toChangesBtn.disabled = true;
    origName = f.name.replace(/\.zip$/i, '') || 'plugin';
    if (typeof JSZip === 'undefined') { showErr('Zip library not loaded - refresh and try again.'); return; }
    try {
      zip = await JSZip.loadAsync(f);
      mainPath = null; mainPhp = '';
      const phpFiles = Object.keys(zip.files).filter((p) => /\.php$/i.test(p) && !zip.files[p].dir);
      for (const p of phpFiles) {
        const content = await zip.files[p].async('string');
        if (/Plugin Name\s*:/i.test(content)) { mainPath = p; mainPhp = content; break; }
      }
      if (!mainPath && phpFiles.length) { mainPath = phpFiles[0]; mainPhp = await zip.files[phpFiles[0]].async('string'); }
      if (!mainPath) { showErr('No PHP file found inside that zip.'); return; }
      fileInfo.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + WT.esc(f.name) + '</span>' +
        '<span style="color:var(--faint);font-size:12px">main: ' + WT.esc(mainPath) + '</span>';
      fileInfo.classList.remove('hidden');
      toChangesBtn.disabled = false;
    } catch (e) { showErr('Could not read that zip file.'); }
  });

  toChangesBtn.addEventListener('click', () => goto(1));
  document.getElementById('backToUpload').addEventListener('click', () => goto(0));

  const changeText = document.getElementById('changeText');
  const custBtn = document.getElementById('custBtn');
  changeText.addEventListener('input', () => { custBtn.disabled = !changeText.value.trim(); });

  custBtn.addEventListener('click', async () => {
    goto(2);
    document.getElementById('custError').classList.add('hidden');
    document.getElementById('custLoading').classList.remove('hidden');
    try {
      const res = await fetch('/api/wp/customize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ php: mainPhp, request: changeText.value.trim() }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch (_) { throw new Error(res.status === 504 ? 'The customizer timed out - the AI service is busy. Please try again.' : 'The customizer is busy right now - please try again in a moment.'); }
      if (!res.ok) throw new Error(data.error || 'Customization failed');
      modifiedPhp = data.php;
      zip.file(mainPath, modifiedPhp);
      document.getElementById('custFileName').textContent = mainPath.split('/').pop();
      document.getElementById('custPreview').textContent = modifiedPhp.slice(0, 4000) + (modifiedPhp.length > 4000 ? '\n...' : '');
      document.getElementById('custLoading').classList.add('hidden');
      goto(3);
    } catch (e) {
      document.getElementById('custLoading').classList.add('hidden');
      document.getElementById('custError').classList.remove('hidden');
      document.getElementById('custErrMsg').textContent = e.message;
    }
  });
  document.getElementById('custRetry').addEventListener('click', () => goto(1));

  const copyBtn = document.getElementById('copyBtn');
  copyBtn.addEventListener('click', () => {
    if (!modifiedPhp) return;
    navigator.clipboard.writeText(modifiedPhp);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy PHP'; }, 1800);
  });

  document.getElementById('dlBtn').addEventListener('click', async () => {
    if (!zip) return;
    WT.downloadBlob(await zip.generateAsync({ type: 'blob' }), origName + '-customized.zip');
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    zip = null; mainPath = null; mainPhp = ''; modifiedPhp = '';
    fileInput.value = ''; changeText.value = '';
    custBtn.disabled = true; toChangesBtn.disabled = true;
    fileInfo.classList.add('hidden');
    goto(0);
  });
})();
