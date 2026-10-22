import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api, { apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AccountShell from '../components/AccountShell';
import Icon from '../components/Icon';

export default function ResetPassword() {
  const router = useRouter();
  const { isPreview, clearSession } = useAuth();
  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get('token');
    const legacyQuery = new URLSearchParams(window.location.search).get('token');
    const value = fragment || legacyQuery || '';
    return /^[a-f\d]{64}$/.test(value) ? value : '';
  });
  useEffect(() => {
    if (window.location.hash || new URLSearchParams(window.location.search).has('token')) {
      const clean = window.location.pathname;
      const state = { ...window.history.state };
      if (typeof state.as === 'string') state.as = clean;
      if (typeof state.url === 'string') state.url = clean;
      window.history.replaceState(state, '', clean);
    }
  }, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); if (busy) return; setError('');
    if (isPreview) { setError('Design preview cannot change an account password. No request was sent.'); return; }
    if (!token) { setError('This reset link is incomplete. Request a new link.'); return; }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) { setError('Use at least 12 characters and no more than 72 UTF-8 bytes. Accents and emoji can use more than one byte per character.'); return; }
    if (password !== confirm) { setError('The passwords do not match. Enter the same password in both fields.'); return; }
    setBusy(true);
    try { await api.post('/users/reset-password', { token, password }); setPassword(''); setConfirm(''); setDone(true); clearSession('Your password was updated. Sign in with your new password.'); router.replace('/reset-password', undefined, { shallow: true }); }
    catch (err) { setError(apiError(err, 'This reset link may be invalid or expired. Request a new link and try again.')); }
    finally { setBusy(false); }
  };
  return <AccountShell kind="reset">
    <Head><title>Choose a new password | QCU Campus Exchange</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Head>
    <div className="account-reset-icon"><Icon name={done ? 'check-circle' : 'lock'} size={30} /></div><span className="eyebrow">A FRESH START FOR YOUR ACCOUNT</span><h1>{done ? 'Password updated.' : 'Make it a strong one.'}</h1>
    {done ? <><div className="account-success" role="status">Your password has changed and previous sessions have been signed out. Sign in again to continue.</div><Link href="/login" className="btn btn-primary account-wide">Sign in<Icon name="arrow-right" size={20} /></Link></> : !router.isReady ? <p role="status" className="account-intro">Checking your reset link…</p> : !token ? <><p className="inline-error" role="alert">This reset link is missing or incomplete. Request a new link to continue.</p><Link href="/forgot-password" className="btn btn-primary account-wide">Request a new reset link</Link></> : <><p className="account-intro">Choose a new password for your account. Reset links are single-use and expire.</p><form className="account-form" onSubmit={submit}><div className="field"><label htmlFor="new-password">New password</label><div className="account-password"><input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={72} required aria-describedby="new-password-hint" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={21} /></button></div><span className="field-hint" id="new-password-hint">At least 12 characters and no more than 72 UTF-8 bytes. No specific mix of character types is required.</span></div><div className="field"><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>{error && <p className="inline-error" role="alert">{error}</p>}<button type="submit" className="btn btn-primary account-wide" disabled={busy}>{busy ? 'Updating password…' : 'Update password'}<Icon name="arrow-right" size={20} /></button></form><p className="account-switch"><Link href="/forgot-password">Request a new reset link</Link></p></>}
  </AccountShell>;
}


