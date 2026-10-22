import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginShell from '../components/LoginShell';
import Icon from '../components/Icon';
import { apiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const signIn = async (event) => {
    event?.preventDefault();
    if (busy) return;
    setError(''); setBusy('email');
    try { await login(email.trim(), password); }
    catch (err) { setError(apiError(err, 'Unable to sign in. Check your email and password, then try again.')); }
    finally { setBusy(''); }
  };
  return <LoginShell>
    <Head><title>Sign in | QCU Campus Exchange</title></Head>
    <p className="login-card-eyebrow">YOUR NEXT GOOD FIND STARTS HERE</p><h1 id="login-title">Welcome back.</h1><p className="login-card-intro">Sign in to your QCU Buy &amp; Sell account.</p>
    <form onSubmit={signIn} className="account-form" aria-busy={!!busy}>
      <div className="field"><label htmlFor="login-email">Email address</label><div className="login-input-wrap"><Icon name="mail" size={20} /><input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? 'login-error' : undefined} required /></div></div>
      <div className="field"><div className="account-label-row"><label htmlFor="login-password">Password</label><Link href="/forgot-password">Forgot password?</Link></div><div className="account-password login-input-wrap"><Icon name="lock" size={20} /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={error ? 'login-error' : undefined} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={21} /></button></div></div>
      {error && <p role="alert" className="inline-error" id="login-error"><Icon name="alert" size={19} />{error}</p>}
      <button className="btn btn-primary account-wide" disabled={!!busy} type="submit">{busy === 'email' ? 'Signing in…' : 'Sign in'}<Icon name="arrow-right" size={20} /></button>
    </form>
    <p className="account-switch">First time here? <Link href="/register">Join the community <Icon name="arrow-up-right" size={17} /></Link></p>
  </LoginShell>;
}


