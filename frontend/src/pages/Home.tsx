import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Search, Zap, Copy, Github,
  ArrowRight, CheckCircle, Globe, BarChart3,
  Shield, Layers, ChevronRight, Sparkles,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/* ── Tool definitions ───────────────────────────────────────── */
const TOOLS = [
  {
    id: "audit",
    path: "/audit",
    icon: Search,
    accent: "teal",
    badge: "SEO",
    title: "Audit Wizard",
    tagline: "Full-site SEO intelligence",
    desc: "Crawl your entire site and audit every page against a 27-point industrial SEO checklist. Get a downloadable HTML/Excel report with scores, gap analysis, and industry-specific checks for metals, e-commerce, SaaS & more.",
    features: ["27-point checklist", "Industry-specific rules", "Excel + HTML report", "Email delivery"],
    gradient: "from-teal-600/20 to-cyan-600/10",
    border: "hover:border-teal-500/40",
    glow: "tool-card-teal",
    ringColor: "text-teal-400",
    badgeBg: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    btnGrad: "from-teal-600 to-cyan-600",
    stats: "27 checks · 6 categories",
  },
  {
    id: "optimizer",
    path: "/optimizer",
    icon: Zap,
    accent: "indigo",
    badge: "Speed",
    title: "Page Optimizer",
    tagline: "90+ PageSpeed in minutes",
    desc: "Paste your page HTML, run a real Google PageSpeed audit (mobile + desktop), get 15+ automatic HTML fixes applied, and receive a step-by-step manual guide to hit 90+ scores. Full report emailed.",
    features: ["Live PageSpeed scores", "15+ auto-fixes", "Mobile + Desktop", "Email full report"],
    gradient: "from-indigo-600/20 to-violet-600/10",
    border: "hover:border-indigo-500/40",
    glow: "tool-card-indigo",
    ringColor: "text-indigo-400",
    badgeBg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    btnGrad: "from-indigo-600 to-violet-600",
    stats: "15 fixes · Mobile + Desktop",
  },
  {
    id: "cloner",
    path: "/cloner",
    icon: Copy,
    accent: "emerald",
    badge: "AI",
    title: "Page Cloner",
    tagline: "Clone any design with your content",
    desc: "Point at a reference URL, paste or upload your content (Word, PDF, CSV, Google Sheets), and let AI build pixel-perfect clones of the page filled with your data. Preview, approve, and download as ZIP.",
    features: ["AI content fill (Gemini)", "8-agent pipeline", "Google Sheets input", "Bulk ZIP download"],
    gradient: "from-emerald-600/20 to-green-600/10",
    border: "hover:border-emerald-500/40",
    glow: "tool-card-emerald",
    ringColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    btnGrad: "from-emerald-600 to-green-600",
    stats: "8 agents · Gemini AI",
  },
  {
    id: "github",
    path: "/github",
    icon: Github,
    accent: "amber",
    badge: "Git",
    title: "GitHub Push",
    tagline: "Push any folder to GitHub",
    desc: "Login with a Personal Access Token, pick or paste a repo URL, and push your local folder to GitHub — no terminal needed. Auto-initialises git, stages all files, commits with a timestamp, and handles rejected pushes gracefully.",
    features: ["PAT auth (no browser)", "Auto git init", "Force push fallback", "No terminal needed"],
    gradient: "from-amber-600/20 to-orange-600/10",
    border: "hover:border-amber-500/40",
    glow: "tool-card-amber",
    ringColor: "text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    btnGrad: "from-amber-600 to-orange-600",
    stats: "1-click · Windows + Linux",
  },
];

const STEPS = [
  { n:"01", title:"Pick a tool", body:"Choose from Audit, Optimizer, Cloner, or GitHub Push from the home page." },
  { n:"02", title:"Enter your input", body:"Paste a URL, upload files, or enter repo details — each wizard guides you step-by-step." },
  { n:"03", title:"Let AI work", body:"Our backend crawls, optimises, or builds pages using Gemini AI and Google PageSpeed APIs." },
  { n:"04", title:"Download & ship", body:"Get reports, download zipped pages, or push to GitHub — all from your browser." },
];

const STATS = [
  { value:"27",  label:"SEO checks per page", icon: Shield },
  { value:"15+", label:"HTML auto-fixes",      icon: Zap    },
  { value:"8",   label:"AI pipeline agents",   icon: Layers },
  { value:"∞",   label:"Pages you can audit",  icon: Globe  },
];

export default function Home() {
  const toolsRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 grid-overlay">
        {/* Ambient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px] animate-drift-slow" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-teal-500/8  rounded-full blur-[100px] animate-drift-slower" />
          <div className="absolute bottom-1/4 left-1/2 w-[300px] h-[300px] bg-violet-600/6 rounded-full blur-[80px]  animate-pulse-slow" />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            4 tools · 1 platform · AI-powered
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.7, delay:0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-6 max-w-5xl"
        >
          Your complete
          <br />
          <span className="shimmer-text">web toolkit</span>
        </motion.h1>

        <motion.p
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.65, delay:0.2 }}
          className="text-white/50 text-lg md:text-xl max-w-2xl mb-10 font-light leading-relaxed"
        >
          Audit your site, optimize page speed, clone any design with AI, and push to GitHub —
          all from one unified platform. No terminal, no complexity.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6, delay:0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => toolsRef.current?.scrollIntoView({ behavior:"smooth" })}
            className="interactive group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-teal-500 transition-all shadow-lg hover:shadow-indigo-500/30"
          >
            Explore Tools
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <Link
            to="/audit"
            className="interactive flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/25 text-sm font-medium transition-all"
          >
            <Search className="w-4 h-4" />
            Start Free Audit
          </Link>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:1.2, duration:0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/20 text-xs font-mono">scroll</span>
          <motion.div
            animate={{ y:[0,8,0] }}
            transition={{ repeat:Infinity, duration:1.8, ease:"easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div className="text-center">
                <s.icon className="w-5 h-5 text-indigo-400 mx-auto mb-3 opacity-60" />
                <div className="font-display text-4xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-white/40 text-xs">{s.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── TOOL CARDS ────────────────────────────────────────── */}
      <section ref={toolsRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <span className="text-indigo-400 text-xs font-mono uppercase tracking-widest">The Toolkit</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
              Four tools, one mission
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
              Each tool is a standalone wizard — pick one, run through the steps, get results.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TOOLS.map((tool, i) => (
              <ScrollReveal key={tool.id} delay={i * 0.1} scale>
                <div className={`
                  glass-card rounded-2xl p-7 transition-all duration-300 cursor-default
                  border border-white/8 ${tool.border} ${tool.glow}
                  bg-gradient-to-br ${tool.gradient}
                `}>
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.btnGrad} flex items-center justify-center shadow-lg`}>
                      <tool.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border ${tool.badgeBg}`}>
                      {tool.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`font-display text-2xl font-bold mb-1 ${tool.ringColor}`}>{tool.title}</h3>
                  <p className="text-white/80 text-sm font-medium mb-3">{tool.tagline}</p>
                  <p className="text-white/40 text-sm leading-relaxed mb-5">{tool.desc}</p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tool.features.map(f => (
                      <span key={f} className="flex items-center gap-1.5 text-[11px] text-white/50">
                        <CheckCircle className="w-3 h-3 text-white/30 shrink-0" />{f}
                      </span>
                    ))}
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/25">{tool.stats}</span>
                    <Link
                      to={tool.path}
                      className={`interactive group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${tool.btnGrad} text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg`}
                    >
                      Launch
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <span className="text-teal-400 text-xs font-mono uppercase tracking-widest">Process</span>
            <h2 className="font-display text-4xl font-bold text-white mt-3">How it works</h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <ScrollReveal key={i} delay={i * 0.1} direction="up">
                <div className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/15 to-transparent z-0" />
                  )}
                  <div className="relative z-10">
                    <div className="font-mono text-5xl font-bold text-white/5 mb-2">{s.n}</div>
                    <div className="w-8 h-px bg-gradient-to-r from-indigo-500 to-teal-500 mb-4" />
                    <h3 className="font-display text-lg font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-900/5 to-transparent" />
        </div>
        <ScrollReveal className="relative max-w-2xl mx-auto">
          <BarChart3 className="w-10 h-10 text-indigo-400 mx-auto mb-6 opacity-60" />
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to improve your site?
          </h2>
          <p className="text-white/40 mb-10 text-sm leading-relaxed">
            Start with a free SEO audit — no signup, no credit card. Just enter a URL.
          </p>
          <Link
            to="/audit"
            className="interactive inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-semibold text-base hover:from-indigo-500 hover:to-teal-500 transition-all shadow-xl hover:shadow-indigo-500/25"
          >
            Start Free Audit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="font-display text-sm font-semibold text-white/60">
              web<span className="text-indigo-400">team</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            {TOOLS.map(t => (
              <Link key={t.id} to={t.path} className="interactive text-xs text-white/30 hover:text-white/60 transition-colors">
                {t.title}
              </Link>
            ))}
          </div>
          <span className="text-white/20 text-xs font-mono">built by web-team</span>
        </div>
      </footer>
    </div>
  );
}
