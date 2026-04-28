'use client';
import { useState, useEffect } from 'react';
import {
  Plus, Search, CheckCircle2, Pencil, Trash2, Clock, Zap,
  LayoutGrid, List as ListIcon, Calendar, ChevronDown, AlertCircle
} from 'lucide-react';

const DOMAINS = ['Work/Study', 'Personal Growth', 'Health', 'Life Admin'];
const PRIORITIES = [
  { val: 1, label: 'Low' },
  { val: 2, label: 'Medium' },
  { val: 3, label: 'High' }
];
const ENERGIES = ['low', 'medium', 'high'];
const FLEX = ['soft', 'hard'];
const STATUSES = ['All', 'pending', 'scheduled', 'in_progress', 'rescheduled', 'completed', 'cancelled'];

const emptyForm = {
  title: '',
  domain: 'Work/Study',
  priority: 2,
  deadline: '',
  duration: 30,
  energy: 'medium',
  flexibility: 'soft',
  status: 'pending'
};

const fmt = (min) => min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;

const priorityConfig = {
  1: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600' },
  2: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700' },
  3: { label: 'High', bg: 'bg-red-50', text: 'text-red-600' },
};

const statusConfig = {
  pending: { label: 'Unscheduled', dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-600' },
  scheduled: { label: 'Pending', dot: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400', pill: 'bg-red-50 text-red-600' },
  rescheduled: { label: 'Rescheduled', dot: 'bg-orange-400', pill: 'bg-orange-50 text-orange-700' },
};

const domainColor = {
  'Work/Study': 'bg-blue-50 text-blue-700',
  'Personal Growth': 'bg-violet-50 text-violet-700',
  'Health': 'bg-emerald-50 text-emerald-700',
  'Life Admin': 'bg-amber-50 text-amber-700',
};

const isOverdue = (t) =>
  t.deadline && t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.deadline) < new Date();

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('card');

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setTasks(d.tasks || []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadTasks();
    window.addEventListener('refresh-data', loadTasks);
    return () => window.removeEventListener('refresh-data', loadTasks);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(task) {
    if (!task?.id) return;
    setEditing(task);
    setForm({
      title: task.title,
      domain: task.domain,
      priority: task.priority,
      deadline: task.deadline
        ? new Date(task.deadline).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '',
      duration: task.duration,
      energy: task.energy,
      flexibility: task.flexibility,
      status: task.status
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(editing ? `/api/tasks/${editing.id}` : '/api/tasks', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          priority: Number(form.priority),
          duration: Number(form.duration),
          deadline: form.deadline ? `${form.deadline}T00:00:00+05:30` : null,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save task');
      }
      setShowModal(false);
      loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!id || !confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
    loadTasks();
  }

  async function handleComplete(task) {
    if (!task?.id) return;
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status: 'completed' }),
      credentials: 'include',
    });
    loadTasks();
  }

  const filtered = tasks.filter(t => {
    const matchStatus =
      filter === 'All' ||
      t.status === filter ||
      (filter === 'pending' && t.status === 'scheduled');
    const q = searchQuery.toLowerCase();
    return matchStatus && (t.title.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q));
  });

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'All' ? tasks.length : tasks.filter(t => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Header section with backlog title and creation button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Task Backlog</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {tasks.filter(t => t.status === 'completed').length} completed
            </p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {/* Search and status filtering controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search tasks or domains..." value={searchQuery} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all" />
          </div>
          <div className="relative">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none transition-all cursor-pointer">
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s === 'All'
                    ? `All (${counts.All})`
                    : s === 'pending'
                      ? `Unscheduled (${counts[s] ?? 0})`
                      : s === 'scheduled'
                        ? `Pending (${counts[s] ?? 0})`
                        : `${statusConfig[s]?.label || s} (${counts[s] ?? 0})`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode('card')} className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main task display area with loading and empty states */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-[14px]">No tasks found matching your criteria.</p>
          </div>
        ) : viewMode === 'card' ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(task => {
              const sc = statusConfig[task.status] || statusConfig.pending;
              const pc = priorityConfig[task.priority] || priorityConfig[1];
              const dc = domainColor[task.domain] || 'bg-slate-100 text-slate-600';
              const due = task.deadline
                ? new Date(task.deadline).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'Asia/Kolkata'
                })
                : null;
              return (
                <div key={task.id} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${dc}`}>{task.domain}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${pc.bg} ${pc.text}`}>{pc.label}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${sc.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">{task.title}</h3>
                  <div className="flex items-center gap-4 text-[12px] text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmt(task.duration)}</span>
                    <span className="flex items-center gap-1 capitalize"><Zap className="w-3.5 h-3.5" />{task.energy}</span>
                    {due && <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-500 font-bold' : ''}`}><Calendar className="w-3.5 h-3.5" />{due}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <button onClick={() => handleComplete(task)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </button>
                    )}
                    <button onClick={() => openEdit(task)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="ml-auto p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (

          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <table className="w-full text-[13px] border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600 w-[35%]">Task</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Domain</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Priority</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Duration</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Deadline</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(task => {
                  const p = priorityConfig[task.priority] || priorityConfig[1];
                  const s = statusConfig[task.status] || statusConfig.pending;
                  const overdue = isOverdue(task);
                  return (
                    <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${overdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 max-w-[300px]">
                        <div className="flex items-center gap-2">
                          {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                          <span className="font-medium text-slate-900 truncate block" title={task.title}>{task.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${domainColor[task.domain] || 'bg-slate-100 text-slate-600'}`}>
                          {task.domain}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${s.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${p.bg} ${p.text}`}>
                          {p.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmt(task.duration)}</span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : 'text-slate-600'}`}>
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            timeZone: 'Asia/Kolkata'
                          })
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {task.status !== 'completed' && task.status !== 'cancelled' && (
                            <button onClick={() => handleComplete(task)} className="p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(task)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Task creation and editing modal dialog */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                <h2 className="text-[17px] font-semibold text-slate-900">{editing ? 'Edit Task' : 'New Task'}</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[13px] text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Task Title</label>
                  <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Domain</label>
                    <select value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg">
                      {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Priority</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg">
                      <option value={1}>Low</option>
                      <option value={2}>Medium</option>
                      <option value={3}>High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Duration (min)</label>
                    <input type="number" min={5} value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Energy</label>
                    <select value={form.energy} onChange={e => setForm({ ...form, energy: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Flexibility</label>
                    <select value={form.flexibility} onChange={e => setForm({ ...form, flexibility: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg">
                      <option value="soft">Soft</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Deadline</label>
                    <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg" />
                  </div>
                </div>
                {editing && (
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="rescheduled">Rescheduled</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] border border-slate-200 rounded-lg">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] bg-slate-900 text-white rounded-lg disabled:opacity-50">
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}