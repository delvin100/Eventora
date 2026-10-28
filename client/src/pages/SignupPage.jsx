import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Zap, AlertCircle, GraduationCap, Briefcase, Gift, Heart } from 'lucide-react';
import EventoraLogo from '../components/EventoraLogo';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usageType, setUsageType] = useState('education');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const usageOptions = [
    { id: 'education', label: 'Education', icon: GraduationCap, desc: 'Students, classrooms, quizzes' },
    { id: 'team', label: 'Work & Teams', icon: Briefcase, desc: 'Agile standups, tasks, sprints' },
    { id: 'events', label: 'Events & Draws', icon: Gift, desc: 'Raffles, giveaways, contests' },
    { id: 'personal', label: 'Personal', icon: Heart, desc: 'Games, decisions, family fun' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const { error } = await signUp(email, password, displayName, usageType);
      if (error) {
        setErrorMsg(error.message || 'Failed to create account.');
      } else {
        navigate('/app');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block">
          <EventoraLogo size="lg" />
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create your Eventora account
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#635BFF] hover:text-[#5145E5]">
            Sign in to existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white dark:bg-[#181B26] py-8 px-6 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-200/80 dark:border-gray-800">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Your Name / Organization
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins or Math Dept"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
                />
              </div>
            </div>

            {/* Usage Intent */}
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                Primary Intended Use
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {usageOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = usageType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setUsageType(opt.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#635BFF] bg-indigo-50/70 dark:bg-indigo-950/40 text-[#635BFF] dark:text-[#8B85FF]'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141722] text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="font-semibold text-xs">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-sm shadow-md shadow-[#635BFF]/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <span>{loading ? 'Creating account...' : 'Complete & Launch Eventora'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
