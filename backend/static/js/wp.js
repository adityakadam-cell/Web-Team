(function () {
  const chips = document.querySelectorAll('#steps .step-chip');
  const panels = [0, 1, 2].map((i) => document.getElementById('panel' + i));
  const goto = (n) => {
    panels.forEach((p, i) => p.classList.toggle('hidden', i !== n));
    WT.setSteps(chips, n, 'amber');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let result = null;
  const pname = document.getElementById('pname');
  const pdesc = document.getElementById('pdesc');
  const genBtn = document.getElementById('genBtn');
  const check = () => { genBtn.disabled = !(pname.value.trim() && pdesc.value.trim()); };
  pname.addEventListener('input', check);
  pdesc.addEventListener('input', check);

  // AI suggestions for the "What should the plugin do?" field
  const suggBtn = document.getElementById('suggBtn');
  const suggBox = document.getElementById('suggBox');
  const suggLabel = suggBtn ? suggBtn.innerHTML : '';
  if (suggBtn) suggBtn.addEventListener('click', async () => {
    suggBtn.disabled = true; suggBtn.textContent = 'Getting ideas...';
    suggBox.innerHTML = '';
    try {
      const res = await fetch('/api/wp/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pname.value.trim(), description: pdesc.value.trim() }),
      });
      const data = await res.json();
      renderSuggestions(data.suggestions || []);
    } catch (e) { renderSuggestions([]); }
    finally { suggBtn.disabled = false; suggBtn.innerHTML = suggLabel; }
  });
  function renderSuggestions(list) {
    suggBox.innerHTML = '';
    if (!list.length) {
      suggBox.innerHTML = '<span style="font-size:12px;color:var(--faint)">No suggestions right now - try again in a moment.</span>';
      return;
    }
    list.forEach((s) => {
      const c = document.createElement('button');
      c.className = 'opt';
      c.style.cssText = 'border-color:rgba(245,158,11,.4);color:#ffe08a;background:rgba(245,158,11,.08);cursor:pointer';
      c.textContent = '+ ' + s;
      c.addEventListener('click', () => {
        pdesc.value = (pdesc.value.trim() ? pdesc.value.trim() + '. ' : '') + s;
        check();
        c.disabled = true; c.style.opacity = '.45';
      });
      suggBox.appendChild(c);
    });
  }

  genBtn.addEventListener('click', async () => {
    goto(1);
    document.getElementById('genError').classList.add('hidden');
    document.getElementById('genLoading').classList.remove('hidden');
    try {
      const res = await fetch('/api/wp/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pname.value.trim(), description: pdesc.value.trim() }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch (_) { throw new Error(res.status === 504 ? 'The generator timed out - the AI service is busy. Please try again in a moment.' : 'The generator is busy right now - please try again in a moment.'); }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      result = data;
      document.getElementById('fileName').textContent = data.slug + '.php';
      document.getElementById('codePreview').textContent = data.php;
      document.getElementById('genLoading').classList.add('hidden');
      goto(2);
    } catch (e) {
      document.getElementById('genLoading').classList.add('hidden');
      document.getElementById('genError').classList.remove('hidden');
      document.getElementById('genErrMsg').textContent = e.message;
    }
  });
  document.getElementById('genRetry').addEventListener('click', () => goto(0));

  const copyBtn = document.getElementById('copyBtn');
  copyBtn.addEventListener('click', () => {
    if (!result) return;
    navigator.clipboard.writeText(result.php);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy PHP'; }, 1800);
  });

  document.getElementById('dlBtn').addEventListener('click', async () => {
    if (!result) return;
    if (typeof JSZip === 'undefined') {
      WT.downloadBlob(new Blob([result.php], { type: 'application/x-php' }), result.slug + '.php');
      return;
    }
    const zip = new JSZip();
    const folder = zip.folder(result.slug);
    folder.file(result.slug + '.php', result.php);
    folder.file('readme.txt', result.readme || '');
    WT.downloadBlob(await zip.generateAsync({ type: 'blob' }), result.slug + '.zip');
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    pname.value = ''; pdesc.value = ''; result = null; genBtn.disabled = true; goto(0);
  });
})();
