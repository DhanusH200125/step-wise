'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Context for managing global authentication state across the application
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      // Rehydrate user state from localStorage for immediate UI feedback
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch (_) {}
      }

      // Sync user profile with the server to ensure session validity and fresh data
      try {
        const res = await fetch('/api/auth/profile', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const freshUser = data.user || data;
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } else if (res.status === 401) {
          // Clear local state if the server session has expired
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
        
      } catch (err) {
        
        console.error('Failed to sync user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Authenticate user and persist session tokens
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
        credentials: 'include',   
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('user',  JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        router.push('/dashboard');  
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      // Create a new user account via the registration API
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, role }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/login');
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear all local and session-based authentication data
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .then(() => router.push('/login'));
  };

  const updateProfile = async (updates) => {
    setLoading(true);
    try {
      // Update user metadata and preferences on the server
      const res = await fetch('/api/auth/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = data.user || data;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setLoading(true);
    try {
      // Permanently remove the user account and associated data
      const res = await fetch('/api/auth/profile', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
