'use client';
import { useState } from 'react';
import { Briefcase, Clock, ChevronDown } from 'lucide-react';

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export default function WorkHoursSetupModal({ onComplete }) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime]     = useState('18:00');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Toggle a day's selection status in the work week configuration
  function toggleDay(val) {
    setSelectedDays(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  }

  async function handleSubmit() {
    // Validate that at least one day and a valid time range are selected
    if (selectedDays.length === 0) { setError('Select at least one work day.'); return; }
    if (startTime >= endTime) { setError('End time must be after start time.'); return; }

    setSaving(true);
    setError('');
    try {
      // Persist work hours configuration to the database via the setup API
      const res = await fetch('/api/setup/workhours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime, days: selectedDays }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onComplete();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-[18px] font-semibold text-slate-900">Set Your Work Hours</h2>
          <p className="text-[13px] text-slate-500 mt-1">
            We'll automatically block your work time in routines every week.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-[13px] text-red-600">
              {error}
            </div>
          )}

          {/* Work Days */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Work Days
            </label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map(d => (
                <button key={d.value} type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all
                    ${selectedDays.includes(d.value)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Start Time
              </label>
              <input type="time" value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                End Time
              </label>
              <input type="time" value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all" />
            </div>
          </div>

          {/* Preview */}
          {startTime && endTime && startTime < endTime && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-[13px] text-blue-700 font-medium">
                {startTime} – {endTime} · {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''}/week
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onComplete}
            className="px-4 py-2 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-all">
            Skip for now
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
            {saving ? 'Setting up...' : 'Save Work Hours'}
          </button>
        </div>
      </div>
    </div>
  );
}