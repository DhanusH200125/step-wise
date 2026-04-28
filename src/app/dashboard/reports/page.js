'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Star, Clock, AlertTriangle, BarChart2, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle2, Target, Zap, AlertCircle,
  FileText, RefreshCw,
} from 'lucide-react';



const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INSIGHT_CONFIG = {
  positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
};

const INSIGHT_ICONS = { star: Star, clock: Clock, alert: AlertTriangle, chart: BarChart2 };

const DOMAIN_COLORS = {
  'Work/Study': '#3b82f6', 'Personal Growth': '#10b981',
  'Health': '#f43f5e', 'Life Admin': '#f59e0b',
};



function parseField(field, fallback = []) {
  if (!field) return fallback;
  if (typeof field === 'string') {
    try { return JSON.parse(field); } catch { return fallback; }
  }
  return field;
}

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

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'N/A';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}



function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;
}



function EmptyState({ icon: Icon, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-[14px] font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-[12px] text-slate-400 max-w-xs">{sub}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}



function WeeklyReportTab() {
  const [weekStart, setWeekStart] = useState(() => getMonday());
  const [report, setReport] = useState(null);
  const [pastList, setPastList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const weekStr = weekStart.toISOString().split('T')[0];
  const isCurrentWeek = weekStr === getMonday().toISOString().split('T')[0];

  const loadReport = useCallback(async () => {
    setLoading(true); setError(''); setReport(null);
    try {
      const text = await (await fetch(`/api/reports?weekstart=${weekStr}`, { credentials: 'include' })).text();
      const json = JSON.parse(text);
      if (json.success && json.data && !Array.isArray(json.data)) setReport(json.data);
    } catch {  }
    finally { setLoading(false); }
  }, [weekStr]);

  const loadPastList = useCallback(async () => {
    try {
      const text = await (await fetch('/api/reports', { credentials: 'include' })).text();
      const json = JSON.parse(text);
      if (json.success) setPastList(json.data ?? []);
    } catch { }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);
  useEffect(() => { loadPastList(); }, [loadPastList]);

  async function generateReport() {
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekstartdate: weekStr }),
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (!res.ok) throw new Error(json.error || 'Failed to generate');
      setReport(json.data ?? json);
      loadPastList();
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  }

  
  const s = report?.metrics ?? {};

  
  const insights = parseField(report?.insights, []);
  const suggestions = parseField(report?.suggestions, []);
  const domainBreakdown = parseField(report?.domainBreakdown ?? report?.domainbreakdown, []);

  return (
    <div className="space-y-5">
      {}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
          <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-[13px] font-semibold text-slate-700 min-w-[160px] text-center">
            {fmtWeekRange(weekStart)}
          </span>
          <button onClick={() => { if (!isCurrentWeek) setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; }); }}
            disabled={isCurrentWeek}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={generateReport} disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-60">
          {generating
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating…</>
            : <><Sparkles className="w-3.5 h-3.5" /> {report ? 'Regenerate' : 'Generate Report'}</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-48" /><Skeleton className="h-48" />
          </div>
        </div>
      )}

      {!loading && !report && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={FileText}
            title="No report for this week"
            sub="Generate a report to see insights, suggestions, and a full domain breakdown for this period."
            action={
              <button onClick={generateReport} disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-60">
                <Sparkles className="w-3.5 h-3.5" /> Generate Report
              </button>
            }
          />
        </div>
      )}

      {!loading && report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Completion Rate', val: `${Math.round(s.completionRate ?? s.completionrate ?? 0)}%`, Icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Tasks Completed', val: s.tasksCompleted ?? s.taskscompleted ?? 0, Icon: Target, color: 'bg-blue-50 text-blue-600' },
              { label: 'Hours Planned', val: `${s.hoursPlanned ?? s.hoursplanned ?? 0}h`, Icon: Clock, color: 'bg-violet-50 text-violet-600' },
              { label: 'Hours Actual', val: `${s.hoursActual ?? s.hoursactual ?? 0}h`, Icon: Zap, color: 'bg-amber-50 text-amber-600' },
            ].map(({ label, val, Icon, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-[12px] font-medium text-slate-500">{label}</p>
                </div>
                <p className="text-[24px] font-bold text-slate-900 leading-none">{val}</p>
              </div>
            ))}
          </div>

          {insights.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[14px] font-semibold text-slate-900">Weekly Insights</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">Automatically generated from your activity</p>
              </div>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {insights.map((insight, i) => {
                  const cfg = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.info;
                  const InsightIcon = INSIGHT_ICONS[insight.icon] ?? BarChart2;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <InsightIcon className={`w-3.5 h-3.5 ${cfg.text}`} />
                      </div>
                      <p className={`text-[13px] font-medium leading-relaxed ${cfg.text}`}>{insight.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[14px] font-semibold text-slate-900">Suggestions</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">Actionable improvements for next week</p>
              </div>
              <div className="p-6">
                {suggestions.length === 0
                  ? <p className="text-[13px] text-slate-400 text-center py-6">No suggestions — great week!</p>
                  : <ol className="space-y-3">
                    {suggestions.map((sText, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[13px] text-slate-700 leading-relaxed">{sText}</p>
                      </li>
                    ))}
                  </ol>
                }
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[14px] font-semibold text-slate-900">Domain Breakdown</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">Tasks planned vs completed by category</p>
              </div>
              <div className="p-6 space-y-4">
                {domainBreakdown.length === 0
                  ? <p className="text-[13px] text-slate-400 text-center py-6">No domain data</p>
                  : domainBreakdown.map(d => {
                    const rate = d.planned > 0 ? Math.round(d.completed / d.planned * 100) : 0;
                    const color = DOMAIN_COLORS[d.domain] || '#6b7280';
                    return (
                      <div key={d.domain}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-[12px] font-semibold text-slate-800">{d.domain}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{d.completed}/{d.planned} tasks · {rate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </>
      )}

      {}
      {pastList.filter(r => r.weekstart || r.weekstartdate || r.week_start).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-[14px] font-semibold text-slate-900">Past Reports</h3>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {pastList.length} {pastList.length === 1 ? 'report' : 'reports'} saved
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastList.map((r, i) => {
              const ws = r.weekstart || r.weekstartdate || r.week_start;
              if (!ws) return null;

              const monday = getMonday(new Date(ws));
              if (isNaN(monday.getTime())) return null;

              
              const rate = Math.round(r.metrics?.completionrate ?? 0);
              const color = rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-red-500';

              return (
                <button
                  key={`${ws}-${i}`}
                  onClick={() => setWeekStart(monday)}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900 group-hover:text-slate-700">
                      {fmtWeekRange(monday)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Generated {fmtDate(r.createdat)}
                    </p>
                  </div>
                  <span className={`text-[18px] font-bold tabular-nums flex-shrink-0 ${color}`}>
                    {rate}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-6">
        {}
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-[13px] text-slate-500 mt-1">Weekly summaries and performance insights</p>
        </div>

        {}
        <WeeklyReportTab />
      </div>
    </div>
  );
}