'use client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Settings, Zap } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-surface border-b border-border sticky top-0 z-40 flex items-center justify-between px-6 backdrop-blur-md bg-surface80">
      {/* Application logo and branding section */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary20">
          <Zap className="w-5 h-5 text-white fill-current" />
        </div>
        <h1 className="text-lg font-extrabold text-text tracking-tight">StepWise</h1>
      </div>

      {/* User profile and notification controls section */}
      <div className="flex items-center gap-2">
        {/* Real-time notification indicator component */}
        <NotificationBell />

        {/* User account settings navigation link */}
        <Link href="/dashboard/settings"
          className="p-2.5 bg-bg border border-border rounded-xl text-text-muted hover:text-primary hover:border-primary30 transition-all"
          aria-label="Settings">
          <Settings className="w-5 h-5" />
        </Link>

        <div
          className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-xl hover:border-primary30 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-primary10 border border-primary20 flex items-center justify-center text-primary font-black text-xs uppercase">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'US'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-extrabold text-text leading-none">
              {user?.name || 'User'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
