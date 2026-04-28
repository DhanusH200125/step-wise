'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const TIMEZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Australia/Melbourne', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'US/Eastern', 'US/Central',
  'US/Mountain', 'US/Pacific',
];


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


// Converts stored HHMM string format to HH:MM for input compatibility
const toTimeInput = (val) => {
  if (!val) return '';
  const s = val.toString().replace(':', '').padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2)}`;
};


const fromTimeInput = (val) => val?.replace(':', '') || '';

// Initial state configuration for user preferences
const DEFAULT_FORM = {
  timezone: 'UTC',
  workingdays: [1, 2, 3, 4, 5],
  planningstartday: 1,
  defaulttaskduration: 30,
  energyprofile: { morning: 'medium', afternoon: 'medium', evening: 'medium' },
  notificationreminders: true,
  reminderleadtime: 15,
  planningreminder: true,
  retrospectivereminder: true,
  quiethoursstart: '2300',
  quiethoursend: '0600',
  growth_target_hours: 5,
};

export default function SettingsPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);


  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwData, setPwData] = useState({
    currentpassword: '',
    newpassword: '',
    confirmpassword: '',
  });


  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        // Fetch saved user preferences from the server
        const res = await fetch('/api/preferences', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch preferences');
        const data = await res.json();

        // Merge fetched preferences with the current form state
        const prefs = data.preferences ?? {};

        setFormData(prev => ({
          ...prev,
          ...prefs,
          workingdays: Array.isArray(prefs.workingdays) ? prefs.workingdays : prev.workingdays,
          energyprofile:
            prefs.energyprofile && typeof prefs.energyprofile === 'object'
              ? prefs.energyprofile
              : prev.energyprofile,
          growth_target_hours: data.growth_target_hours ?? prev.growth_target_hours,
        }));
      } catch (err) {
        console.warn('Preferences load failed, using defaults:', err.message);
        showToast({ type: 'error', message: 'Could not load saved preferences — showing defaults' });
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const toggleDay = (idx) => {
    setFormData(prev => {
      const days = prev.workingdays.includes(idx)
        ? prev.workingdays.filter(d => d !== idx)
        : [...prev.workingdays, idx].sort((a, b) => a - b);
      return { ...prev, workingdays: days };
    });
    setIsDirty(true);
  };

  const setEnergy = (period, level) => {
    setFormData(prev => ({
      ...prev,
      energyprofile: { ...prev.energyprofile, [period]: level },
    }));
    setIsDirty(true);
  };


  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Persist updated preferences to the server-side profile
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }
      setIsDirty(false);
      showToast({ type: 'success', message: 'Settings saved!' });
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };


  const handlePasswordSave = async () => {
    setPwError('');
    const { currentpassword, newpassword, confirmpassword } = pwData;
    // Ensure all password complexity and matching rules are met
    if (!currentpassword || !newpassword || !confirmpassword)
      return setPwError('All fields are required');
    if (newpassword !== confirmpassword)
      return setPwError('New passwords do not match');
    if (newpassword.length < 8)
      return setPwError('Password must be at least 8 characters');

    try {
      setSavingPw(true);
      // Submit password change request to the authentication API
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwData),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to change password');
      }
      setPwData({ currentpassword: '', newpassword: '', confirmpassword: '' });
      setShowPasswordSection(false);
      showToast({ type: 'success', message: 'Password updated!' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setSavingPw(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="spinner" />
      </div>
    );
  }

  const inputCls = `w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm
    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
    bg-white transition-all`;

  const selectCls = `${inputCls} appearance-none cursor-pointer`;


  return (
    <div className="max-w-2xl mx-auto pb-28">
      <PageHeader title="Settings" subtitle="Manage your preferences and account" />

      <form onSubmit={handleSave} className="space-y-5">

        {/* Core user profile and account identification section */}
        <Card padding="lg">
          <h2 className="text-lg font-bold text-neutral-900 mb-5">Profile</h2>

          {/* Read-only user profile avatar and metadata display */}
          <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100 mb-5">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center
              text-white font-black text-lg flex-shrink-0">
              {authUser?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{authUser?.name || '—'}</p>
              <p className="text-sm text-neutral-500">{authUser?.email || '—'}</p>
            </div>
            <div className="ml-auto">
              <Badge variant={authUser?.role === 'Student' ? 'status-scheduled' : 'domain-work'}>
                {authUser?.role || 'User'}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
              <input
                type="email"
                value={authUser?.email || ''}
                disabled
                className={`${inputCls} bg-neutral-50 text-neutral-400 cursor-not-allowed`}
              />
              <p className="text-xs text-neutral-400 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </Card>

        {/* Password update section with collapsible toggle */}
        <Card padding="lg">
          <button
            type="button"
            onClick={() => setShowPasswordSection(v => !v)}
            className="w-full flex items-center justify-between text-lg font-bold
              text-neutral-900 hover:text-primary transition-colors"
          >
            <span>Change Password</span>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform ${showPasswordSection ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPasswordSection && (
            <div className="mt-5 pt-5 border-t border-neutral-100 space-y-4">
              {pwError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                  {pwError}
                </div>
              )}
              {[
                { label: 'Current Password', key: 'currentpassword' },
                { label: 'New Password', key: 'newpassword' },
                { label: 'Confirm New Password', key: 'confirmpassword' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
                  <input
                    type="password"
                    value={pwData[key]}
                    onChange={e => setPwData(p => ({ ...p, [key]: e.target.value }))}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
              ))}
              <Button type="button" onClick={handlePasswordSave} loading={savingPw} className="w-full">
                Update Password
              </Button>
            </div>
          )}
        </Card>

        {/* Global planning preferences configuration */}
        <Card padding="lg">
          <h2 className="text-lg font-bold text-neutral-900 mb-5">Planning Preferences</h2>
          <div className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Time Zone</label>
              <select value={formData.timezone} onChange={e => set('timezone', e.target.value)} className={selectCls}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Working Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${formData.workingdays.includes(idx)
                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Week Starts On</label>
              <select
                value={formData.planningstartday}
                onChange={e => set('planningstartday', parseInt(e.target.value))}
                className={selectCls}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Default Task Duration
              </label>
              <select
                value={formData.defaulttaskduration}
                onChange={e => set('defaulttaskduration', parseInt(e.target.value))}
                className={selectCls}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
        </Card>

        {/* User energy profile customization */}
        <Card padding="lg">
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Energy Profile</h2>
          <p className="text-sm text-neutral-500 mb-5">
            When do you feel most energetic? This helps schedule tasks at the right time.
          </p>
          <div className="space-y-4">
            {[
              { key: 'morning', label: '🌅 Morning' },
              { key: 'afternoon', label: '☀️  Afternoon' },
              { key: 'evening', label: '🌙 Evening' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-28 text-sm font-medium text-neutral-700">{label}</span>
                <div className="flex gap-2 flex-1">
                  {['low', 'medium', 'high'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEnergy(key, level)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${formData.energyprofile?.[key] === level
                          ? 'bg-primary text-white shadow-sm shadow-primary/20'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Personal growth objectives configuration 
        <Card padding="lg">
          <h2 className="text-lg font-bold text-neutral-900 mb-5">Personal Growth</h2>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Weekly Target Hours
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={formData.growth_target_hours}
                onChange={e => set('growth_target_hours', parseFloat(e.target.value))}
                className={`${inputCls} w-28`}
              />
              <span className="text-sm text-neutral-500">hours / week on personal growth</span>
            </div>
          </div>
        </Card>
        */}
        {/* Notification and alert settings management */}
        <Card padding="lg">
          <h2 className="text-lg font-bold text-neutral-900 mb-5">Notifications</h2>
          <div className="space-y-5">

            {/* Toggle controls for various notification categories */}
            {[
              { key: 'notificationreminders', label: 'Task Reminders', desc: 'Get reminded before scheduled tasks' },
              { key: 'planningreminder', label: 'Weekly Planning Reminder', desc: 'Prompt to plan your week on Monday' },
              { key: 'retrospectivereminder', label: 'Retrospective Reminder', desc: 'Prompt to review your week on Sunday' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-1">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{label}</p>
                  <p className="text-xs text-neutral-500">{desc}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!!formData[key]}
                  onClick={() => set(key, !formData[key])}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
                    transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30
                    ${formData[key] ? 'bg-primary' : 'bg-neutral-200'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm
                    transform transition-transform ${formData[key] ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            ))}

            {/* Conditional control for reminder timing (only shown if reminders are active) */}
            {formData.notificationreminders && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Reminder Lead Time
                </label>
                <select
                  value={formData.reminderleadtime}
                  onChange={e => set('reminderleadtime', parseInt(e.target.value))}
                  className={selectCls}
                >
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>
            )}

            {/* Configuration for notification-free rest periods */}
            <div className="pt-3 border-t border-neutral-100">
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                🌙 Quiet Hours
                <span className="text-xs font-normal text-neutral-400 ml-2">
                  No notifications during this window
                </span>
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 mb-1 block">Start</label>
                  <input
                    type="time"
                    value={toTimeInput(formData.quiethoursstart)}
                    onChange={e => set('quiethoursstart', fromTimeInput(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 mb-1 block">End</label>
                  <input
                    type="time"
                    value={toTimeInput(formData.quiethoursend)}
                    onChange={e => set('quiethoursend', fromTimeInput(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Floating action bar for submitting profile changes */}
        <div className="fixed bottom-0 left-64 right-0 bg-white/90 backdrop-blur-md
          border-t border-neutral-200 px-8 py-4 flex items-center justify-between z-40">
          <p className={`text-xs font-medium text-amber-600 transition-opacity ${isDirty ? 'opacity-100' : 'opacity-0'}`}>
            You have unsaved changes
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => isDirty ? setShowUnsavedDialog(true) : router.push('/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </div>

      </form>

      <ConfirmDialog
        isOpen={showUnsavedDialog}
        onConfirm={() => { setShowUnsavedDialog(false); setIsDirty(false); router.push('/dashboard'); }}
        onCancel={() => setShowUnsavedDialog(false)}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave?"
        confirmText="Leave"
        confirmVariant="danger"
      />
    </div>
  );
}
