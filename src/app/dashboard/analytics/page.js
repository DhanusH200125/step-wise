'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, BarChart2, TrendingUp,
  Target, Clock, Zap, AlertCircle, CheckCircle2,
} from 'lucide-react';



// Mapping of task domains to specific colors for visual consistency in charts
const DOMAIN_COLORS = {
  'Work/Study': '#3b82f6',
  'Personal Growth': '#10b981',
  'Health': '#f43f5e',
  'Life Admin': '#f59e0b',
};
const domainColor = (d) => DOMAIN_COLORS[d] || '#6b7280';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];



// Utility to calculate the Monday of the week for a given date
function getMonday(base = new Date()) {
  const d = new Date(base);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${MONTHS[monday.getMonth()]} ${monday.getDate()} – ${MONTHS[sunday.getMonth()]} ${sunday.getDate()}`;
}

function fmtDay(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}



function ChartSkeleton({ h = 220 }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
      <div className={`bg-slate-100 rounded-lg`} style={{ height: h }} />
    </div>
  );
}



function Panel({ title, sub, children, className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
        {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}



function NoData({ label = 'No data for this period' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-[12px] font-medium">{label}</p>
    </div>
  );
}



function ChartTip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2.5 text-[12px]">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-600">{p.name}: <strong>{p.value}{unit}</strong></span>
        </div>
      ))}
    </div>
  );
}



// Renders a circular progress ring showing the completion percentage
function CompletionRing({ rate = 0 }) {
  const data = [
    { name: 'Completed', value: rate },
    { name: 'Remaining', value: Math.max(0, 100 - rate) },
  ];
  const color = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={data} cx={55} cy={55} innerRadius={38} outerRadius={54}
              startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold text-slate-900">{Math.round(rate)}%</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Completed', color },
          { label: 'Remaining', color: '#e2e8f0' },
        ].map(({ label, color: c }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
            <span className="text-[12px] text-slate-600">{label}</span>
          </div>
        ))}
        <p className="text-[11px] text-slate-400 pt-1">
          {rate >= 70 ? '🎯 Strong week' : rate >= 40 ? '⚡ Room to improve' : '📈 Keep going'}
        </p>
      </div>
    </div>
  );
}



// Visualizes task completion density across the week in a heatmap grid
function Heatmap({ data = [] }) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 1;
  data.forEach(({ day, hour, completions }) => {
    const idx = day === 0 ? 6 : day - 1;
    if (idx >= 0 && idx < 7 && hour >= 0 && hour < 24) {
      grid[idx][hour] = completions;
      if (completions > max) max = completions;
    }
  });

  const SHOW_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex mb-1 ml-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center">
              {SHOW_HOURS.includes(h) && (
                <span className="text-[9px] text-slate-400 font-medium">{String(h).padStart(2, '0')}</span>
              )}
            </div>
          ))}
        </div>
        {WEEKDAYS_MON.map((day, di) => (
          <div key={day} className="flex items-center gap-1.5 mb-1">
            <span className="w-8 text-[10px] font-semibold text-slate-400 text-right flex-shrink-0">{day}</span>
            {grid[di].map((val, h) => {
              const opacity = val === 0 ? 0 : 0.12 + (val / max) * 0.88;
              return (
                <div
                  key={h}
                  title={val > 0 ? `${day} ${String(h).padStart(2, '0')}:00 — ${val} task${val !== 1 ? 's' : ''}` : undefined}
                  className="flex-1 rounded-sm"
                  style={{
                    height: 14,
                    background: val === 0 ? '#f8fafc' : `rgba(15, 23, 42, ${opacity})`,
                    border: '1px solid #e2e8f0',
                  }}
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 ml-10">
          <span className="text-[10px] text-slate-400">Less</span>
          {[0, 0.15, 0.35, 0.6, 0.85].map((o, i) => (
            <div key={i} className="w-3 h-3 rounded-sm border border-slate-200"
              style={{ background: o === 0 ? '#f8fafc' : `rgba(15,23,42,${o})` }} />
          ))}
          <span className="text-[10px] text-slate-400">More</span>
        </div>
      </div>
    </div>
  );
}



export default function AnalyticsPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const weekStr = weekStart.toISOString().split('T')[0];
  const isCurrentWeek = weekStr === getMonday().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics/dashboard?weekstart=${weekStr}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json.data ?? json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [weekStr]);

  useEffect(() => { load(); }, [load]);

  function prevWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; });
  }
  function nextWeek() {
    if (!isCurrentWeek) setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; });
  }

  
  const completionRate = data?.completionRate ?? data?.completionrate ?? 0;
  const domains = data?.domains ?? [];

  
  const dailyCompletion = (data?.dailycompletion ?? [])
    .filter(r => r.day)
    .map(r => ({ day: fmtDay(r.day), count: Number(r.count) }));

  const plannedVsActual = (data?.plannedvsactual ?? []).map(r => ({
    day: fmtDay(r.day),
    planned: Number(r.plannedhours),
    actual: Number(r.actualhours)
  }));

  const heatmap = data?.productivityheatmap ?? [];

  
  const growthRaw = data?.growthtrend ?? [];
  const growthData = growthRaw.map((r) => ({
    week: fmtDay(r.week),
    score: Number(r.score),
    completions: Number(r.completions),
  }));

  
  const capacityRaw = data?.capacityutilization ?? [];
  const capacityData = capacityRaw.map(r => ({
    week: fmtDay(r.week),
    completed: Number(r.completed),
    unused: Number(r.unused),
    planned: Number(r.planned),
  }));

  const totalTasksCompleted = dailyCompletion.reduce((s, d) => s + d.count, 0);
  const totalGrowthHours = (() => {
    const gd = domains.find(d => d.domain === 'Personal Growth');
    return gd ? Math.round(gd.hours * 10) / 10 : 0;
  })();

  const weeksWithData = capacityData.filter(r => r.planned > 0);
  const avgUtilization = weeksWithData.length
    ? Math.round(weeksWithData.reduce((s, r) => s + (r.completed / r.planned) * 100, 0) / weeksWithData.length)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Page header and week selection controls */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-[13px] text-slate-500 mt-1">Productivity insights and trends</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 flex-shrink-0">
            <button
              onClick={prevWeek}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-[13px] font-semibold text-slate-700 min-w-[160px] text-center">
              {loading ? '—' : fmtWeekRange(weekStart)}
            </span>
            <button
              onClick={nextWeek}
              disabled={isCurrentWeek}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* High-level productivity metrics overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Completion Rate', val: loading ? '—' : `${Math.round(completionRate)}%`, Icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', sub: 'Tasks scheduled → done' },
            { label: 'Tasks Completed', val: loading ? '—' : totalTasksCompleted, Icon: Target, color: 'bg-blue-50 text-blue-600', sub: 'This week' },
            { label: 'Growth Hours', val: loading ? '—' : `${totalGrowthHours}h`, Icon: TrendingUp, color: 'bg-violet-50 text-violet-600', sub: 'Personal growth domain' },
            { label: 'Avg Utilization', val: loading ? '—' : `${avgUtilization}%`, Icon: Zap, color: 'bg-amber-50 text-amber-600', sub: '8-week average' },
          ].map(({ label, val, Icon, color, sub }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[12px] font-medium text-slate-500">{label}</p>
              </div>
              <p className="text-[24px] font-bold text-slate-900 leading-none">{val}</p>
              <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Completion Rate" sub="Tasks completed vs scheduled this week">
            {loading ? <ChartSkeleton h={140} /> : <CompletionRing rate={completionRate} />}
          </Panel>

          <Panel title="Domain Workload" sub="Hours by domain this week">
            {loading ? <ChartSkeleton h={180} /> : domains.length === 0 ? <NoData /> : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={domains} cx="50%" cy="50%" outerRadius={72} dataKey="hours" nameKey="domain" strokeWidth={2} stroke="#fff">
                      {domains.map((d, i) => <Cell key={i} fill={domainColor(d.domain)} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const { domain, hours } = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow px-3 py-2 text-[12px]">
                          <p className="font-semibold text-slate-800">{domain}</p>
                          <p className="text-slate-500">{hours}h</p>
                        </div>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1 min-w-0">
                  {domains.map(d => (
                    <div key={d.domain} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: domainColor(d.domain) }} />
                      <span className="text-[12px] text-slate-600 truncate flex-1">{d.domain}</span>
                      <span className="text-[12px] font-semibold text-slate-900 flex-shrink-0">{d.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Daily Completion" sub="Tasks completed per day this week">
            {loading ? <ChartSkeleton /> : dailyCompletion.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyCompletion} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip unit=" tasks" />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name="Completed" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Planned vs Actual" sub="Hours planned vs actually worked per day">
            {loading ? <ChartSkeleton /> : plannedVsActual.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={plannedVsActual} barSize={12} barGap={3} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip unit="h" />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="planned" name="Planned" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        <Panel title="Productivity Heatmap" sub="Task completions by day and hour — last 4 weeks">
          {loading ? <ChartSkeleton h={160} /> : heatmap.length === 0 ? <NoData label="Complete tasks to see your productivity patterns" /> : (
            <Heatmap data={heatmap} />
          )}
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Growth Consistency" sub="Personal growth score trend — last 8 weeks">
            {loading ? <ChartSkeleton /> : growthData.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip content={<ChartTip unit="%" />} cursor={{ stroke: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="score" name="Growth score" stroke="#0f172a" strokeWidth={2} fill="url(#growthGrad)" dot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Capacity Utilization" sub="Completed vs unused planned tasks — last 8 weeks">
            {loading ? <ChartSkeleton /> : capacityData.length === 0 ? <NoData /> : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={capacityData} barSize={18} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="completed" name="Completed" stackId="a" fill="#0f172a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="unused" name="Unused" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3">
                  {[{ label: 'Completed', color: '#0f172a' }, { label: 'Unused', color: '#e2e8f0' }].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-slate-200" style={{ background: color }} />
                      <span className="text-[11px] text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>

      </div>
    </div>
  );
}