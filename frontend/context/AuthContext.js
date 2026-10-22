import { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import api, { apiError } from '../lib/api';

const AuthContext = createContext();
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const publicPages = ['/', '/browse', '/saved', '/login', '/register', '/forgot-password', '/reset-password', '/product/[id]', '/safety', '/terms', '/privacy', '/cookies', '/refunds', '/about', '/accessibility', '/copyright', '/contact', '/_error', '/404', '/500'];

export function AuthProvider({ children }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');
  const loading = !hydrated || sessionLoading;
  useEffect(() => {
    // Old design sessions never grant access to the real website.
    try { localStorage.removeItem('user'); localStorage.removeItem('token'); sessionStorage.removeItem('qcu-design-preview'); } catch {}
    let active = true;
    api.get('/users/me').then(({ data }) => { if (active) setUser(data.user); })
      .catch((error) => { if (active) { setUser(null); if (error.response?.status !== 401) setSessionNotice('We could not reach the server to check your session. Please try signing in again.'); } })
      .finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, []);
  const clearSessionNotice = useCallback(() => setSessionNotice(''), []);
  const clearSession = useCallback((message = '') => { setUser(null); setSessionNotice(message); }, []);
  useEffect(() => {
    const expired = (event) => clearSession(event.detail || 'Your session has expired. Please sign in again.');
    window.addEventListener('qcu:session-expired', expired);
    return () => window.removeEventListener('qcu:session-expired', expired);
  }, [clearSession]);
  const publicPage = publicPages.includes(router.pathname);
  useEffect(() => { if (!loading && !user && !publicPage) router.replace('/login'); }, [loading, user, publicPage, router]);
  const completeLogin = (data) => {
    const next = data.user;
    if (!next?._id) throw new Error('The server did not return a valid account.');
    setUser(next); setSessionLoading(false); setSessionNotice('');
    router.push(next.role?.toLowerCase() === 'admin' ? '/admin' : '/browse');
    return next;
  };
  const login = async (email, password) => { const { data } = await api.post('/users/login', { email, password }); return completeLogin(data); };
  const register = async (name, email, password, consent) => { const { data } = await api.post('/users/register', { name, email, password, consent }); return completeLogin(data); };
  const refreshUser = async () => { const { data } = await api.get('/users/me'); setUser(data.user); return data.user; };
  const logout = async () => {
    try { await api.post('/users/logout'); clearSession(); router.push('/login'); return true; }
    catch (error) { setSessionNotice(apiError(error, 'We could not sign you out. Please try again.')); return false; }
  };
  // Legacy workspace branches stay unreachable; preview roles are never accepted.
  return <AuthContext.Provider value={{ user, loading, login, register, logout, isPreview: false, refreshUser, updateUser: setUser, clearSession, sessionNotice, clearSessionNotice }}>
    {loading || (!user && !publicPage) ? <div className="app-loading" role="status"><span className="loading-ring" />Getting your marketplace ready…</div> : children}
  </AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
