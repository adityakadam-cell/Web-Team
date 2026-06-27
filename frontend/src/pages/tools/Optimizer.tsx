import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Globe, Mail, ChevronRight, Loader2, CheckCircle2, AlertCircle, Copy, Download } from "lucide-react";
import WizardShell from "@/components/WizardShell";

const STEPS = [
  { label:"URL & Email" },
  { label:"Paste HTML"  },
  { label:"Optimizing"  },
  { label:"Scores"      },
  { label:"Download"    },
];

interface Score { mobile:number; desktop:number; }
interface Fix   { title:string; what:string; why:string; how:string; }
interface OptResult {
  scores: Score;
  autoFixCount: number;
  fixes: Fix[];
  optimizedHtml: string;
}

export default function Optimizer() {
  const [step, setStep] = useState(0);
  const [url,  setUrl ] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [html, setHtml] = useState("");
  const [result, setResult] = useState<OptResult|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<number|null>(null);

  const runOptimize = async () => {
    setLoading(true); setError(""); setStep(2);
    try {
      const res = await fetch("/api/optimize", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ url, html, email: emailAddr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Server error");
      setResult(data);
      setStep(3);
    } catch(e:any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const copyHtml = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.optimizedHtml);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  const downloadHtml = () => {
    if (!result) return;
    const blob = new Blob([result.optimizedHtml], {type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "optimized.html";
    a.click();
  };

  const scoreColor = (s:number) => s>=90?"text-emerald-400":s>=50?"text-amber-400":"text-red-400";
  const scoreLabel = (s:number) => s>=90?"Excellent":s>=50?"Needs Work":"Critical";

  return (
    <WizardShell
      title="Page Optimizer"
      subtitle="Get real Google PageSpeed scores and auto-optimize your HTML"
      accentColor="indigo"
      steps={STEPS}
      currentStep={step}
    >
      <AnimatePresence mode="wait">

      {/* STEP 0 — URL + Email */}
      {step===0 && (
        <motion.div key="s0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          <div className="glass-card rounded-2xl p-7 space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Live Page URL *</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://yoursite.com/page"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <p className="text-white/25 text-xs mt-1.5">Must be publicly accessible — PageSpeed audits the live URL</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Email (optional)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={emailAddr} onChange={e=>setEmailAddr(e.target.value)} placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
            </div>
          </div>
          <button onClick={()=>setStep(1)} disabled={!url}
            className="interactive w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/20">
            Next: Paste HTML <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* STEP 1 — Paste HTML */}
      {step===1 && (
        <motion.div key="s1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500" />
              <div className="terminal-dot bg-amber-500" />
              <div className="terminal-dot bg-green-500" />
              <span className="text-white/30 text-xs ml-2 font-mono">paste-html.html</span>
            </div>
            <textarea
              value={html} onChange={e=>setHtml(e.target.value)}
              placeholder={"Paste your full page HTML here...\n\n<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>"}
              className="w-full bg-transparent p-5 text-white/80 placeholder-white/15 text-xs font-mono focus:outline-none resize-none h-72 leading-relaxed"
            />
            <div className="border-t border-white/5 px-5 py-2 flex justify-between items-center">
              <span className="text-white/20 text-xs font-mono">{html.length.toLocaleString()} chars</span>
              <span className="text-white/20 text-xs">max 5 MB</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={()=>setStep(0)} className="interactive px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-all">Back</button>
            <button onClick={runOptimize} disabled={!html.trim()}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
              <Zap className="w-4 h-4" /> Run Optimization
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2 — Loading */}
      {step===2 && (
        <motion.div key="s2" initial={{opacity:0}} animate={{opacity:1}} className="glass-card rounded-2xl p-12 text-center space-y-6">
          {error ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={()=>setStep(1)} className="interactive px-5 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm">Try again</button>
            </>
          ) : (
            <>
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                <motion.div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent"
                  animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:"linear"}} />
                <Zap className="absolute inset-0 m-auto w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Running PageSpeed Audit</h3>
                <p className="text-white/30 text-sm mt-1">Fetching live scores + applying fixes… (~30–90s)</p>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* STEP 3 — Scores + Fixes */}
      {step===3 && result && (
        <motion.div key="s3" initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          {/* Score cards */}
          <div className="grid grid-cols-2 gap-4">
            {[{label:"Mobile",score:result.scores.mobile},{label:"Desktop",score:result.scores.desktop}].map(s=>(
              <div key={s.label} className="glass-card rounded-2xl p-6 text-center">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-3">{s.label}</div>
                <div className={`text-5xl font-bold font-display mb-1 ${scoreColor(s.score)}`}>{s.score}</div>
                <div className={`text-xs ${scoreColor(s.score)}`}>{scoreLabel(s.score)}</div>
              </div>
            ))}
          </div>

          {/* Auto-fixes applied */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-medium text-sm">{result.autoFixCount} auto-fixes applied to your HTML</span>
            </div>
          </div>

          {/* Manual fix list */}
          {result.fixes?.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <span className="text-white/60 text-sm">Manual fixes needed for 90+</span>
              </div>
              {result.fixes.map((fix,i)=>(
                <div key={i} className="border-b border-white/5 last:border-0">
                  <button
                    onClick={()=>setExpanded(expanded===i?null:i)}
                    className="interactive w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/3 transition-colors"
                  >
                    <span className="text-white/80 text-sm font-medium">{fix.title}</span>
                    <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${expanded===i?"rotate-90":""}`} />
                  </button>
                  <AnimatePresence>
                  {expanded===i && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                      className="overflow-hidden">
                      <div className="px-5 pb-5 space-y-3 text-sm">
                        <p><span className="text-white/40">What: </span><span className="text-white/70">{fix.what}</span></p>
                        <p><span className="text-white/40">Why: </span><span className="text-white/70">{fix.why}</span></p>
                        <p><span className="text-white/40">How: </span><span className="text-white/70">{fix.how}</span></p>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          <button onClick={()=>setStep(4)}
            className="interactive w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg">
            Get Optimized HTML <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* STEP 4 — Download */}
      {step===4 && result && (
        <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500" />
              <div className="terminal-dot bg-amber-500" />
              <div className="terminal-dot bg-green-500" />
              <span className="text-white/30 text-xs ml-2 font-mono">optimized.html</span>
            </div>
            <pre className="p-5 text-white/60 text-xs font-mono overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap break-all">
              {result.optimizedHtml.slice(0,3000)}{result.optimizedHtml.length>3000?"…":""}
            </pre>
          </div>
          <div className="flex gap-3">
            <button onClick={copyHtml}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm transition-all">
              <Copy className="w-4 h-4" />{copied?"Copied!":"Copy HTML"}
            </button>
            <button onClick={downloadHtml}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
          <button onClick={()=>{setStep(0);setUrl("");setHtml("");setResult(null);}}
            className="interactive w-full py-2.5 rounded-xl text-white/30 hover:text-white/60 text-sm transition-colors">
            Start over
          </button>
        </motion.div>
      )}

      </AnimatePresence>
    </WizardShell>
  );
}
