"use client";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Zap, CheckCircle2, Clock, TrendingUp, Calendar,
    RotateCcw, BarChart3, ArrowUpRight,
} from "lucide-react";


export default function DashboardPage() {
    const { user } = useAuth();
    const [capacity, setCapacity] = useState(null);
    const [taskStats, setTaskStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const today = new Date();
                const day = today.getDay();
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
                weekStart.setHours(0, 0, 0, 0);
                const weekStartStr = weekStart.toISOString().split('T')[0];

                const [capRes, dashRes] = await Promise.all([
                    fetch("/api/capacity", { credentials: 'include' }),
                    fetch(`/api/analytics/dashboard?week_start=${weekStartStr}`, { credentials: 'include' }),
                ]);

                if (capRes.ok) {
                    const capData = await capRes.json();
                    const realisticCap = capData.realisticcapacity ?? 0;
                    const totalHours = capData.totalhours ?? 0;
                    const totalCommitted = capData.totalcommitted ?? 0;

                    setCapacity({
                        adjustedCapacityMinutes: Math.round(realisticCap * 60),
                        totalWeeklyMinutes: Math.round(totalHours * 60),
                        committedMinutes: Math.round(totalCommitted * 60),
                        realisticCapacityMinutes: Math.round(realisticCap * 60),
                    });
                }

                if (dashRes.ok) {
                    const dashData = await dashRes.json();
                    if (dashData.success && dashData.data) {
                        const d = dashData.data;
                        setTaskStats({
                            tasks_completed: d.completed ?? 0,
                            tasks_planned: d.pending ?? 0,
                            tasks_total: d.total ?? 0,
                            completion_rate: d.completionRate ?? 0,
                        });
                    }
                }
            } catch (e) {
                console.error("Dashboard Load Error:", e);
            } finally {
                setLoading(false);
            }
        }

        load();
        window.addEventListener("refresh-data", load);
        return () => window.removeEventListener("refresh-data", load);
    }, []);

    const hours = (min) => {
        if (!min || isNaN(min)) return '0m';
        return min >= 60
            ? `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ''}`.trim()
            : `${min}m`;
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    const today = new Date().toLocaleDateString("en-GB", {
        day: '2-digit', month: 'short', year: 'numeric', weekday: 'long',
    }).replace(/,/g, ' •');

    const loadPct = capacity && capacity.totalWeeklyMinutes > 0
        ? Math.min(100, Math.round((capacity.committedMinutes / capacity.totalWeeklyMinutes) * 100))
        : 0;



    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">
                            {greeting()}, {user?.name?.split(' ')[0] || 'there'}
                        </h1>
                        <p className="text-[13px] text-slate-500 mt-1">{today}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.dispatchEvent(new Event('refresh-data'))}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Refresh
                        </button>
                        <Link
                            href="/dashboard/reports"
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all"
                        >
                            <BarChart3 className="w-3.5 h-3.5" /> Reports
                        </Link>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Weekly Capacity', val: loading ? '—' : hours(capacity?.adjustedCapacityMinutes ?? 0), icon: Zap, bg: 'bg-blue-50', color: 'text-blue-600' },
                        { label: 'Completed', val: loading ? '—' : taskStats?.tasks_completed ?? 0, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
                        { label: 'Pending', val: loading ? '—' : taskStats?.tasks_planned ?? 0, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
                        { label: 'Completion Rate', val: loading ? '—' : `${taskStats?.completion_rate ?? 0}%`, icon: TrendingUp, bg: 'bg-violet-50', color: 'text-violet-600' },
                    ].map(({ label, val, icon: Icon, bg, color }) => (
                        <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all">
                            <div className="mb-4">
                                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                                    <Icon className={`w-4 h-4 ${color}`} />
                                </div>
                            </div>
                            <p className="text-[13px] text-slate-600 font-medium mb-1">{label}</p>
                            <p className="text-2xl font-semibold text-slate-900">{val}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-[15px] font-semibold text-slate-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: "New Task", desc: "Create backlog item", href: "/dashboard/tasks", icon: Zap },
                            { label: "Sprint Planner", desc: "Optimize workflow", href: "/dashboard/planner", icon: Calendar },
                            { label: "Routines", desc: "Focus blocks", href: "/dashboard/routines", icon: RotateCcw },
                            { label: "Analytics", desc: "View insights", href: "/dashboard/analytics", icon: TrendingUp },
                        ].map((action) => (
                            <Link
                                key={action.label}
                                href={action.href}
                                className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                            >
                                <div className="mb-3">
                                    <action.icon className="w-5 h-5 text-slate-600" />
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900 mb-0.5">{action.label}</h3>
                                <p className="text-[13px] text-slate-500">{action.desc}</p>
                                <ArrowUpRight className="absolute bottom-4 right-4 w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Capacity Overview */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>

                                <h2 className="text-[15px] font-semibold text-slate-900">Capacity Overview</h2>
                                <p className="text-[13px] text-slate-500 mt-0.5">Your weekly bandwidth breakdown</p>
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[13px] font-medium rounded-lg">
                                {loadPct}% Load
                            </div>
                        </div>
                    </div>

                    {capacity ? (
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { label: "Total Hours", val: hours(capacity.totalWeeklyMinutes), icon: Clock },
                                    { label: "Fixed Blocks", val: hours(capacity.committedMinutes), icon: Calendar },
                                    { label: "Free Capacity", val: hours(capacity.realisticCapacityMinutes), icon: Zap },
                                ].map(({ label, val, icon: Icon }) => (
                                    <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className="w-4 h-4 text-slate-600" />
                                            <p className="text-[13px] font-medium text-slate-600">{label}</p>
                                        </div>
                                        <p className="text-xl font-semibold text-slate-900">{val}</p>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ) : !loading && (
                        <div className="px-6 py-10 text-center text-[13px] text-slate-400">
                            Capacity data unavailable. Check your routines and preferences.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}