import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';
import EventoraLogo from '../components/EventoraLogo';
import MiniWheelPreview from '../components/MiniWheelPreview';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] text-[#171923] dark:text-[#F3F4F8] flex flex-col justify-between transition-colors duration-200">
      {/* 1. NAVIGATION BAR */}
      <nav className="w-full backdrop-blur-md bg-white/80 dark:bg-[#181B26]/80 border-b border-gray-200/80 dark:border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/">
            <EventoraLogo size="md" />
          </Link>



          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/home"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-sm font-semibold shadow-md shadow-[#635BFF]/25 hover:shadow-lg hover:shadow-[#635BFF]/35 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-[#635BFF] px-3 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-sm font-semibold shadow-md shadow-[#635BFF]/25 hover:shadow-lg hover:shadow-[#635BFF]/35 transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <main className="flex-1 flex items-center justify-center py-10 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[#635BFF] dark:text-[#8B85FF] text-xs font-semibold uppercase tracking-wider">
                <span>The Modern Random Selection Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.12]">
                Turn any list into a <span className="text-[#635BFF] dark:text-[#817AFE]">moment of excitement.</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Spin, shuffle, select, and create random groups in seconds. Import your spreadsheet, save your events, and keep every result organized in one place.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {user ? (
                  <Link
                    to="/home"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-base shadow-lg shadow-[#635BFF]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-base shadow-lg shadow-[#635BFF]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <span>Start Free with Eventora</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>

                    <Link
                      to="/login"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-[#181B26] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-base shadow-sm transition-all cursor-pointer"
                    >
                      <span>Sign In to Account</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Trust & Guarantee bullets */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>100% Fair & Random Selection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Excel & CSV Import Ready</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Free & Persistent History</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Spinning Wheel */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <MiniWheelPreview />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
