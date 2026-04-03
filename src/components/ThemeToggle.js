"use client";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
    // Access current theme state and toggle function from context
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-2 p-2 rounded-xl bg-surface2/50 border border-border hover:border-primary/40 hover:bg-surface2 transition-all group overflow-hidden relative shadow-sm"
            aria-label="Toggle Theme"
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Dynamically render icon based on current active theme */}
                {theme === 'light' ? (
                    <Sun className="w-4 h-4 text-warning animate-fadeIn fill-current opacity-80" />
                ) : (
                    <Moon className="w-4 h-4 text-primary animate-fadeIn fill-current opacity-80" />
                )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-text transition-colors">
                {theme === 'light' ? 'Light' : 'Dark'}
            </span>
        </button>
    );
}
