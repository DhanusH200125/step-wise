'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard, CheckSquare, Repeat, Calendar, Zap,
  BarChart3, Bot, Sparkles, LogOut, User as UserIcon, ChevronRight,
  LineChart, Clock, RefreshCw
} from 'lucide-react';

// Configuration for sidebar navigation links and their associated icons
const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/dashboard/routines', icon: Repeat, label: 'Routines' },
  { href: '/dashboard/planner', icon: Calendar, label: 'Weekly Sprint' },
  { href: '/dashboard/now', icon: Zap, label: 'Smart Pick' },
  { href: '/dashboard/analytics', icon: LineChart, label: 'Analytics' },  
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { href: '/dashboard/activity', icon: Clock, label: 'Activity' },  
  { href: '/dashboard/chatbot', icon: Sparkles, label: 'Stepwise AI' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="h-full flex flex-col bg-surface border-r border-border backdrop-blur-xl">
      {/* Primary navigation links section */}
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
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3.5 py-2 rounded-xl text-sm font-bold text-text-muted hover:bg-notification10 hover:text-notification transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 " />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
