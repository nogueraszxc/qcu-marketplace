import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import api, { apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AccountShell from '../components/AccountShell';
import Icon from '../components/Icon';

export default function ForgotPassword() {
  const { isPreview } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); if (busy) return; setError('');
    if (isPreview) { setError('This is a design preview. No reset request was sent. Exit preview to use your account.'); return; }
    setBusy(true);
    try { await api.post('/users/forgot-password', { email: email.trim() }); setRequested(true); }
    catch (err) { setError(apiError(err, 'We could not request a reset link. Check your connection and try again.')); }
    finally { setBusy(false); }
  };
  return <AccountShell kind="reset">
    <Head><title>Reset password | QCU Campus Exchange</title><meta name="robots" content="noindex,nofollow" /></Head>
    <div className="account-reset-icon"><Icon name={requested ? 'mail' : 'lock'} size={30} /></div>
    <span className="eyebrow">LET’S GET YOU BACK IN THE LOOP</span><h1>{requested ? 'Reset request received.' : 'A fresh start.'}</h1>
    {requested ? <><div className="account-success" role="status"><Icon name="check-circle" size={22} /><span>If an account matches this email and email delivery is available, you will receive reset instructions. This message does not confirm that an account exists or that an email was delivered.</span></div><p className="account-intro">Check your inbox and spam folder. If no email arrives, see the project&apos;s <Link href="/about">About page</Link> for operator information. Email delivery requires the project&apos;s mail service to be configured.</p><button type="button" className="btn btn-secondary account-wide" onClick={() => setRequested(false)}>Try another email</button></> : <><p className="account-intro">Forgot your password? Enter your account email to request a reset link.</p><form className="account-form" onSubmit={submit}><div className="field"><label htmlFor="reset-email">Email address</label><input id="reset-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>{error && <p className="inline-error" role="alert"><Icon name="alert" size={19} />{error}</p>}<button type="submit" className="btn btn-primary account-wide" disabled={busy}>{busy ? 'Requesting reset link…' : 'Request reset link'}<Icon name="arrow-right" size={20} /></button></form></>}
    <p className="account-switch"><Link href="/login"><Icon name="arrow-left" size={18} /> Back to sign in</Link></p>
  </AccountShell>;
}

