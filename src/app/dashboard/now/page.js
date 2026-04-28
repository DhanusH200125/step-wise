'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, Zap, Clock, CheckCircle2, ChevronDown, ChevronUp,
  SkipForward, Play, Target, Star, AlertCircle, Sunrise,
  Sun, Sunset, Moon, Coffee,
} from 'lucide-react';

const DOMAIN = {
  'Work/Study': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Personal Growth': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Health': { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Life Admin': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};
const domainMeta = (d) => DOMAIN[d] || DOMAIN['Life Admin'];

const PRIORITY_LABEL = { 3: 'High', 2: 'Medium', 1: 'Low' };
const ENERGY_COLOR = { high: 'text-violet-600', medium: 'text-blue-600', low: 'text-emerald-600' };


const PERIOD_META = {
  morning: { label: 'Morning', sub: 'Peak focus window', Icon: Sunrise, accent: 'bg-amber-50   text-amber-700', dot: 'bg-amber-400' },
  afternoon: { label: 'Afternoon', sub: 'Steady work period', Icon: Sun, accent: 'bg-blue-50    text-blue-700', dot: 'bg-blue-400' },
  evening: { label: 'Evening', sub: 'Wind-down mode', Icon: Sunset, accent: 'bg-purple-50  text-purple-700', dot: 'bg-purple-400' },
  late_night: { label: 'Late Night', sub: 'Low-energy window', Icon: Moon, accent: 'bg-slate-100  text-slate-600', dot: 'bg-slate-400' },
};

const RANK_LABEL = ['Top Pick', '2nd Choice', '3rd Option'];
const RANK_STYLE = [
  'bg-slate-900 text-white',
  'bg-slate-100 text-slate-700',
  'bg-slate-50  text-slate-500',
];

function fmt(min) {
  if (!min) return '—';
  return min >= 60
    ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`
    : `${min}m`;
}

function fmtElapsed(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function fmtDeadline(deadline) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: 'Overdue', color: 'text-red-600 font-semibold' };
  if (days === 0) return { text: 'Due today', color: 'text-red-600 font-semibold' };
  if (days === 1) return { text: 'Due tomorrow', color: 'text-amber-600 font-semibold' };
  if (days <= 7) return { text: `Due in ${days}d`, color: 'text-amber-600' };
  return { text: `Due ${new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: 'text-slate-400' };
}

function ElapsedTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const base = Math.floor((Date.now() - startedAt) / 1000);
    setElapsed(base);
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span className="font-mono text-[13px] font-semibold text-white">{fmtElapsed(elapsed)}</span>;
}

function FactorBar({ label, value, weight }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-slate-600">{label}
          <span className="text-[11px] text-slate-400 ml-1">({weight})</span>
        </span>
        <span className="text-[12px] font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function RecommendationCard({ task, rank, onStart, onSkip, activeTask, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);


  const taskId = task.taskid;
  const isActive = activeTask?.taskid == taskId;

  const dm = domainMeta(task.domain);
  const deadline = fmtDeadline(task.deadline);
  const rankStyle = RANK_STYLE[rank] ?? RANK_STYLE[2];

  async function handleStart() {
    setStarting(true);
    await onStart(task);
    setStarting(false);
  }

  async function handleComplete() {
    setCompleting(true);
    const elapsed = activeTask?.startedAt
      ? Math.floor((Date.now() - activeTask.startedAt) / 60000)
      : null;
    await onComplete(task, elapsed);
    setCompleting(false);
  }

  if (isActive) {
    return (
      <div className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-bold text-white uppercase tracking-wider">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <Clock className="w-3.5 h-3.5 text-white" />
            {activeTask?.startedAt && <ElapsedTimer startedAt={activeTask.startedAt} />}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${dm.bg} ${dm.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dm.dot}`} /> {task.domain}
              </span>
            </div>
            <h3 className="text-[18px] font-semibold text-slate-900 leading-snug">{task.title}</h3>
            <p className="text-[13px] text-slate-500 mt-1">
              {activeTask?.startedAt && (
                <>Started {new Date(activeTask.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</>
              )}
              {task.duration && ` · Est. ${fmt(task.duration)}`}
            </p>
          </div>
          <button onClick={handleComplete} disabled={completing}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-all">
            <CheckCircle2 className="w-4 h-4" />
            {completing ? 'Completing…' : 'Mark as Complete'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all
      ${rank === 0 ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}>

      <div className={`px-6 py-3 flex items-center justify-between border-b
        ${rank === 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white'}`}>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${rankStyle}`}>
          {RANK_LABEL[rank]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-400">Score</span>
          { }
          <span className={`text-[13px] font-bold ${rank === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
            {Math.round((task.nowscore ?? 0) * 100)}%
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${dm.bg} ${dm.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dm.dot}`} /> {task.domain}
            </span>
            {deadline && (
              <span className={`text-[11px] font-semibold ${deadline.color}`}>{deadline.text}</span>
            )}
          </div>
          <h3 className={`font-semibold text-slate-900 leading-snug ${rank === 0 ? 'text-[18px]' : 'text-[15px]'}`}>
            {task.title}
          </h3>
        </div>

        {task.explanation && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-100 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-slate-600 leading-relaxed">{task.explanation}</p>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          {task.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[12px] font-medium text-slate-600">{fmt(task.duration)}</span>
            </div>
          )}
          {task.energy && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span className={`text-[12px] font-semibold ${ENERGY_COLOR[task.energy?.toLowerCase()] ?? 'text-slate-500'}`}>
                {task.energy} energy
              </span>
            </div>
          )}
          {task.priority && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[12px] font-medium text-slate-600">
                {PRIORITY_LABEL[task.priority] ?? task.priority} priority
              </span>
            </div>
          )}
        </div>

        {task.factors && (
          <div>
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide scoring factors' : 'Why this task?'}
            </button>
            {expanded && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Scoring Factors</p>
                { }
                <FactorBar label="Deadline urgency" value={task.factors.deadlineboost} weight="35%" />
                <FactorBar label="Energy match" value={task.factors.energyfit} weight="25%" />
                <FactorBar label="Priority" value={task.factors.priority} weight="25%" />
                <FactorBar label="Domain balance" value={task.factors.domaindeficit} weight="15%" />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => onSkip(taskId)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-all">
            <SkipForward className="w-3.5 h-3.5" /> Skip
          </button>
          <button onClick={handleStart} disabled={starting || !!activeTask}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-all
              ${rank === 0 ? 'text-white bg-slate-900 hover:bg-slate-800' : 'text-white bg-slate-700 hover:bg-slate-600'}
              disabled:opacity-40`}>
            <Play className="w-3.5 h-3.5 fill-current" />
            {starting ? 'Starting…' : activeTask ? 'Another task active' : 'Start Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NowPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [completed, setCompleted] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/now', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      const d = json.data ?? json;
      setData(d);

      // Restore active task if one is in_progress
      const active = d.recommendations?.find(t => t.status === 'in_progress');
      if (active) {
        setActiveTask({
          taskid: Number(active.taskid),
          startedAt: active.startedAt ? new Date(active.startedAt).getTime() : Date.now()
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStart(task) {
    const id = task.taskid;
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
        credentials: 'include',
      });
      setActiveTask({ taskid: Number(id), startedAt: Date.now() });
    } catch (e) {
      setError('Failed to start task');
    }
  }

  async function handleComplete(task, elapsedMinutes) {
    const id = task.taskid;
    try {
      const body = { status: 'completed' };
      if (elapsedMinutes) body.actual_duration = elapsedMinutes;
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      setActiveTask(null);
      setCompleted(prev => [...prev, id]);
      await load();
    } catch (e) {
      setError('Failed to complete task');
    }
  }

  async function handleSkip(taskId) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: true }),
        credentials: 'include',
      });
      // Refresh recommendations to remove the skipped task
      await load();
    } catch (e) {
      setError('Failed to skip task');
    }
  }

  const allRecs = data?.recommendations ?? [];
  const visible = allRecs.filter(t => !completed.includes(t.taskid));


  const period = data?.currentperiod ?? 'morning';
  const pmeta = PERIOD_META[period] ?? PERIOD_META.morning;
  const PeriodIcon = pmeta.Icon;

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[680px] mx-auto px-6 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Smart Pick</h1>
            <p className="text-[13px] text-slate-500 mt-1">Your top picks for right now · {timeStr}</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        { }
        {!loading && (
          <div className={`flex items-center gap-4 px-5 py-4 rounded-xl border
            ${period === 'morning' ? 'bg-amber-50  border-amber-100' : ''}
            ${period === 'afternoon' ? 'bg-blue-50   border-blue-100' : ''}
            ${period === 'evening' ? 'bg-purple-50 border-purple-100' : ''}
            ${period === 'late_night' ? 'bg-slate-100 border-slate-200' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pmeta.accent}`}>
              <PeriodIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-900">{pmeta.label} Session</p>
              <p className="text-[12px] text-slate-500">{pmeta.sub}
                {data?.currentenergy && (
                  <span className="ml-2">· <span className={`font-semibold ${ENERGY_COLOR[data.currentenergy] ?? 'text-slate-500'}`}>
                    {data.currentenergy} energy
                  </span> based on your profile</span>
                )}
              </p>
            </div>
            {completed.length > 0 && (
              <div className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[12px] font-semibold text-emerald-700">{completed.length} done today</span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
                <div className="h-12 bg-slate-50 border-b border-slate-100" />
                <div className="px-6 py-5 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-10 bg-slate-50 rounded-lg" />
                  <div className="flex gap-2">
                    <div className="h-3 bg-slate-100 rounded w-16" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="h-10 bg-slate-100 rounded-lg w-20" />
                    <div className="h-10 bg-slate-900/10 rounded-lg flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              {completed.length > 0
                ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                : <Coffee className="w-6 h-6 text-slate-400" />}
            </div>
            {completed.length > 0 ? (
              <>
                <h3 className="text-[15px] font-semibold text-slate-900 mb-1">
                  Nice work! {completed.length} task{completed.length > 1 ? 's' : ''} done.
                </h3>
                <p className="text-[13px] text-slate-500 max-w-xs mb-6">
                  All your current picks are complete. Refresh to see new recommendations.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-[15px] font-semibold text-slate-900 mb-1">
                  No tasks right now
                </h3>
                <p className="text-[13px] text-slate-500 max-w-xs mb-6">
                  Add some tasks to your backlog or refresh to see new recommendations.
                </p>
              </>
            )}
            <button onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all">
              <RefreshCw className="w-4 h-4" /> Refresh Picks
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((task, i) => (
              <RecommendationCard
                key={task.taskid ?? `task-${i}`}
                task={task}
                rank={i}
                activeTask={activeTask}
                onStart={handleStart}
                onSkip={handleSkip}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}