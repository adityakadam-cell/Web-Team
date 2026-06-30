// Shared finish-step logic: GitHub push form + live streaming logs.
// Tool scripts wire up #dlBtn (download) themselves.
window.WT = window.WT || {};

WT.initFinish = function () {
  const openBtn = document.getElementById('ghOpenBtn');
  const form = document.getElementById('ghForm');
  const pushBtn = document.getElementById('ghPushBtn');
  const term = document.getElementById('ghTerm');
  const logs = document.getElementById('ghLogs');
  if (!openBtn || !form || !pushBtn) return;

  openBtn.addEventListener('click', () => {
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const val = (id) => (document.getElementById(id).value || '').trim();
  const addLog = (type, text) => {
    const line = document.createElement('div');
    line.className = 'logline ' + (type || 'info');
    line.innerHTML = '<span class="gt">&gt;</span>' + WT.esc(text);
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
  };

  pushBtn.addEventListener('click', async () => {
    const username = val('ghUser');
    const token = val('ghToken');
    const folder_path = val('ghFolder');
    const repo_url = val('ghRepo');
    const branch = val('ghBranch') || 'main';
    const message = val('ghMsg');

    if (!username || !token || !folder_path || !repo_url) {
      term.classList.remove('hidden');
      logs.innerHTML = '';
      addLog('error', 'Username, token, folder and repository URL are all required.');
      return;
    }

    pushBtn.disabled = true;
    term.classList.remove('hidden');
    logs.innerHTML = '';
    addLog('info', 'Connecting to GitHub…');

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token, folder_path, repo_url, branch, message: message || undefined }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const ln of lines) {
          if (!ln.trim()) continue;
          try { const o = JSON.parse(ln); addLog(o.type || 'info', o.text || ln); }
          catch { addLog('info', ln); }
        }
      }
      if (!res.ok) addLog('error', 'Push finished with errors (see above).');
    } catch (e) {
      addLog('error', e.message);
    } finally {
      pushBtn.disabled = false;
    }
  });
};

WT.esc = function (s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

// Generic helpers shared by tool scripts
WT.show = (id) => document.getElementById(id).classList.remove('hidden');
WT.hide = (id) => document.getElementById(id).classList.add('hidden');
WT.downloadBlob = (blob, name) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
};

// Step indicator updater: pass array of step elements + current index
WT.setSteps = function (chips, current, accent) {
  chips.forEach((chip, i) => {
    chip.classList.remove('active', 'done', accent);
    if (i < current) chip.classList.add('done', accent);
    else if (i === current) chip.classList.add('active', accent);
  });
};
