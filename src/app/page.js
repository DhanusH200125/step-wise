'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Zap, Calendar, BarChart3, CheckCircle2,
  TrendingUp, Clock, Target, ArrowRight,
  Shield, Layers, ChevronRight
} from 'lucide-react';



// Functional component for rendering a SVG line chart trend
function LineChart() {
  const pts = [22, 38, 30, 55, 42, 68, 58, 75, 62, 88, 78, 94]; // Sample data points for the trendline
  const W = 280, H = 90, P = 12;
  const max = Math.max(...pts);
  const xs = pts.map((_, i) => P + (i / (pts.length - 1)) * (W - 2 * P));
  const ys = pts.map(p => P + (1 - p / max) * (H - 2 * P));
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = line + ` L${xs[xs.length - 1].toFixed(1)},${(H - P).toFixed(1)} L${P},${(H - P).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg1)" />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => i % 3 === 0 && (
        <circle key={i} cx={x.toFixed(1)} cy={ys[i].toFixed(1)} r="3" fill="#3b82f6" />
      ))}
    </svg>
  );
}

// Functional component for rendering a circular donut chart with a percentage value
function DonutChart({ value = 82, color = '#10b981', label = 'Completed' }) {
  const r = 36, cx = 44, cy = 44, stroke = 9; // SVG circle geometry constants
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg viewBox="0 0 88 88" className="w-24 h-24 shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">{value}%</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="8" fill="#6b7280">{label}</text>
    </svg>
  );
}

// Functional component for rendering a vertical bar chart for daily activity
function BarChart() {
  const days = [ // Mock daily output data for visualization
    { d: 'M', v: 62 }, { d: 'T', v: 78 }, { d: 'W', v: 55 },
    { d: 'T', v: 91 }, { d: 'F', v: 70 }, { d: 'S', v: 38 }, { d: 'S', v: 28 },
  ];
  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-sm"
            style={{
              height: `${d.v}%`,
              backgroundColor: i === 3 ? '#10b981' : i >= 5 ? '#e5e7eb' : '#93c5fd',
              minHeight: '4px'
            }}
          />
          <span className="text-[9px] text-gray-400 font-medium">{d.d}</span>
        </div>
      ))}
    </div>
  );
}


// Configuration array for landing page feature highlights
const features = [
  {
    icon: Zap,
    color: 'bg-blue-50 text-blue-600',
    title: 'Capacity Engine',
    desc: 'Calculates your real available hours from 168/week minus routines, with an AI-tuned realism factor.'
  },
  {
    icon: Calendar,
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Weekly Sprint Planner',
    desc: 'Multi-factor scoring (priority, deadline, energy) auto-fills your week. Lock tasks to protect them.'
  },
  {
    icon: Target,
    color: 'bg-violet-50 text-violet-600',
    title: '"Smart Pick" Panel',
    desc: 'Context-aware top 3 task picks based on your current energy level, time of day, and deadlines.'
  },
  {
    icon: BarChart3,
    color: 'bg-orange-50 text-orange-600',
    title: 'Analytics & Reports',
    desc: 'Completion trends, domain balance, planned vs actual hours, and weekly retrospective Excels.'
  },
];

// Configuration array for onboarding/how-it-works steps
const steps = [
  { num: '01', title: 'Block Your Routines', desc: 'Add recurring commitments — sleep, work, classes. Stepwise maps your true free time.' },
  { num: '02', title: 'Build Your Backlog', desc: 'Add tasks with priority, deadline, energy level, and estimated duration.' },
  { num: '03', title: 'Generate Your Sprint', desc: 'One click scores and assigns tasks to your week. Adjust, lock, and go.' },
];


// Main landing page component
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Redirect authenticated users to the dashboard automatically
    if (!loading) {
      setAuthChecked(true);
      if (user) router.push('/dashboard');
    }
  }, [user, loading, router]);





  return (
    <div className="min-h-screen bg-white">

      { }
      {/* Navigation bar with branding and auth links */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">Stepwise</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link href="/register"
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>


      {/* Hero section with value proposition and CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-20 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">


          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
              Plan smarter.<br />
              <span className="text-blue-600">Execute with clarity.</span>
            </h1>
            <p className="text-base text-gray-600 leading-relaxed mb-6 max-w-md">
              Stepwise calculates your real weekly capacity, builds a scored task sprint,
              and keeps you focused — no guesswork, no overwhelm.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Start
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                Sign in
              </Link>
            </div>
            
          </div>

          { }
          {/* Interactive UI preview showing mock dashboard stats */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
            { }
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Free Hours', value: '38h', sub: 'this week', color: 'text-blue-600' },
                { label: 'Tasks Planned', value: '12', sub: '3 locked', color: 'text-violet-600' },
                { label: 'Completion', value: '87%', sub: '↑ vs last week', color: 'text-emerald-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            { }
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Productivity Trend</span>
                <span className="text-xs text-emerald-600 font-medium">+16% this month</span>
              </div>
              <div className="h-16">
                <LineChart />
              </div>
            </div>

            { }
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <DonutChart value={82} color="#10b981" label="Done" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">Task Rate</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">8 of 10 done</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Daily Output</p>
                <BarChart />
              </div>
            </div>
          </div>
        </div>
      </section>

      { }
      {/* Key platform metrics summary section */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '168', label: 'Hours analyzed weekly' },
            { value: '4', label: 'Domains tracked' },
            { value: '30min', label: 'Planning granularity' },
            { value: '0.7–0.95', label: 'AI realism factor' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      { }
      {/* Feature details grid section */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Everything you need to stay on track</h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Built around a single loop: know your capacity, plan your sprint, review your output.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${f.color}`}>
                <f.icon className="w-4.5 h-4.5 w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      { }
      {/* Detailed analytics and workload breakdown preview */}
      <section className="bg-gray-50 border-y border-gray-100 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

            { }
            <div className="space-y-4 order-2 lg:order-1">
              { }
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-800">Planned vs Actual Hours</p>
                  <span className="text-xs text-gray-400">Last 7 days</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { d: 'Mon', planned: 6, actual: 5.2 },
                    { d: 'Tue', planned: 5, actual: 4.8 },
                    { d: 'Wed', planned: 7, actual: 5.5 },
                    { d: 'Thu', planned: 6, actual: 6.1 },
                    { d: 'Fri', planned: 5, actual: 4.2 },
                  ].map(row => (
                    <div key={row.d}>
                      <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                        <span>{row.d}</span>
                        <span>{row.actual}h / {row.planned}h</span>
                      </div>
                      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-blue-200 rounded-full"
                          style={{ width: `${(row.planned / 8) * 100}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                          style={{ width: `${(row.actual / 8) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="w-3 h-2 bg-blue-200 rounded-sm" /> Planned
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="w-3 h-2 bg-blue-500 rounded-sm" /> Actual
                  </div>
                </div>
              </div>

              { }
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-800 mb-4">Domain Workload</p>
                <div className="space-y-3">
                  {[
                    { d: 'Work / Study', pct: 45, color: 'bg-blue-500' },
                    { d: 'Personal Growth', pct: 25, color: 'bg-violet-500' },
                    { d: 'Health', pct: 18, color: 'bg-emerald-500' },
                    { d: 'Life Admin', pct: 12, color: 'bg-orange-400' },
                  ].map(row => (
                    <div key={row.d}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{row.d}</span>
                        <span className="font-medium text-gray-700">{row.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            { }
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full mb-4">
                Analytics Dashboard
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                See exactly where your time goes
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">
                Seven built-in charts — completion rate, domain balance, daily output,
                planned vs actual, productivity heatmap, growth trend, and capacity utilization —
                so you always have a clear picture.
              </p>
              <ul className="space-y-2.5">
                {['Weekly retrospective reports', 'Excel export', 'Growth consistency tracking', 'Overload detection alerts'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      { }
      {/* Onboarding process explanation section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Up and running in minutes</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">Three steps from setup to a fully optimized week.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {s.num}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block w-px flex-1 bg-gray-200 mt-2" />
                )}
              </div>
              <div className="pb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      { }
      {/* Final call-to-action section */}
      <section className="bg-blue-600 py-14 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to plan your first sprint?</h2>
          <p className="text-blue-100 text-sm mb-6">Free to use. Takes 2 minutes to set up.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      { }
      {/* Page footer with quick links and branding */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Stepwise</span>
          </div>
          <p className="text-xs text-gray-400">Plan. Execute. Improve.</p>
          <div className="flex gap-4">
            <Link href="/login" className="text-xs text-gray-500 hover:text-gray-700">Sign in</Link>
            <Link href="/register" className="text-xs text-gray-500 hover:text-gray-700">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
