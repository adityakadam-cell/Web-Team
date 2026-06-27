import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Github, Key, FolderOpen, GitBranch, ChevronRight, CheckCircle2, AlertCircle, Loader2, Terminal } from "lucide-react";
import WizardShell from "@/components/WizardShell";

const STEPS = [
  { label:"Credentials" },
  { label:"Repository"  },
  { label:"Pushing"     },
  { label:"Done"        },
];

interface LogLine { type:"info"|"success"|"error"|"cmd"; text:string; }

export default function GitHubPush() {
  const [step,       setStep]      = useState(0);
  const [username,   setUsername]  = useState("");
  const [token,      setToken]     = useState("");
  const [showToken,  setShowToken] = useState(false);
  const [folderPath, setFolderPath]= useState("");
  const [repoUrl,    setRepoUrl]   = useState("");
  const [branch,     setBranch]    = useState("main");
  const [message,    setMessage]   = useState("");
  const [logs,       setLogs]      = useState<LogLine[]>([]);
  const [status,     setStatus]    = useState<"idle"|"running"|"done"|"error">("idle");

  const addLog = (type:LogLine["type"], text:string) =>
    setLogs(l=>[...l, {type, text}]);

  const push = async () => {
    setStatus("running");
    setLogs([]);
    setStep(2);
    addLog("info", "Connecting to GitHub…");

    try {
      const res = await fetch("/api/github/push", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          username, token, folder_path: folderPath,
          repo_url: repoUrl, branch, message: message||undefined,
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(Boolean);
        lines.forEach(line=>{
          try {
            const obj = JSON.parse(line);
            addLog(obj.type||"info", obj.text||line);
          } catch { addLog("info", line); }
        });
      }
      if (!res.ok) { setStatus("error"); return; }
      setStatus("done");
      setStep(3);
    } catch(e:any) {
      addLog("error", e.message);
      setStatus("error");
    }
  };

  const logColor = (t:LogLine["type"]) =>
    t==="success"?"text-emerald-400":t==="error"?"text-red-400":t==="cmd"?"text-amber-400":"text-white/50";

  return (
    <WizardShell
      title="GitHub Push"
      subtitle="Push any local folder to GitHub — no terminal required"
      accentColor="amber"
      steps={STEPS}
      currentStep={step}
    >
      <AnimatePresence mode="wait">

      {/* STEP 0 — Credentials */}
      {step===0 && (
        <motion.div key="s0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          <div className="glass-card rounded-2xl p-7 space-y-5">
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-sm text-amber-300/70 space-y-1">
              <p className="font-medium text-amber-300">Create a Personal Access Token:</p>
              <p>GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)</p>
              <p>Tick the <span className="font-mono bg-white/5 px-1 rounded">repo</span> scope → Generate → Copy.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">GitHub Username *</label>
              <div className="relative">
                <Github className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="your-github-username"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Personal Access Token *</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={token} onChange={e=>setToken(e.target.value)} type={showToken?"text":"password"} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-14 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-mono" />
                <button onClick={()=>setShowToken(v=>!v)}
                  className="interactive absolute right-3.5 top-3 text-white/25 hover:text-white/60 text-xs px-2 py-0.5 transition-colors">
                  {showToken?"Hide":"Show"}
                </button>
              </div>
            </div>
          </div>

          <button onClick={()=>setStep(1)} disabled={!username||!token}
            className="interactive w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold text-sm hover:from-amber-500 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
            Next: Set Repository <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* STEP 1 — Repo details */}
      {step===1 && (
        <motion.div key="s1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          <div className="glass-card rounded-2xl p-7 space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Local Folder Path *</label>
              <div className="relative">
                <FolderOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={folderPath} onChange={e=>setFolderPath(e.target.value)} placeholder="D:\Projects\my-website"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm font-mono focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">GitHub Repository URL *</label>
              <div className="relative">
                <Github className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} placeholder="https://github.com/username/repo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Branch</label>
                <div className="relative">
                  <GitBranch className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                  <input value={branch} onChange={e=>setBranch(e.target.value)} placeholder="main"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Commit Message</label>
                <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Auto: timestamp"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-amber-500/50 transition-colors" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={()=>setStep(0)} className="interactive px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-all">Back</button>
            <button onClick={push} disabled={!folderPath||!repoUrl}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold text-sm hover:from-amber-500 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
              <Github className="w-4 h-4" /> Push to GitHub
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2 — Live logs */}
      {step===2 && (
        <motion.div key="s2" initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500" /><div className="terminal-dot bg-amber-500" /><div className="terminal-dot bg-green-500" />
              <span className="text-white/30 text-xs ml-2">git push</span>
              {status==="running" && <Loader2 className="w-3 h-3 text-amber-400 ml-auto animate-spin" />}
            </div>
            <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
              {logs.map((l,i)=>(
                <div key={i} className={`text-xs font-mono ${logColor(l.type)}`}>
                  <span className="text-white/15 mr-2">{`>`}</span>{l.text}
                </div>
              ))}
              {status==="running" && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mt-2">
                  <motion.span animate={{opacity:[1,0,1]}} transition={{repeat:Infinity,duration:0.8}}>▋</motion.span>
                </div>
              )}
            </div>
          </div>
          {status==="error" && (
            <button onClick={()=>{setStep(1);setStatus("idle");setLogs([]);}}
              className="interactive w-full py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm">
              Go back and retry
            </button>
          )}
        </motion.div>
      )}

      {/* STEP 3 — Done */}
      {step===3 && (
        <motion.div key="s3" initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          <div className="glass-card rounded-2xl p-10 text-center space-y-5">
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",delay:0.1}}>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            </motion.div>
            <div>
              <h3 className="text-white font-semibold text-xl mb-2">Pushed to GitHub!</h3>
              <p className="text-white/40 text-sm">Your files are live on <span className="text-amber-400 font-mono">{repoUrl}</span></p>
            </div>
            {repoUrl && (
              <a href={repoUrl.replace(".git","")} target="_blank" rel="noopener noreferrer"
                className="interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm transition-all">
                <Github className="w-4 h-4" /> View on GitHub
              </a>
            )}
          </div>
          <button onClick={()=>{setStep(0);setUsername("");setToken("");setFolderPath("");setRepoUrl("");setLogs([]);setStatus("idle");}}
            className="interactive w-full py-3 rounded-xl border border-white/10 text-white/40 hover:text-white/70 text-sm transition-colors">
            Push another folder
          </button>
        </motion.div>
      )}

      </AnimatePresence>
    </WizardShell>
  );
}
