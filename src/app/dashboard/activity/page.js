'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  CirclePlus, SquarePen, CircleCheckBig, CircleX, CirclePlay,
  CalendarClock, CalendarPlus, CalendarCheck, CalendarX,
  Sparkles, LayoutDashboard, SlidersHorizontal,
  UserRoundPlus, LogIn, Download, Filter, X, Activity,
  AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';



const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Metadata for mapping action types to their corresponding visual labels, icons, and colors
const ACTION_META = {
  task_created: { label: 'Task Created', Icon: CirclePlus, color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  task_updated: { label: 'Task Updated', Icon: SquarePen, color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  task_completed: { label: 'Task Completed', Icon: CircleCheckBig, color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
  task_cancelled: { label: 'Task Cancelled', Icon: CircleX, color: 'bg-red-50 text-red-500', dot: 'bg-red-400' },
  task_started: { label: 'Task Started', Icon: CirclePlay, color: 'bg-violet-50 text-violet-600', dot: 'bg-violet-500' },
  task_rescheduled: { label: 'Task Rescheduled', Icon: CalendarClock, color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  routine_created: { label: 'Routine Created', Icon: CalendarPlus, color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  routine_updated: { label: 'Routine Updated', Icon: CalendarCheck, color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  routine_deleted: { label: 'Routine Deleted', Icon: CalendarX, color: 'bg-red-50 text-red-500', dot: 'bg-red-400' },
  plan_generated: { label: 'Plan Generated', Icon: Sparkles, color: 'bg-violet-50 text-violet-600', dot: 'bg-violet-500' },
  plan_modified: { label: 'Plan Modified', Icon: LayoutDashboard, color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  preferences_updated: { label: 'Preferences Updated', Icon: SlidersHorizontal, color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  user_registered: { label: 'Account Created', Icon: UserRoundPlus, color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
  user_login: { label: 'Logged In', Icon: LogIn, color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
};

const GROUPS = [
  { key: 'tasks', label: 'Tasks', types: ['task_created', 'task_updated', 'task_completed', 'task_cancelled', 'task_started', 'task_rescheduled'] },
  { key: 'routines', label: 'Routines', types: ['routine_created', 'routine_updated', 'routine_deleted'] },
  { key: 'planner', label: 'Planner', types: ['plan_generated', 'plan_modified'] },
  { key: 'account', label: 'Account', types: ['preferences_updated', 'user_registered', 'user_login'] },
];



function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Organizes a flat list of logs into a date-based structure for timeline rendering
function groupByDate(logs) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  logs.forEach(log => {
    const d = new Date(log.createdat);
    let label;
    if (d.toDateString() === today) label = 'Today';
    else if (d.toDateString() === yesterday) label = 'Yesterday';
    else label = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  });
  return Object.entries(groups);
}



function LogEntry({ log, isLast }) {
  const meta = ACTION_META[log.actiontype] ?? ACTION_META['task_updated'];
  const { Icon, color, dot } = meta;
  const hasEff = log.plannedduration && log.actualduration;
  const diff = hasEff ? Math.round((log.actualduration - log.plannedduration) / log.plannedduration * 100) : null;
  const effColor = diff === null ? '' : diff > 15 ? 'text-amber-600 bg-amber-50' : diff < -15 ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="flex gap-4 group">
      {/* Visual timeline connector and icon indicator */}
      <div className="flex flex-col items-center flex-shrink-0 w-9">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 z-10 ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1" />}
      </div>

      {/* Activity description and timestamp details */}
      <div className={`flex-1 min-w-0 pb-5 ${isLast ? '' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 leading-snug">
              {log.description}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {meta.label}
              </span>
              {hasEff && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${effColor}`}>
                  {log.plannedduration}m planned · {log.actualduration}m actual
                  {diff !== null && ` · ${diff > 0 ? '+' : ''}${diff}%`}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[11px] font-medium text-slate-400 tabular-nums">{fmtTime(log.createdat)}</p>
            <p className="text-[10px] text-slate-300 tabular-nums mt-0.5">{fmtRelative(log.createdat)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionType, setActionType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showFilters, setShowFilters] = useState(false);
  const LIMIT = 30;

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (actionType) params.append('actiontype', actionType);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      const res = await fetch(`/api/logs?${params}`, { credentials: 'include' });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); }
      catch { throw new Error(`Server returned HTML (status ${res.status}). Check /api/logs/route.js path.`); }
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setLogs(json.data ?? []);
      setPagination(json.pagination ?? { total: 0, pages: 1 });
      setPage(pg);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [actionType, fromDate, toDate]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  function clearFilters() { setActionType(''); setFromDate(''); setToDate(''); }

  function exportCSV() {
    const header = ['ID', 'Action', 'Task', 'Description', 'Planned (min)', 'Actual (min)', 'Date'];
    const rows = logs.map(l => [
      l.id, l.actiontype, l.tasktitle ?? '', l.description ?? '',
      l.plannedduration ?? '', l.actualduration ?? '',
      new Date(l.createdat).toLocaleString(),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const hasFilters = actionType || fromDate || toDate;
  const grouped = groupByDate(logs);

  const completedCount = logs.filter(l => l.actiontype === 'task_completed').length;
  const createdCount = logs.filter(l => l.actiontype === 'task_created').length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[860px] mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Page title and primary action controls */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Activity</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {loading ? '—' : `${pagination.total.toLocaleString()} total events`}
              {hasFilters && <span className="text-slate-400"> · filtered</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border transition-all ${showFilters || hasFilters
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}>
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 ml-0.5" />}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-all">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Collapsible search and filter panel */}
        {showFilters && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              { }
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                <div className="space-y-1">
                  <button onClick={() => setActionType('')}
                    className={`w-full text-left px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${!actionType ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}>All categories</button>
                  {GROUPS.map(g => (
                    <button key={g.key}
                      onClick={() => setActionType(g.types[0])}
                      className={`w-full text-left px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${g.types.includes(actionType) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}>{g.label}</button>
                  ))}
                </div>
              </div>

              { }
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Action</label>
                <select value={actionType} onChange={e => setActionType(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700">
                  <option value="">All actions</option>
                  {Object.entries(ACTION_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              { }
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">From</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">To</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700" />
                </div>
              </div>
            </div>

            {hasFilters && (
              <div className="pt-1 border-t border-slate-200">
                <button onClick={clearFilters}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        { }
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Real-time event timeline grouped by date */}
        <div>
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, gi) => (
                <div key={gi}>
                  <div className="animate-pulse h-3.5 bg-slate-100 rounded w-24 mb-4" />
                  <div className="space-y-5">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="animate-pulse w-8 h-8 bg-slate-100 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="animate-pulse h-3.5 bg-slate-100 rounded w-2/3" />
                          <div className="animate-pulse h-3 bg-slate-100 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Activity className="w-10 h-10 mb-3 opacity-25" />
              <p className="text-[14px] font-semibold text-slate-600 mb-1">No activity found</p>
              <p className="text-[12px]">
                {hasFilters ? 'Try clearing your filters.' : 'Start using Stepwise to see your activity here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([dateLabel, entries]) => (
                <div key={dateLabel}>
                  {/* Timeline date header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{dateLabel}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[11px] font-medium text-slate-300">{entries.length} {entries.length === 1 ? 'event' : 'events'}</span>
                  </div>
                  {/* List of activity entries for this specific date */}
                  <div>
                    {entries.map((log, i) => (
                      <LogEntry key={log.id} log={log} isLast={i === entries.length - 1} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity history pagination controls */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                const pg = pagination.pages <= 5 ? i + 1
                  : page <= 3 ? i + 1
                    : page >= pagination.pages - 2 ? pagination.pages - 4 + i
                      : page - 2 + i;
                return (
                  <button key={pg} onClick={() => fetchLogs(pg)}
                    className={`w-9 h-9 text-[12px] font-semibold rounded-lg transition-all ${pg === page ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}>{pg}</button>
                );
              })}
            </div>
            <button onClick={() => fetchLogs(page + 1)} disabled={page >= pagination.pages}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
