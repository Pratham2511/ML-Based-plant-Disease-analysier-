import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

export type User = {
  id: string;
  full_name?: string | null;
  email: string;
};

type AuthContextProps = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, otp: string) => Promise<void>;
  requestOtp: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>({
    id: 'guest',
    full_name: 'Guest User',
    email: 'guest@agroguard.local'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Guest login enabled: skip backend session restore
  }, []);

  const requestOtp = async (email: string, password: string) => {
    setLoading(true);
    try {
      await api.post('/auth/login-request', { email, password });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, otp: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login-verify', { email, password, otp });
      setUser(res.data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {
      // Local cleanup is still required even if API call fails.
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, requestOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
