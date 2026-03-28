"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WorkHoursSetupModal from '@/components/WorkHoursSetupModal';

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth();
    const [showSetup, setShowSetup] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);


    useEffect(() => {
        if (loading || !user) return;
        async function checkSetup() {
            const res = await fetch('/api/auth/profile', { credentials: 'include' });
            const data = await res.json();
            const me = data.user ?? data;
            if (me.role === 'Professional' && !me.preferences?.workhourssetup) {
                setShowSetup(true);
            }
        }
        checkSetup();
    }, [loading, user]);
    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex flex-col h-screen bg-bg text-text">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-72 flex-shrink-0 hidden md:block">
                    <Sidebar />
                </aside>
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto p-4 sm:p-8">
                        {showSetup && (
                            <WorkHoursSetupModal onComplete={() => setShowSetup(false)} />
                        )}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}