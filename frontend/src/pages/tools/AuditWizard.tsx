import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Globe, Mail, ChevronRight, Loader2, CheckCircle2, AlertCircle, Download, BarChart3, X } from "lucide-react";
import WizardShell from "@/components/WizardShell";

const STEPS = [
  { label: "Setup"    },
  { label: "Crawling" },
  { label: "Results"  },
];

const INDUSTRIES = [
  { id:"general",     label:"General"      },
  { id:"metals",      label:"Metals / Industrial" },
  { id:"ecommerce",   label:"E-commerce"   },
  { id:"saas",        label:"SaaS"         },
  { id:"healthcare",  label:"Healthcare"   },
  { id:"realestate",  label:"Real Estate"  },
];

type JobStatus = "idle"|"crawling"|"analysing"|"done"|"error";

interface JobState {
  status: JobStatus;
  phase: string;
  current: number;
  total: number;
  jobId: string;
  results?: AuditResults;
  error?: string;
}

interface AuditResults {
  overallScore: number;
  totalPages: number;
  passCount: number;
  failCount: number;
  infoCount: number;
  categories: { name:string; score:number }[];
  htmlReport?: string;
}

export default function AuditWizard() {
  const [step, setStep]   = useState(0);
  const [url, setUrl]     = useState("");
  const [industry, setIndustry] = useState("general");
  const [keyword, setKeyword]   = useState("");
  const [email, setEmail]       = useState("");
  const [maxPages, setMaxPages] = useState(30);
  const [deepAudit, setDeepAudit] = useState(false);
  const [job, setJob]     = useState<JobState>({ status:"idle", phase:"", current:0, total:0, jobId:"" });
  const [urlError, setUrlError] = useState("");

  const validate = () => {
    try { new URL(url.startsWith("http")?url:"https://"+url); setUrlError(""); return true; }
    catch { setUrlError("Enter a valid URL (e.g. https://example.com)"); return false; }
  };

  const startAudit = async () => {
    if (!validate()) return;
    setStep(1);
    setJob({ status:"crawling", phase:"Crawling pages...", current:0, total:maxPages, jobId:"" });

    try {
      const res = await fetch("/api/audit/start", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ url: url.startsWith("http")?url:"https://"+url, industry, keyword, email, max_pages:maxPages, deep:deepAudit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      pollJob(data.job_id);
    } catch(e:any) {
      setJob(j => ({ ...j, status:"error", error: e.message }));
    }
  };

  const pollJob = (jobId: string) => {
    setJob(j => ({ ...j, jobId }));
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/audit/status/${jobId}`);
        const d = await r.json();
        setJob(j => ({ ...j, phase: d.phase||j.phase, current: d.current||j.current, total: d.total||j.total }));
        if (d.status === "done") {
          clearInterval(interval);
          setJob(j => ({ ...j, status:"done", results: d.results }));
          setStep(2);
        } else if (d.status === "error") {
          clearInterval(interval);
          setJob(j => ({ ...j, status:"error", error: d.error }));
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const scoreColor = (s:number) => s>=80?"text-emerald-400":s>=50?"text-amber-400":"text-red-400";
  const scoreBg    = (s:number) => s>=80?"bg-emerald-500":s>=50?"bg-amber-500":"bg-red-500";

  return (
    <WizardShell
      title="SEO Audit Wizard"
      subtitle="Crawl your entire site and get a 27-point SEO analysis report"
      accentColor="teal"
      steps={STEPS}
      currentStep={step}
    >

      {/* ── STEP 0 : Setup ── */}
      <AnimatePresence mode="wait">
      {step === 0 && (
        <motion.div key="s0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
          <div className="glass-card rounded-2xl p-7 space-y-5">
            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Website URL *</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  value={url} onChange={e=>{setUrl(e.target.value);setUrlError("");}}
                  placeholder="https://yoursite.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
              {urlError && <p className="text-red-400 text-xs mt-1.5">{urlError}</p>}
            </div>

            {/* Industry */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Industry</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind.id}
                    onClick={()=>setIndustry(ind.id)}
                    className={`interactive px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                      industry===ind.id
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                        : "border-white/8 text-white/40 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Target Keyword</label>
                <input
                  value={keyword} onChange={e=>setKeyword(e.target.value)}
                  placeholder="e.g. stainless steel pipes"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Max Pages</label>
                <input
                  type="number" min={1} max={200} value={maxPages} onChange={e=>setMaxPages(+e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Email + Deep */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                  <input
                    value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="report@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer interactive">
                  <div
                    onClick={()=>setDeepAudit(v=>!v)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${deepAudit?"bg-teal-500":"bg-white/10"}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${deepAudit?"translate-x-4.5":""}`} />
                  </div>
                  <div>
                    <div className="text-sm text-white/70 font-medium">Deep Audit</div>
                    <div className="text-xs text-white/30">Checks images + CTA links</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={startAudit}
            disabled={!url}
            className="interactive w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold text-sm hover:from-teal-500 hover:to-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-teal-500/20"
          >
            <Search className="w-4 h-4" />
            Start Audit
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ── STEP 1 : Crawling ── */}
      {step === 1 && (
        <motion.div key="s1" initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
          <div className="glass-card rounded-2xl p-10 text-center space-y-6">
            {job.status === "error" ? (
              <>
                <AlertCircle className="w-14 h-14 text-red-400 mx-auto" />
                <h3 className="text-white font-semibold text-lg">Audit failed</h3>
                <p className="text-red-400 text-sm">{job.error}</p>
                <button onClick={()=>setStep(0)} className="interactive px-6 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white text-sm">Try again</button>
              </>
            ) : (
              <>
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-teal-500/20" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-teal-500 border-t-transparent"
                    animate={{ rotate:360 }}
                    transition={{ repeat:Infinity, duration:1, ease:"linear" }}
                  />
                  <Search className="absolute inset-0 m-auto w-7 h-7 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{job.phase}</h3>
                  <p className="text-white/40 text-sm">{job.current} / {job.total} pages</p>
                </div>
                {job.total > 0 && (
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="progress-bar h-full"
                      animate={{ width:`${Math.min(100,(job.current/job.total)*100)}%` }}
                    />
                  </div>
                )}
                <p className="text-white/20 text-xs font-mono">This may take a few minutes for large sites</p>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ── STEP 2 : Results ── */}
      {step === 2 && job.results && (
        <motion.div key="s2" initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
          {/* Score card */}
          <div className="glass-card rounded-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-semibold text-lg">Audit Complete</h3>
                <p className="text-white/40 text-sm">{job.results.totalPages} pages analysed</p>
              </div>
              <div className={`text-5xl font-bold font-display ${scoreColor(job.results.overallScore)}`}>
                {job.results.overallScore}
              </div>
            </div>

            {/* Pass/Fail/Info */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label:"Passed",   val:job.results.passCount, color:"text-emerald-400" },
                { label:"Issues",   val:job.results.failCount, color:"text-red-400"     },
                { label:"Info",     val:job.results.infoCount, color:"text-amber-400"   },
              ].map(s => (
                <div key={s.label} className="bg-white/3 rounded-xl p-4 text-center border border-white/5">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                  <div className="text-white/40 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Category scores */}
            {job.results.categories?.length > 0 && (
              <div className="space-y-3">
                {job.results.categories.map(cat => (
                  <div key={cat.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-white/60 text-xs">{cat.name}</span>
                      <span className={`text-xs font-mono ${scoreColor(cat.score)}`}>{cat.score}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1">
                      <div className={`h-full rounded-full ${scoreBg(cat.score)}`} style={{width:`${cat.score}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Download */}
          <div className="flex gap-3">
            {job.results.htmlReport && (
              <a
                href={job.results.htmlReport}
                download
                className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold text-sm hover:from-teal-500 hover:to-cyan-500 transition-all"
              >
                <Download className="w-4 h-4" /> Download Report
              </a>
            )}
            <button
              onClick={()=>{ setStep(0); setJob({status:"idle",phase:"",current:0,total:0,jobId:""}); setUrl(""); }}
              className="interactive flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
            >
              New Audit
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </WizardShell>
  );
}
