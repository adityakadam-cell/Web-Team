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

  genBtn.addEventListener('click', async () => {
    goto(1);
    document.getElementById('genError').classList.add('hidden');
    document.getElementById('genLoading').classList.remove('hidden');
    try {
      const res = await fetch('/api/wp/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pname.value.trim(), description: pdesc.value.trim() }),
      });
      const data = await res.json();
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
