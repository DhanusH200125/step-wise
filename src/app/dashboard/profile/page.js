"use client";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    User, 
    Mail, 
    Shield, 
    Zap, 
    Calendar, 
    Clock, 
    Trash2, 
    Edit3, 
    Check, 
    X,
    AlertTriangle,
    Globe
} from "lucide-react";

export default function ProfilePage() {
    const { user, updateProfile, deleteAccount, logout } = useAuth();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        timezone: "UTC +5:30"
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                timezone: user.timezone || "UTC +5:30"
            });
        }
    }, [user]);

    if (!user) return null;

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await updateProfile(formData);
            setSuccess("Profile updated successfully!");
            setIsEditing(false);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("ARE YOU SURE? This will permanently delete your account and all your data. This action cannot be undone.")) {
            try {
                await deleteAccount();
            } catch (err) {
                setError(err.message || "Failed to delete account");
            }
        }
    };

    return (
        <div className="animate-fadeIn max-w-5xl mx-auto space-y-12">
            {}
            <div className="relative glass-panel rounded-[48px] p-10 sm:p-16 border border-border/40 bg-surface/30 backdrop-blur-3xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-10 transform hover:scale-105 transition-all duration-500">
                        <div className="absolute inset-0 bg-primary blur-3xl opacity-30 rounded-full"></div>
                        <div className="relative w-36 h-36 bg-gradient-to-br from-primary via-indigo-600 to-accent rounded-[48px] flex items-center justify-center text-5xl font-black text-white shadow-2xl border-4 border-white/20">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="text-center space-y-4">
                        {isEditing ? (
                            <input
                                className="text-4xl font-black text-text tracking-tight bg-surface2/50 border border-primary/30 rounded-2xl px-6 py-2 text-center focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-sans"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        ) : (
                            <h1 className="text-5xl font-black text-text tracking-tight">{user.name}</h1>
                        )}
                        
                        <div className="flex items-center justify-center gap-3">
                            <div className="px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                                {user.role}
                            </div>
                            <div className="px-5 py-2 bg-success/10 text-success border border-success/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                Active
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {success && (
                <div className="bg-success/5 border border-success/20 text-success p-5 rounded-3xl text-center animate-zoomIn flex items-center justify-center gap-3 font-bold text-sm">
                    <Check className="w-5 h-5" /> {success}
                </div>
            )}

            {error && (
                <div className="bg-danger/5 border border-danger/20 text-danger p-5 rounded-3xl text-center animate-zoomIn flex items-center justify-center gap-3 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {}
                <div className="glass-panel border border-border/40 rounded-[40px] p-8 sm:p-12 space-y-10">
                    <h2 className="text-2xl font-black text-text flex items-center gap-4 tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-primary border border-border/50">
                            <User className="w-5 h-5" />
                        </div>
                        Identity Details
                    </h2>
                    
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-60 flex items-center gap-2">
                                <User className="w-3 h-3" /> Full Name
                            </label>
                            {isEditing ? (
                                <input
                                    className="w-full bg-surface2/30 border border-primary/10 rounded-2xl px-6 py-4 text-text font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            ) : (
                                <div className="bg-surface2/30 border border-border rounded-x-2xl px-6 py-4 text-text font-bold text-sm">
                                    {user.name}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-60 flex items-center gap-2">
                                <Mail className="w-3 h-3" /> Email Vector
                            </label>
                            {isEditing ? (
                                <input
                                    className="w-full bg-surface2/30 border border-primary/10 rounded-2xl px-6 py-4 text-text font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            ) : (
                                <div className="bg-surface2/30 border border-border rounded-2xl px-6 py-4 text-text font-bold text-sm">
                                    {user.email}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-60 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Access Permissions
                            </label>
                            <div className="bg-primary/5 border border-primary/10 rounded-2xl px-6 py-4 text-primary font-black text-[10px] uppercase tracking-widest flex items-center justify-between">
                                Verified {user.role}
                                <Check className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {}
                <div className="glass-panel border border-border/40 rounded-[40px] p-8 sm:p-12 space-y-10">
                    <h2 className="text-2xl font-black text-text flex items-center gap-4 tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-accent border border-border/50">
                            <Globe className="w-5 h-5" />
                        </div>
                        Global Settings
                    </h2>

                    <div className="space-y-6">
                        <div className="p-6 bg-surface2/30 rounded-3xl border border-border/50 flex items-center justify-between group/item">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-surface group-hover/item:text-primary transition-colors">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-text-muted">Temporal Zone</span>
                            </div>
                            {isEditing ? (
                                <select
                                    className="bg-surface border border-primary/20 rounded-xl px-4 py-2 text-text font-black text-[10px] uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-primary/5"
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                >
                                    <option>UTC +5:30</option>
                                    <option>UTC +0:00</option>
                                    <option>UTC -5:00</option>
                                    <option>UTC +1:00</option>
                                </select>
                            ) : (
                                <span className="text-text font-black text-[10px] uppercase tracking-widest text-primary px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">{user.timezone || "UTC +5:30"}</span>
                            )}
                        </div>

                        <div className="p-6 bg-surface2/30 rounded-3xl border border-border/50 flex items-center justify-between group/item">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-surface group-hover/item:text-accent transition-colors">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-text-muted">Member Since</span>
                            </div>
                            <span className="text-text font-black text-[10px] uppercase tracking-widest">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric", day: "numeric" }) : "March 2025"}
                            </span>
                        </div>
                    </div>

                    <div className="pt-10 flex gap-4">
                        {isEditing ? (
                            <>
                                <button
                                    className="flex-1 py-5 bg-primary hover:bg-primary-hover text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    <Check className="w-4 h-4" />
                                    {saving ? "Synthesizing..." : "Commit Changes"}
                                </button>
                                <button
                                    className="px-8 py-5 bg-surface2 hover:bg-surface border border-border text-text font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            name: user.name,
                                            email: user.email,
                                            timezone: user.timezone || "UTC +5:30"
                                        });
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                    Abort
                                </button>
                            </>
                        ) : (
                            <button
                                className="w-full py-5 bg-surface2 hover:bg-surface border border-border text-text font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group/btn"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit3 className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                                Modify Identity Data
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {}
            <div className="glass-panel border-2 border-danger/10 bg-danger/5 rounded-[40px] p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8 group">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[24px] bg-danger/10 flex items-center justify-center text-danger group-hover:scale-110 transition-transform duration-500">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                        <h3 className="text-xl font-black text-danger tracking-tight uppercase tracking-widest">Self-Destruct Protocol</h3>
                        <p className="text-sm text-danger/60 font-bold">This action is irreversible and will purge all neural data.</p>
                    </div>
                </div>
                <button
                    className="w-full sm:w-auto px-10 py-5 bg-danger/10 text-danger border-2 border-danger/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-danger hover:text-white transition-all shadow-xl hover:shadow-danger/30 flex items-center justify-center gap-3 active:scale-95 group/del"
                    onClick={handleDelete}
                >
                    <Trash2 className="w-4 h-4 group-del:animate-bounce" />
                    Terminate Account
                </button>
            </div>
        </div>
    );
}
