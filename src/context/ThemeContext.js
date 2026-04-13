"use client";

import { createContext, useContext, useEffect, useState } from 'react';

// Context for managing the application's visual theme (light/dark mode)
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme] = useState('light'); 

    useEffect(() => {
        // Enforce light theme as the primary design system constraint
        const root = window.document.documentElement;
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }, []);

    

    return (
        <ThemeContext.Provider value={{ theme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
