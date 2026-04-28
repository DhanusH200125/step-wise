'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle'; import {
  LayoutDashboard, CheckSquare, Repeat, Calendar, Zap,
  BarChart3, Bot, LogOut, User as UserIcon, ChevronRight,
  LineChart, Clock, RefreshCw
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/dashboard/routines', icon: Repeat, label: 'Routines' },
  { href: '/dashboard/planner', icon: Calendar, label: 'Weekly Sprint' },
  { href: '/dashboard/now', icon: Zap, label: 'Do It Now' },
  { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },  
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { href: '/dashboard/activity', icon: Clock, label: 'Activity' },  
  { href: null, icon: Bot, label: 'Stepwise AI', isBotTrigger: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="h-full flex flex-col bg-surface border-r border-border backdrop-blur-xl">
      {}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary20">
          <Zap className="w-5 h-5 text-white fill-current" />
        </div>
        <div>
          <p className="text-sm font-black text-text tracking-tight">StepWise</p>
          <p className="text-9px font-bold text-text-muted uppercase tracking-widest opacity-60">
            {user?.role || 'Member'}
          </p>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, isBotTrigger }) => {
          const isActive = href ? (pathname === href || (href !== '/dashboard' && pathname.startsWith(href))) : false;

          const itemClasses = `flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-bold
            ${isActive
              ? 'bg-primary10 text-primary shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-text-muted dark:hover:bg-surface-offset dark:hover:text-text'
            }`;

          if (isBotTrigger) {
            return (
              <button
                key={label}
                className={itemClasses}
                onClick={() => window.dispatchEvent(new Event('toggle-chatbot'))}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          }

          return (
            <Link key={href} href={href} className={itemClasses}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link href="/dashboard/settings"
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-bold text-text-muted hover:bg-surface-offset hover:text-text transition-all">
          <div className="w-7 h-7 rounded-full bg-primary10 flex items-center justify-center text-primary font-black text-xs uppercase flex-shrink-0">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'US'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-text truncate">{user?.name || 'User'}</p>
            <p className="text-9px text-text-muted truncate">{user?.email}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3.5 py-2 rounded-xl text-sm font-bold text-text-muted hover:bg-notification10 hover:text-notification transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
