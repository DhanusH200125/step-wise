'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, X, Clock, AlertCircle,
         Calendar, TrendingUp, Zap, Info } from 'lucide-react';


const TYPE_CONFIG = {
  task_reminder:            { icon: Clock,        color: 'text-primary',      bg: 'bg-primary10' },
  planning_reminder:        { icon: Calendar,     color: 'text-gold',         bg: 'bg-gold10' },
  retrospective_reminder:   { icon: BarChart3 ?? TrendingUp, color: 'text-success', bg: 'bg-success10' },
  missed_task:              { icon: AlertCircle,  color: 'text-notification', bg: 'bg-notification10' },
  growth_nudge:             { icon: TrendingUp,   color: 'text-success',      bg: 'bg-success10' },
  system:                   { icon: Info,         color: 'text-text-muted',   bg: 'bg-surface-offset' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


export default function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifs] = useState([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const dropdownRef = useRef(null);
  const pollRef     = useRef(null);

  
  const fetchNotifs = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications?unreadOnly=false&limit=15', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setNotifs(json.data);
        setUnread(json.unread_count);
      }
    } catch (_) {}
  }, []);

  
  useEffect(() => {
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 60000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifs]);

  
  useEffect(() => { if (open) fetchNotifs(); }, [open, fetchNotifs]);

  
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  
  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}`, {
      method: 'PUT', credentials: 'include'
    }).catch(() => {});
  };

  
  const markAllRead = async () => {
    setLoading(true);
    await fetch('/api/notifications/all', { method: 'PUT', credentials: 'include' }).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    setLoading(false);
  };

  
  const clearRead = async () => {
    setLoading(true);
    await fetch('/api/notifications', { method: 'DELETE', credentials: 'include' }).catch(() => {});
    setNotifs(prev => prev.filter(n => !n.is_read));
    setLoading(false);
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="p-2.5 bg-bg border border-border rounded-xl text-text-muted hover:text-primary hover:border-primary30 transition-all relative"
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-notification text-white rounded-full border-2 border-bg flex items-center justify-center text-8px font-black px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface border border-border rounded-2xl shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-black text-text">Notifications</span>
              {unread > 0 && (
                <span className="text-10px font-black bg-primary text-white rounded-full px-2 py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} disabled={loading}
                  className="p-1.5 hover:bg-surface-offset rounded-lg transition-all text-text-muted hover:text-primary"
                  title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={clearRead} disabled={loading}
                className="p-1.5 hover:bg-surface-offset rounded-lg transition-all text-text-muted hover:text-notification"
                title="Clear read">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-surface-offset rounded-lg transition-all text-text-muted">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center px-4">
                <Bell className="w-8 h-8 text-text-faint mb-3" />
                <p className="text-sm font-bold text-text-muted">All caught up!</p>
                <p className="text-xs text-text-muted mt-1 opacity-70">
                  Reminders and alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all hover:bg-surface-offset
                      ${!notif.is_read ? 'bg-primary10' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!notif.is_read ? 'font-bold text-text' : 'text-text-muted'}`}>
                        {notif.message}
                      </p>
                      <p className="text-10px text-text-muted mt-1 font-medium">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
