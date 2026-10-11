import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '../types/appointment';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, role?: 'customer' | 'admin', name?: string) => void;
  logout: () => void;
  switchRole: (role: 'customer' | 'admin') => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const AUTH_STORAGE_KEY = 'auraslot_auth_user_v2';

const DEFAULT_CUSTOMER: UserProfile = {
  id: 'user-cust-1',
  name: 'Kavitha Sundaram',
  email: 'kavitha.sundaram@gmail.com',
  phone: '9840123456',
  state: 'Tamil Nadu',
  role: 'customer',
};

const DEFAULT_ADMIN: UserProfile = {
  id: 'user-admin-1',
  name: 'Vikram Anand (Operations Director)',
  email: 'admin@auraslot.in',
  phone: '9840001122',
  state: 'Tamil Nadu',
  role: 'admin',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CUSTOMER;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, role: 'customer' | 'admin' = 'customer', name?: string) => {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: name || (role === 'admin' ? 'Administrator' : email.split('@')[0]),
      email,
      phone: '9840123456',
      state: 'Tamil Nadu',
      role,
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: 'customer' | 'admin') => {
    if (role === 'admin') {
      setUser(DEFAULT_ADMIN);
    } else {
      setUser(DEFAULT_CUSTOMER);
    }
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...profile } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        switchRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
