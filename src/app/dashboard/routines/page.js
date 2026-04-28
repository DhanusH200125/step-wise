'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Moon, Briefcase, BookOpen, User, MoreHorizontal,
  Clock, Zap, Calendar, ChevronDown, AlertCircle, LayoutGrid,
  TrendingUp, RotateCcw, Pencil, ChevronLeft, ChevronRight, RotateCw
} from 'lucide-react';


const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_META = {
  sleep: { label: 'Sleep', Icon: Moon, bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  work: { label: 'Work', Icon: Briefcase, bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  class: { label: 'Class', Icon: BookOpen, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  personal: { label: 'Personal', Icon: User, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  other: { label: 'Other', Icon: MoreHorizontal, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const emptyForm = { label: '', day_of_week: 1, start_time: '09:00', end_time: '10:00', category: 'work', repeat_weekly: true };

function getMondayOf(offsetWeeks = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff + offsetWeeks * 7);
  d.setHours(0,0,0,0);
  return d;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDatesFrom(monday) {
  return Array.from({length:7},(_,i)=>{
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const fmt = (min) => {
  const m = parseInt(min) || 0;
  if (m <= 0) return '0m';
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim() : `${m}m`;
};

const timeToMins = (t) => {
  if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const routineDuration = (r) => {
  const start = r.startTime || r.start_time;
  const end = r.endTime || r.end_time;
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
};


export default function RoutinesPage() {
  const [routines, setRoutines] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capLoading, setCapLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentMonday = getMondayOf(weekOffset);
  const weekDates = getWeekDatesFrom(currentMonday);
  const weekStartStr = dateToStr(currentMonday);
  const isCurrentWeek = weekOffset === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/routines?week_start=${weekStartStr}`, { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setRoutines(d.routines || []); }
    } finally { setLoading(false); }
  }, [weekStartStr]);

  const loadCap = useCallback(async () => {
    setCapLoading(true);
    try {
      const res = await fetch('/api/capacity', { credentials: 'include' });
      if (res.ok) setCapacity(await res.json());
    } finally { setCapLoading(false); }
  }, []);

  useEffect(() => { load(); loadCap(); }, [load, loadCap]);


  const byDay = Array.from({ length: 7 }, (_, i) => {
    const dayDate = weekDates[i];
    const dayOfWeek = dayDate.getDay(); // 0=Sun, 1=Mon … 6=Sat
    return routines
      .filter(r => {
        const dow = r.day_of_week ?? r.dayOfWeek;
        const start = r.start_time || r.startTime;
        const end = r.end_time || r.endTime;
        if (!start || !end) return false;
        if (r.weekDate || r.week_date) {
          const rd = new Date(r.weekDate || r.week_date);
          // Compare UTC date parts to avoid timezone shifts
          return rd.getUTCFullYear() === dayDate.getFullYear() &&
            rd.getUTCMonth() === dayDate.getMonth() &&
            rd.getUTCDate() === dayDate.getDate();
        }
        return dow === dayOfWeek;
      })
      .sort((a, b) => timeToMins(a.start_time || a.startTime || '') - timeToMins(b.start_time || b.startTime || ''));
  });

  function openCreate(dayIndex) {
    const date = weekDates[dayIndex];
    const dow = date ? date.getDay() : 1; // actual day_of_week (0=Sun)
    setEditing(null);
    setForm({ ...emptyForm, day_of_week: dow, week_date: date ? dateToStr(date) : weekStartStr });
    setError('');
    setShowModal(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      label: r.label,
      day_of_week: r.day_of_week ?? r.dayOfWeek,
      start_time: r.start_time ?? r.startTime,
      end_time: r.end_time ?? r.endTime,
      category: r.category || 'work'
    });
    setError(''); setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    const payload = {
      label: form.label?.trim(),
      day_of_week: parseInt(form.day_of_week, 10),
      start_time: form.start_time?.slice(0, 5),
      end_time: form.end_time?.slice(0, 5),
      category: form.category || 'other',
      repeat_weekly: form.repeat_weekly !== false,
      week_date: form.week_date || weekStartStr,
    };

    if (!payload.label || isNaN(payload.day_of_week) || !payload.start_time || !payload.end_time) {
      setError('Please fill in all required fields.'); return;
    }
    if (timeToMins(payload.end_time) <= timeToMins(payload.start_time)) {
      setError('End time must be after start time.'); return;
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/routines/${editing.id}` : '/api/routines', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
      setShowModal(false); await load(); await loadCap();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/routines/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setDeleteId(null); await load(); await loadCap();
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const weekLabel = (() => {
    const s = weekDates[0]; const e = weekDates[6];
    const ms = MONTHS_SHORT[s.getMonth()]; const me = MONTHS_SHORT[e.getMonth()];
    if (weekOffset === 0) return `This Week · ${ms} ${s.getDate()} – ${me} ${e.getDate()}`;
    if (weekOffset === -1) return `Last Week · ${ms} ${s.getDate()} – ${me} ${e.getDate()}`;
    if (weekOffset === 1) return `Next Week · ${ms} ${s.getDate()} – ${me} ${e.getDate()}`;
    return `${ms} ${s.getDate()} – ${me} ${e.getDate()}, ${e.getFullYear()}`;
  })();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Header section with page title and routine creation button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Weekly Routines</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {routines.length} block{routines.length !== 1 ? 's' : ''} · {Math.round(routines.reduce((s, r) => s + routineDuration(r), 0) / 60 * 10) / 10}h committed weekly
            </p>
          </div>
          <button onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all">
            <Plus className="w-4 h-4" /> Add Block
          </button>
        </div>

        {/* Capacity impact summary and dynamic statistics */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Capacity Impact</h2>
                <p className="text-[12px] text-slate-500">How your blocks shape available productive time</p>
              </div>
            </div>
            {!capLoading && capacity && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[12px] font-medium rounded-lg">
                <TrendingUp className="w-3 h-3" />
                {Math.round(capacity.realisticcapacity ?? 0)}h free
              </span>
            )}
          </div>

          {capLoading ? (
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-slate-50 rounded-lg p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : capacity ? (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Weekly', val: `${capacity.totalhours}h`, icon: Calendar, color: 'bg-slate-100 text-slate-600' },
                  { label: 'Fixed Blocks', val: `${Math.round(capacity.totalcommitted * 10) / 10}h`, icon: RotateCcw, color: 'bg-red-50 text-red-600' },
                  { label: 'Free Slots', val: `${Math.round(capacity.totalfree * 10) / 10}h`, icon: Clock, color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Realistic Capacity', val: `${Math.round(capacity.realisticcapacity * 10) / 10}h`, icon: Zap, color: 'bg-blue-50 text-blue-600' },
                ].map(({ label, val, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[12px] font-medium text-slate-500">{label}</p>
                    </div>
                    <p className="text-xl font-semibold text-slate-900">{val}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Daily Capacity Breakdown</p>
                <div className="grid grid-cols-7 gap-2">
                  {weekDates.map((date, i) => {
                    const cap = capacity.daycapacity?.[date.getDay()] ?? 0;
                    const maxDayCap = Math.max(...(capacity.daycapacity || [1]));
                    const pct = Math.min(100, Math.round((cap / maxDayCap) * 100));
                    const isToday = date.getFullYear() === todayDate.getFullYear() &&
                      date.getMonth() === todayDate.getMonth() &&
                      date.getDate() === todayDate.getDate();
                    return (
                      <div key={i}
                        className={`rounded-lg p-3 border transition-all ${isToday ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="flex flex-col gap-1 mb-2.5">
                          <span className={`text-[11px] font-semibold ${isToday ? 'text-slate-900' : 'text-slate-600'}`}>
                            {DAYS_SHORT[i]}
                          </span>
                          <span className={`text-[10px] ${isToday ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                            {MONTHS_SHORT[date.getMonth()]} {date.getDate()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className={`text-[11px] font-semibold ${isToday ? 'text-slate-900' : 'text-slate-700'}`}>
                          {Math.round(cap * 10) / 10}h
                        </p>
                        {isToday && (
                          <span className="inline-block mt-1 text-[9px] font-semibold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Today</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-medium text-slate-900">Weekly Load</p>
                  <span className="text-[13px] font-semibold text-slate-900">
                    {Math.round((capacity.totalcommitted / capacity.totalhours) * 100)}% committed
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, Math.round((capacity.totalcommitted / capacity.totalhours) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400">Confidence: {Math.round((capacity.realisonfactor ?? capacity.realismfactor ?? 0.7) * 100)}%</span>
                  <span className="text-[11px] text-slate-400">{Math.round(capacity.totalcommitted * 10) / 10}h / {capacity.totalhours}h</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[13px] text-slate-400">
              Add routines above to see your capacity impact.
            </div>
          )}
        </div>

        {/* Weekly schedule section with navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-900">Weekly Schedule</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                Today
              </button>
            )}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setWeekOffset(w => w - 1)}
                className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all border-r border-slate-200">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekly routines grid display with daily columns */}
        {loading ? (
          <div className="grid grid-cols-7 gap-3">
            {DAYS_SHORT.map(d => (
              <div key={d} className="bg-slate-50 rounded-xl p-3 animate-pulse space-y-2">
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-16 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDates.map((date, i) => {
              const dayRoutines = byDay[i] || [];
              const isToday = date.getFullYear() === todayDate.getFullYear() &&
                date.getMonth() === todayDate.getMonth() &&
                date.getDate() === todayDate.getDate();
              const dayMins = dayRoutines.reduce((s, r) => s + routineDuration(r), 0);
              return (
                <div key={i} className={`rounded-xl border flex flex-col overflow-hidden ${isToday ? 'border-slate-900' : 'border-slate-200'}`}>
                  <div className={`px-3 py-2.5 border-b flex items-center justify-between ${isToday ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-white' : 'text-slate-700'}`}>
                        {DAYS_SHORT[date.getDay()]}
                      </p>
                      <p className={`text-[10px] ${isToday ? 'text-slate-300' : 'text-slate-400'}`}>
                        {MONTHS_SHORT[date.getMonth()]} {date.getDate()}
                      </p>
                    </div>
                    {dayMins > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${isToday ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {fmt(dayMins)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 p-2 space-y-2 min-h-[80px]">
                    {dayRoutines.length === 0 ? (
                      <button onClick={() => openCreate(i)}
                        className="w-full h-full min-h-[60px] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg border border-dashed border-slate-200 transition-all">
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Add</span>
                      </button>
                    ) : (
                      <>
                        {dayRoutines.map(r => {
                          const meta = CATEGORY_META[r.category] || CATEGORY_META.other;
                          const Icon = meta.Icon;

                          const startTime = r.start_time || r.startTime || '';
                          const endTime = r.end_time || r.endTime || '';
                          const dur = routineDuration(r);

                          return (
                            <div key={r.id}
                              className="group relative bg-white border border-slate-200 rounded-lg p-2.5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                              onClick={() => openEdit(r)}>
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                                  <Icon className={`w-3 h-3 ${meta.text}`} />
                                </div>
                                <button onClick={e => { e.stopPropagation(); setDeleteId(r.id); }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:bg-red-50 rounded transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate mb-1.5">{r.label}</p>

                              {/* Routine block time range */}
                              {startTime && endTime && (
                                <p className="text-[10px] text-slate-500 font-medium truncate">
                                  {startTime.slice(0, 5)}–{endTime.slice(0, 5)}
                                </p>
                              )}

                              {/* Routine block duration tag */}
                              {dur > 0 && (
                                <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.text}`}>
                                  {fmt(dur)}
                                </span>
                              )}
                              {/* Badge for one-off (non-recurring) blocks */}
                              {(r.weekDate || r.week_date) && (
                                <span className="inline-block ml-1 mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600">
                                  One-off
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={() => openCreate(i)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg border border-dashed border-slate-200 transition-all">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Routine creation and editing modal dialog */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                <h2 className="text-[17px] font-semibold text-slate-900">{editing ? 'Edit Block' : 'Add Routine Block'}</h2>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">✕</button>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[13px] text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Block Label</label>
                  <input type="text" required value={form.label} placeholder="e.g. Deep Work, Morning Run…"
                    onChange={e => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Day</label>
                    <div className="relative">
                      <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: parseInt(e.target.value, 10) })}
                        className="w-full appearance-none px-3.5 pr-8 py-2.5 text-[14px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all">
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Category</label>
                    <div className="relative">
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        className="w-full appearance-none px-3.5 pr-8 py-2.5 text-[14px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all">
                        {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Start Time</label>
                    <input type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">End Time</label>
                    <input type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all" />
                  </div>
                </div>
                {form.start_time && form.end_time && timeToMins(form.end_time) > timeToMins(form.start_time) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[13px] text-slate-600 font-medium">
                      Duration: {fmt(timeToMins(form.end_time) - timeToMins(form.start_time))}
                    </span>
                    <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${CATEGORY_META[form.category]?.bg} ${CATEGORY_META[form.category]?.text}`}>
                      {CATEGORY_META[form.category]?.label}
                    </span>
                  </div>
                )}
                {!editing && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[13px] font-medium text-slate-700">Repeat every week</span>
                    </div>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, repeat_weekly: !f.repeat_weekly }))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        form.repeat_weekly ? 'bg-slate-900' : 'bg-slate-200'
                      }`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        form.repeat_weekly ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                )}
                {!editing && !form.repeat_weekly && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    This block will only appear for the week of {weekLabel.split('·')[1]?.trim() || weekStartStr}.
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Block'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation modal for routine block deletion */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-[17px] font-semibold text-slate-900 mb-1">Delete routine block?</h3>
              <p className="text-[13px] text-slate-500 mb-5">This will remove the block and recalculate your capacity.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleDelete}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all">Delete</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}