import Head from 'next/head';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccountShell from '../components/AccountShell';
import Icon from '../components/Icon';
import { apiError } from '../lib/api';
import { createPolicyConsent, policyLinks } from '../lib/policies';

export default function Register() {
  const { register } = useAuth();
  const consentInput = useRef(null);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const requirements = [
    { valid: form.password.length >= 12, label: 'At least 12 characters' },
    { valid: form.password.length > 0 && new TextEncoder().encode(form.password).length <= 72, label: 'No more than 72 UTF-8 bytes' },
  ];
  const submit = async (event) => {
    event?.preventDefault(); if (busy) return; setError('');
    if (!accepted) { setError('Agree to the Terms of Use and acknowledge the Privacy Notice before creating your account.'); consentInput.current?.focus(); return; }
    if (!form.name.trim()) { setError('Enter your full name to continue.'); return; }
    if (!requirements.every((r) => r.valid)) { setError('Use at least 12 characters and no more than 72 UTF-8 bytes. Accents and emoji can use more than one byte per character.'); return; }
    setBusy('email');
    try { await register(form.name.trim(), form.email.trim(), form.password, createPolicyConsent('registration', accepted)); }
    catch (err) { setError(apiError(err, 'Unable to create your account. Check your connection and try again.')); }
    finally { setBusy(''); }
  };
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  return <AccountShell kind="register">
    <Head><title>Join the community | QCU Campus Exchange</title></Head>
    <span className="eyebrow">YOUR NEXT GOOD THING STARTS HERE</span><h1>You belong in<br />the loop.</h1><p className="account-intro">Create an account. Find your people and your next campus essential.</p>
    <form className="account-form" onSubmit={submit}>
      <div className="field"><label htmlFor="register-name">Full name</label><input id="register-name" name="name" autoComplete="name" value={form.name} onChange={update} required minLength={2} maxLength={80} placeholder="Juan Dela Cruz" /></div>
      <div className="field"><label htmlFor="register-email">Email address</label><input id="register-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required placeholder="you@example.com" /></div>
      <div className="field"><label htmlFor="register-password">Create password</label><div className="account-password"><input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="password-requirements" value={form.password} onChange={update} required placeholder="Use a memorable passphrase" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={21} /></button></div><span className="field-hint">A long passphrase works well. Accents and emoji can count as multiple bytes; no specific mix of character types is required.</span></div>
      <ul id="password-requirements" className="account-requirements">{requirements.map((r) => <li key={r.label} className={r.valid ? 'is-valid' : ''}><Icon name={r.valid ? 'check-circle' : 'check'} size={16} /><span>{r.label}{r.valid && <span className="sr-only"> — requirement met</span>}</span></li>)}</ul>
      <div className="account-consent"><input ref={consentInput} id="registration-consent" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><label htmlFor="registration-consent">I agree to the <Link href={policyLinks.terms} target="_blank" rel="noopener noreferrer">Terms of Use</Link> and acknowledge the <Link href={policyLinks.privacy} target="_blank" rel="noopener noreferrer">Privacy Notice</Link>.</label></div>
      {error && <p className="inline-error" role="alert"><Icon name="alert" size={19} />{error}</p>}
      <button type="submit" className="btn btn-primary account-wide" disabled={!!busy}>{busy === 'email' ? 'Creating your account…' : 'Create account'}<Icon name="arrow-right" size={20} /></button>
    </form>
    <p className="account-switch">Already in the loop? <Link href="/login">Sign in <Icon name="arrow-up-right" size={17} /></Link></p>
  </AccountShell>;
}


