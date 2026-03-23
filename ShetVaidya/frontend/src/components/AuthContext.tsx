import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import api from '../lib/api';

export type User = {
  id: string;
  full_name?: string | null;
  email: string;
  picture_url?: string | null;
};

type AuthContextProps = {
  user: User | null;
  loading: boolean;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithGoogleAccessToken: (accessToken: string) => Promise<void>;
  startMobileGoogleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Define global google object in case library scripts are still loading
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize Web Google Identity popup
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initWebAuth = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (res: { credential?: string }) => {
          if (res.credential) {
            loginWithGoogleCredential(res.credential);
          }
        },
      });
    };

    if (window.google) {
      initWebAuth();
    } else {
      // Small timeout to allow script loading if needed, though wrapped in Provider it should be fine
      setTimeout(initWebAuth, 1000);
    }
  }, []);

  const exchangeGoogleAuth = async (payload: { credential?: string; access_token?: string }) => {
    try {
      const res = await api.post('/auth/google', payload);
      setUser(res.data.user);
      // Explicitly redirect to dashboard on successful auth
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Authentication failed';
      alert(`ShetVaidya Auth Error: ${errorMsg}`);
      throw err;
    }
  };

  const extractCredentialFromUrl = (urlValue: string): string | null => {
    try {
      const parsed = new URL(urlValue);
      const direct = parsed.searchParams.get('credential') || parsed.searchParams.get('id_token');
      if (direct) {
        return direct;
      }

      if (parsed.hash) {
        const hashParams = new URLSearchParams(parsed.hash.slice(1));
        return hashParams.get('credential') || hashParams.get('id_token');
      }
    } catch {
      return null;
    }
    return null;
  };

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const res = await api.get('/auth/me');
        if (active) {
          setUser(res.data);
        }
      } catch (err: any) {
        // Log error only in development and non-401 cases
        if (import.meta.env.DEV && (err.response?.status !== 401)) {
          console.debug('Session restoration skipped:', err.message);
        }
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener: PluginListenerHandle | null = null;

    const registerListener = async () => {
      listener = await CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('shetvaidya://login-callback')) {
          return;
        }
        const credential = extractCredentialFromUrl(url);
        if (!credential) {
          return;
        }

        setLoading(true);
        try {
          await exchangeGoogleAuth({ credential });
          await Browser.close();
        } finally {
          setLoading(false);
        }
      });
    };

    registerListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  const loginWithGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      await exchangeGoogleAuth({ credential });
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogleAccessToken = async (accessToken: string) => {
    setLoading(true);
    try {
      await exchangeGoogleAuth({ access_token: accessToken });
    } finally {
      setLoading(false);
    }
  };

  const startMobileGoogleSignIn = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
    }

    const nonce = crypto.randomUUID();
    const redirectUri = import.meta.env.VITE_MOBILE_REDIRECT_URI || `${window.location.origin}/mobile-auth-callback.html`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('prompt', 'select_account');

    setLoading(true);
    try {
      await Browser.open({
        url: authUrl.toString(),
        presentationStyle: 'fullscreen',
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch {
      // Local cleanup is still required even if API call fails.
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithGoogleCredential, loginWithGoogleAccessToken, startMobileGoogleSignIn, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
