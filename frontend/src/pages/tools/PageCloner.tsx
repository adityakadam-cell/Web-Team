import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Globe, Upload, FileText, Table, ChevronRight, CheckCircle2, Download, AlertCircle, Eye } from "lucide-react";
import WizardShell from "@/components/WizardShell";

const STEPS = [
  { label:"Design URL"  },
  { label:"HTML"        },
  { label:"Content"     },
  { label:"Building"    },
  { label:"Download"    },
];

interface BuiltPage { id:string; filename:string; title:string; approved:boolean; }

export default function PageCloner() {
  const [step,      setStep]      = useState(0);
  const [url,       setUrl]       = useState("");
  const [html,      setHtml]      = useState("");
  const [mode,      setMode]      = useState<"files"|"sheet">("files");
  const [sheetUrl,  setSheetUrl]  = useState("");
  const [files,     setFiles]     = useState<File[]>([]);
  const [building,  setBuilding]  = useState(false);
  const [pages,     setPages]     = useState<BuiltPage[]>([]);
  const [error,     setError]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const removeFile = (i:number) => setFiles(f=>f.filter((_,j)=>j!==i));

  const runBuild = async () => {
    setBuilding(true); setError(""); setStep(3);
    try {
      const fd = new FormData();
      fd.append("url",  url);
      fd.append("html", html);
      fd.append("mode", mode);
      if (mode==="sheet") fd.append("sheet_url", sheetUrl);
      else files.forEach(f=>fd.append("files",f));

      const res = await fetch("/api/clone/build", { method:"POST", body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Build failed");
      setPages(data.pages.map((p:any)=>({...p, approved:false})));
      setStep(4);
    } catch(e:any) {
      setError(e.message);
    } finally { setBuilding(false); }
  };

  const toggleApprove = (id:string) =>
    setPages(ps=>ps.map(p=>p.id===id?{...p,approved:!p.approved}:p));

  const downloadZip = async () => {
    const approved = pages.filter(p=>p.approved).map(p=>p.filename);
    if (!approved.length) return;
    const res = await fetch("/api/clone/zip", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ filenames: approved }),
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cloned-pages.zip";
    a.click();
  };

  return (
    <WizardShell
      title="Page Cloner"
      subtitle="Clone any page design and fill it with your content using AI"
      accentColor="emerald"
      steps={STEPS}
      currentStep={step}
    >
      <AnimatePresence mode="wait">

      {/* STEP 0 — URL */}
      {step===0 && (
        <motion.div key="s0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          <div className="glass-card rounded-2xl p-7 space-y-5">
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-sm text-emerald-300/70">
              Point at any live webpage. The AI will copy its design structure and fill it with your content.
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Reference Page URL *</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com/product-page"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors" />
              </div>
            </div>
          </div>
          <button onClick={()=>setStep(1)} disabled={!url}
            className="interactive w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
            Next: Capture Design <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* STEP 1 — HTML */}
      {step===1 && (
        <motion.div key="s1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500" /><div className="terminal-dot bg-amber-500" /><div className="terminal-dot bg-green-500" />
              <span className="text-white/30 text-xs ml-2 font-mono">design.html</span>
            </div>
            <textarea value={html} onChange={e=>setHtml(e.target.value)}
              placeholder={"Paste the full HTML of the reference page here.\n\nTip: open the URL in Chrome → right-click → View Page Source → select all → paste here."}
              className="w-full bg-transparent p-5 text-white/80 placeholder-white/15 text-xs font-mono focus:outline-none resize-none h-64 leading-relaxed" />
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setStep(0)} className="interactive px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-all">Back</button>
            <button onClick={()=>setStep(2)} disabled={!html.trim()}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
              Next: Add Content <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2 — Content */}
      {step===2 && (
        <motion.div key="s2" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-5">
          {/* Mode toggle */}
          <div className="glass-card rounded-2xl p-2 flex gap-2">
            {(["files","sheet"] as const).map(m=>(
              <button key={m} onClick={()=>setMode(m)}
                className={`interactive flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  mode===m?"bg-white/10 text-white":"text-white/40 hover:text-white/70"
                }`}>
                {m==="files"?<><Upload className="w-4 h-4"/>Upload Files</>:<><Table className="w-4 h-4"/>Google Sheet</>}
              </button>
            ))}
          </div>

          {mode==="files" ? (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div onClick={()=>fileRef.current?.click()}
                className="interactive border-2 border-dashed border-white/10 hover:border-emerald-500/30 rounded-xl p-8 text-center cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Click to upload files</p>
                <p className="text-white/20 text-xs mt-1">.docx · .pdf · .csv · .txt (max 10 files)</p>
              </div>
              <input ref={fileRef} type="file" multiple accept=".docx,.pdf,.csv,.txt" className="hidden"
                onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,10))} />
              {files.length>0 && (
                <div className="space-y-2">
                  {files.map((f,i)=>(
                    <div key={i} className="flex items-center gap-3 bg-white/3 rounded-lg px-4 py-2.5">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-white/70 text-sm flex-1 truncate">{f.name}</span>
                      <span className="text-white/25 text-xs">{(f.size/1024).toFixed(0)}KB</span>
                      <button onClick={()=>removeFile(i)} className="interactive text-white/20 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="bg-white/3 rounded-xl p-4 text-xs text-white/40 font-mono space-y-1">
                <p>Required columns: <span className="text-emerald-400">Product · Doc · Meta Title · Meta Description · Url</span></p>
                <p>Make the sheet publicly viewable before pasting the URL.</p>
              </div>
              <input value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors" />
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={()=>setStep(1)} className="interactive px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-all">Back</button>
            <button onClick={runBuild} disabled={mode==="files"?files.length===0:!sheetUrl.trim()}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
              Build Pages with AI <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3 — Building */}
      {step===3 && (
        <motion.div key="s3" initial={{opacity:0}} animate={{opacity:1}} className="glass-card rounded-2xl p-12 text-center space-y-6">
          {error ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={()=>setStep(2)} className="interactive px-5 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm">Try again</button>
            </>
          ) : (
            <>
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                <motion.div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent"
                  animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:"linear"}} />
                <Copy className="absolute inset-0 m-auto w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">AI is building your pages</h3>
                <p className="text-white/30 text-sm mt-1">Analysing content, filling the design template…</p>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* STEP 4 — Download */}
      {step===4 && (
        <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-white font-medium text-sm">{pages.length} page{pages.length!==1?"s":""} built</span>
              <span className="text-white/30 text-xs">{pages.filter(p=>p.approved).length} selected</span>
            </div>
            {pages.map(p=>(
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                <button onClick={()=>toggleApprove(p.id)}
                  className={`interactive w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    p.approved?"bg-emerald-500 border-emerald-500":"border-white/20 hover:border-emerald-500/50"
                  }`}>
                  {p.approved && <CheckCircle2 className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">{p.title||p.filename}</p>
                  <p className="text-white/25 text-xs font-mono">{p.filename}</p>
                </div>
                <a href={`/api/clone/download/${p.filename}`} download className="interactive text-white/25 hover:text-emerald-400 transition-colors">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={downloadZip} disabled={!pages.some(p=>p.approved)}
              className="interactive flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg">
              <Download className="w-4 h-4" /> Download ZIP
            </button>
            <button onClick={()=>{setStep(0);setUrl("");setHtml("");setFiles([]);setPages([]);}}
              className="interactive px-5 py-3.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-all">
              New Clone
            </button>
          </div>
        </motion.div>
      )}

      </AnimatePresence>
    </WizardShell>
  );
}
