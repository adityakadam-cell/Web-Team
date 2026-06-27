import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Layers, Menu, X, Zap } from "lucide-react";

const TOOLS = [
  { path: "/audit",     label: "SEO Audit"      },
  { path: "/optimizer", label: "Page Optimizer"  },
  { path: "/cloner",    label: "Page Cloner"     },
  { path: "/github",    label: "GitHub Push"     },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "py-3 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5" : "py-5"
        }`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 1.02, 0.43, 1.01] }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group interactive">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/30 transition-shadow">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-white text-lg tracking-tight">
              web<span className="text-indigo-400">team</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {TOOLS.map((t) => (
              <Link
                key={t.path}
                to={t.path}
                className={`interactive px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === t.path
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/audit"
              className="interactive flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-teal-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-teal-500 transition-all duration-200 shadow-lg hover:shadow-indigo-500/25"
            >
              <Zap className="w-3.5 h-3.5" />
              Launch Tool
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="interactive md:hidden text-white/70 hover:text-white p-2"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#050505]/95 backdrop-blur-2xl pt-20 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <nav className="flex flex-col gap-2 mt-6">
              {TOOLS.map((t, i) => (
                <motion.div
                  key={t.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link
                    to={t.path}
                    className={`block px-5 py-4 rounded-xl text-base font-medium transition-all ${
                      location.pathname === t.path
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {t.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
