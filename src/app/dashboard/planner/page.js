'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Zap, Calendar, Clock, Lock, Unlock,
  AlertCircle, TrendingUp, Target, Star, BarChart2, X,
} from 'lucide-react';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DOMAIN = {
  'Work/Study':     { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    short: 'Work'   },
  'Personal Growth':{ bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', short: 'Growth' },
  'Health':         { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    short: 'Health' },
  'Life Admin':     { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   short: 'Admin'  },
};
const domainMeta = (d) => DOMAIN[d] || DOMAIN['Life Admin'];

const PRIORITY = {
  high:   { label: 'P3', bg: 'bg-red-50',    text: 'text-red-600'   },
  medium: { label: 'P2', bg: 'bg-amber-50',  text: 'text-amber-600' },
  low:    { label: 'P1', bg: 'bg-slate-100', text: 'text-slate-500' },
  
  3: { label: 'P3', bg: 'bg-red-50',    text: 'text-red-600'   },
  2: { label: 'P2', bg: 'bg-amber-50',  text: 'text-amber-600' },
  1: { label: 'P1', bg: 'bg-slate-100', text: 'text-slate-500' },
};
const priorityMeta = (p) => PRIORITY[p] || PRIORITY['medium'];




function getMondayStr() {
  const d = new Date();
  const day = d.getDay(); 
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`; 
}


function getWeekDates(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const [y, mo, da] = mondayStr.split('-').map(Number);
    const d = new Date(y, mo - 1, da + i); 
    return d;
  });
}

function fmt(min) {
  if (!min) return '—';
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min}m`;
}


function fmtTime(iso) {
  if (!iso) return '';
  const timePart = iso.substring(11, 16); 
  const [h, m] = timePart.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}



export default function PlannerPage() {
  const [plan, setPlan]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState('');
  const [selectedTask, setselectedTask] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lockingId, setLockingId]     = useState(null);

  
  const weekStartStr = getMondayStr();
  const weekDates    = getWeekDates(weekStartStr);
  const todayIdx     = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/planner?week_start=${weekStartStr}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setPlan(json.data ?? json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [weekStartStr]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    setError('');
    setConfirmOpen(false);
    try {
      const res  = await fetch('/api/planner', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekstartdate: weekStartStr }),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || 'Generation failed');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleLock(scheduleId) {
    if (!scheduleId) return;
    setLockingId(scheduleId);
    setPlan(prev => prev ? {
      ...prev,
      scheduled_tasks: prev.scheduled_tasks.map(t =>
        t.scheduleId === scheduleId ? { ...t, locked: !t.locked } : t
      ),
    } : prev);
    try {
      const res = await fetch(`/api/planner/lock/${scheduleId}`, { method: 'PUT', credentials: 'include' });
      if (!res.ok) throw new Error();
    } catch {
      await load();
    } finally {
      setLockingId(null);
    }
    if (selectedTask?.scheduleId === scheduleId) {
      setselectedTask(prev => prev ? { ...prev, locked: !prev.locked } : null);
    }
  }

  async function toggleDone(scheduleId) {
    if (!scheduleId) return;
    setPlan(prev => prev ? {
      ...prev,
      scheduled_tasks: prev.scheduled_tasks.map(t =>
        t.scheduleId === scheduleId ? { ...t, status: t.status === 'completed' ? 'scheduled' : 'completed' } : t
      ),
    } : prev);
    try {
      const res = await fetch(`/api/planner/done/${scheduleId}`, { method: 'PUT', credentials: 'include' });
      if (!res.ok) throw new Error();
    } catch {
      await load();
    }
    if (selectedTask?.scheduleId === scheduleId) {
      setselectedTask(prev => prev ? { ...prev, status: prev.status === 'completed' ? 'scheduled' : 'completed' } : null);
    }
  }

  const tasks = plan?.scheduled_tasks ?? [];

  
  const tasksByDay = Array.from({ length: 7 }, () => []);
  tasks.forEach(task => {
    const slot = task.scheduledSlot || task.scheduled_slot;
    if (!slot) return;
    const slotDateStr = slot.substring(0, 10); 
    const idx = weekDates.findIndex(d => {
      const y  = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}` === slotDateStr;
    });
    if (idx !== -1) tasksByDay[idx].push(task);
  });

  const capMins   = plan?.capacity_minutes ?? 0;
  const capHours  = Math.round(capMins / 60 * 10) / 10;
  const plannedMin = tasks.reduce((s, t) => s + (t.duration || 0), 0);
  const plannedH  = Math.round(plannedMin / 60 * 10) / 10;
  const utilPct   = capMins > 0 ? Math.round(plannedMin / capMins * 100) : 0;
  const unscheduled = plan?.unscheduled ?? [];
  const lockedCnt = tasks.filter(t => t.locked).length;
  const utilColor = utilPct > 95 ? 'bg-red-500' : utilPct > 70 ? 'bg-emerald-500' : 'bg-slate-900';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Header section with week range and generation control */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Weekly Sprint</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {`${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${MONTHS[weekDates[6].getMonth()]} ${weekDates[6].getDate()}`}
              {tasks.length > 0 && ` · ${tasks.length} task${tasks.length !== 1 ? 's' : ''} planned`}
              {lockedCnt > 0 && ` · ${lockedCnt} locked`}
            </p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={generating}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Capacity utilization summary card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Sprint Capacity</h2>
               
              </div>
            </div>
            {!loading && tasks.length > 0 && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg
                ${utilPct > 95 ? 'bg-red-100 text-red-700' : utilPct > 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}>
                <TrendingUp className="w-3 h-3" /> {utilPct}% utilized
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/5" />
                  <div className="h-7 bg-slate-200 rounded w-2/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Capacity', val: `${capHours}h`,      Icon: Calendar,     color: 'bg-slate-100 text-slate-600'   },
                  { label: 'Hours Planned',  val: `${plannedH}h`,      Icon: Clock,        color: 'bg-blue-50 text-blue-600'      },
                  { label: 'Scheduled',      val: tasks.length,        Icon: Target,       color: 'bg-emerald-50 text-emerald-600'},
                  { label: 'Unscheduled',    val: unscheduled.length,  Icon: AlertCircle,  color: unscheduled.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400' },
                ].map(({ label, val, Icon, color }) => (
                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[12px] font-medium text-slate-500">{label}</p>
                    </div>
                    <p className="text-xl font-semibold text-slate-900">{val}</p>
                  </div>
                ))}
              </div>

              {tasks.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium text-slate-800">Capacity Utilization</p>
                    <span className="text-[13px] font-semibold text-slate-800">{plannedH}h / {capHours}h</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${utilColor}`}
                      style={{ width: `${Math.min(100, utilPct)}%` }}
                    />
                  </div>
                  {utilPct > 95 && (
                    <p className="text-[11px] text-red-600 font-medium mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Sprint is over capacity — consider moving low-priority tasks.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly schedule grid with daily columns */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {WEEK_DAYS.map(d => (
              <div key={d} className="rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="h-11 bg-slate-100" />
                <div className="p-2 space-y-2">
                  {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">No plan for this week</h3>
            <p className="text-[13px] text-slate-500 max-w-xs mb-6">
              Generate a smart weekly plan using your tasks, routines, and available capacity.
            </p>
            <button
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Generate Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDates.map((date, i) => {
              const dayTasks = tasksByDay[i] || [];
              const isToday  = i === todayIdx;
              const dayMins  = dayTasks.reduce((s, t) => s + (t.duration || 0), 0);

              return (
                <div key={i} className={`rounded-xl border overflow-hidden flex flex-col
                  ${isToday ? 'border-slate-900 shadow-sm' : 'border-slate-200'}`}>

                  <div className={`px-3 py-2.5 flex items-center justify-between border-b
                    ${isToday ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider
                        ${isToday ? 'text-white' : 'text-slate-700'}`}>
                        {WEEK_DAYS[i]}
                      </p>
                      <p className={`text-[10px] ${isToday ? 'text-slate-400' : 'text-slate-400'}`}>
                        {MONTHS[date.getMonth()]} {date.getDate()}
                      </p>
                    </div>
                    {dayMins > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md
                        ${isToday ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {fmt(dayMins)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 p-2 space-y-1.5 min-h-[80px]">
                    {dayTasks.length === 0 ? (
                      <div className="h-full min-h-[56px] flex items-center justify-center">
                        <span className="text-[10px] text-slate-300 font-medium">Free</span>
                      </div>
                    ) : (
                      dayTasks.map(task => {
                        const dm = domainMeta(task.domain);
                        const pm = priorityMeta(task.priority);
                        const isLocking   = lockingId === task.scheduleId;
                        const isCompleted = task.status === 'completed';

                        return (
                          <div
                            key={task.scheduleId}
                            onClick={() => setselectedTask(task)}
                            className={`relative group bg-white border rounded-lg p-2 cursor-pointer transition-all hover:shadow-sm
                              ${task.locked ? 'border-slate-800 ring-1 ring-slate-800 ring-inset' : 'border-slate-200 hover:border-slate-300'}
                              ${isCompleted ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${dm.bg} ${dm.text}`}>
                                <span className={`w-1 h-1 rounded-full inline-block ${dm.dot}`} />
                                {dm.short}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={e => { e.stopPropagation(); toggleDone(task.scheduleId); }}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                    ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-slate-400 text-transparent'}`}
                                >
                                  <span className="text-[10px] font-bold">✓</span>
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); toggleLock(task.scheduleId); }}
                                  className={`p-0.5 rounded transition-all ${isLocking ? 'opacity-40' : ''}
                                    ${task.locked ? 'text-slate-800 hover:text-slate-600' : 'text-slate-300 hover:text-slate-500'}`}
                                >
                                  {task.locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            </div>

                            <p className={`text-[11px] font-semibold leading-tight line-clamp-2 mb-1.5
                              ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {task.taskTitle}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${pm.bg} ${pm.text}`}>
                                  {pm.label}
                                </span>
                                <span className="text-[9px] text-slate-400">{fmt(task.duration)}</span>
                              </div>
                              {task.score != null && (
                                <span className="text-[9px] font-semibold text-slate-400">{task.score}%</span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1">{fmtTime(task.scheduledSlot)}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Warning section for unscheduled tasks */}
        {!loading && unscheduled.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">
                  Unscheduled Tasks
                  <span className="ml-2 text-[12px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    {unscheduled.length}
                  </span>
                </h2>
                <p className="text-[12px] text-slate-500">Couldn't fit in this week's capacity</p>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unscheduled.map(task => {
                const dm = domainMeta(task.domain);
                return (
                  <div key={task.taskId} className="flex items-start gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 ${dm.bg} ${dm.text}`}>
                      {dm.short}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{task.taskTitle}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{task.reason || 'No available slot'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Score breakdown modal for selected tasks */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setselectedTask(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-[16px] font-semibold text-slate-900">Score Breakdown</h2>
              <button onClick={() => setselectedTask(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <p className="text-[15px] font-semibold text-slate-900 leading-snug mb-2">{selectedTask.taskTitle}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => { const dm = domainMeta(selectedTask.domain); return (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${dm.bg} ${dm.text}`}>{dm.short}</span>
                  ); })()}
                  <span className="text-[11px] text-slate-500">{fmt(selectedTask.duration)}</span>
                  <span className="text-[11px] text-slate-500">{fmtTime(selectedTask.scheduledSlot)}</span>
                  {selectedTask.locked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Score</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Higher = scheduled earlier</p>
                </div>
                <p className="text-[28px] font-bold text-white leading-none">{selectedTask.score}%</p>
              </div>
              {selectedTask.scoreBreakdown && Object.keys(selectedTask.scoreBreakdown).length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Scoring Factors</p>
                  {[
                    { key: 'priority',       label: 'Priority',      weight: '35%', Icon: Star      },
                    { key: 'deadline',       label: 'Deadline',      weight: '30%', Icon: Target     },
                    { key: 'energy_match',   label: 'Energy Match',  weight: '20%', Icon: Zap        },
                    { key: 'domain_balance', label: 'Domain Balance',weight: '15%', Icon: BarChart2  },
                  ].map(({ key, label, weight, Icon }) => {
                    const pct = Math.round((selectedTask.scoreBreakdown[key] ?? 0) * 100);
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-slate-400" />
                            <span className="text-[12px] font-medium text-slate-700">{label}</span>
                            <span className="text-[10px] text-slate-400">({weight})</span>
                          </div>
                          <span className="text-[12px] font-semibold text-slate-700">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-1 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { toggleLock(selectedTask.scheduleId); setselectedTask(null); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    {selectedTask.locked ? <><Unlock className="w-3.5 h-3.5" /> Unlock</> : <><Lock className="w-3.5 h-3.5" /> Lock</>}
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedTask.status !== 'completed') {
                        toggleDone(selectedTask.scheduleId);
                      }
                      setselectedTask(null);
                    }} 
                    className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-generation confirmation modal dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5 text-slate-700" />
            </div>
            <h3 className="text-[17px] font-semibold text-slate-900 mb-1.5">Generate new plan?</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
              All <strong className="text-slate-700">unlocked</strong> tasks in this week will be replaced with a freshly scored schedule.{' '}
              {lockedCnt > 0 && <span className="text-slate-700 font-medium">{lockedCnt} locked task{lockedCnt !== 1 ? 's' : ''} will be preserved.</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={generate} disabled={generating} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}