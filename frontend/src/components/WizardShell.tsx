import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface Step { label: string; }

interface Props {
  title: string;
  subtitle: string;
  accentColor: string;  // tailwind color name e.g. "teal" | "indigo" | "emerald" | "amber"
  steps: Step[];
  currentStep: number;  // 0-indexed
  children: ReactNode;
  backTo?: string;
}

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; badge: string }> = {
  teal:    { ring:"ring-teal-500",    bg:"bg-teal-500",    text:"text-teal-400",    badge:"bg-teal-500/10 text-teal-300 border-teal-500/20" },
  indigo:  { ring:"ring-indigo-500",  bg:"bg-indigo-500",  text:"text-indigo-400",  badge:"bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  emerald: { ring:"ring-emerald-500", bg:"bg-emerald-500", text:"text-emerald-400", badge:"bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  amber:   { ring:"ring-amber-500",   bg:"bg-amber-500",   text:"text-amber-400",   badge:"bg-amber-500/10 text-amber-300 border-amber-500/20" },
};

export default function WizardShell({ title, subtitle, accentColor, steps, currentStep, children, backTo="/" }: Props) {
  const c = COLOR_MAP[accentColor] ?? COLOR_MAP.indigo;

  return (
    <div className="min-h-screen bg-[#050505] grid-overlay pt-24 pb-16 px-4">
      {/* Ambient glow */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-10 blur-[100px] pointer-events-none
        ${accentColor==="teal"?"bg-teal-500":accentColor==="emerald"?"bg-emerald-500":accentColor==="amber"?"bg-amber-500":"bg-indigo-500"}`}
      />

      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link to={backTo} className="interactive inline-flex items-center gap-2 text-white/40 hover:text-white/80 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.5 }}
          className="mb-10"
        >
          <h1 className={`font-display text-3xl font-bold text-white mb-2 ${c.text}`}>{title}</h1>
          <p className="text-white/50 text-sm">{subtitle}</p>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {steps.map((s, i) => {
            const done    = i < currentStep;
            const active  = i === currentStep;
            return (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  done   ? `${c.bg} border-transparent text-white`
                  : active? `border ${c.ring} ${c.text} bg-white/5`
                           : "border-white/10 text-white/30"
                }`}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <span className="w-4 h-4 flex items-center justify-center font-mono text-[10px]">{i+1}</span>
                  }
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px w-6 ${done?"bg-white/30":"bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
