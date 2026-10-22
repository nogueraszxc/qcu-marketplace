import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api, { apiError } from '../lib/api';
import Icon from '../components/Icon';

const profileFields = (user) => ({ name: user?.name || '', bio: user?.bio || '', contactPreference: user?.contactPreference || 'inbox' });
export default function Profile() {
  const { user, loading, isPreview, updateUser, clearSession } = useAuth();
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(() => profileFields(user));
  const [draft, setDraft] = useState(details);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [requestType, setRequestType] = useState('access');
  const [requestMessage, setRequestMessage] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [requests, setRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(!isPreview);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    if (isPreview || !user?._id) return;
    let active = true;
    api.get('/users/me/privacy-requests').then(({ data }) => { if (active) setRequests(Array.isArray(data.requests) ? data.requests : []); })
      .catch((err) => { if (active) setHistoryError(apiError(err, 'We could not load your request history.')); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [isPreview, user?._id]);
  const refreshRequests = async () => {
    if (isPreview || historyLoading) return;
    setHistoryLoading(true); setHistoryError('');
    try { const { data } = await api.get('/users/me/privacy-requests'); setRequests(Array.isArray(data.requests) ? data.requests : []); }
    catch (err) { setHistoryError(apiError(err, 'We could not load your request history.')); }
    finally { setHistoryLoading(false); }
  };
  const name = details.name || user?.name || 'Your profile';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const save = async (event) => {
    event.preventDefault(); if (busy) return; setError(''); setMessage('');
    if (draft.name.trim().length < 2 || draft.name.trim().length > 80) { setError('Use a name between 2 and 80 characters.'); return; }
    if (isPreview) { setDetails(draft); setEditing(false); setMessage('Profile updated on this preview screen only. No account data was saved.'); return; }
    setBusy(true);
    try { const { data } = await api.patch('/users/me', { ...draft, name: draft.name.trim() }); updateUser(data.user); setDetails(profileFields(data.user)); setDraft(profileFields(data.user)); setEditing(false); setMessage('Your profile has been updated.'); }
    catch (err) { setError(apiError(err, 'Your profile could not be saved. Your changes are still here; please try again.')); }
    finally { setBusy(false); }
  };
  const startPrivacyAction = () => { setPrivacyError(''); setPrivacyMessage(''); };
  const exportData = async () => {
    if (privacyBusy) return; startPrivacyAction();
    if (isPreview) { setPrivacyMessage('Design preview: no account export was requested or downloaded.'); return; }
    setPrivacyBusy('export');
    try {
      const response = await api.get('/users/me/export', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = 'campus-exchange-personal-data.json'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPrivacyMessage('Your personal-data export has been downloaded as a JSON file. Store it somewhere private.');
    } catch (err) { setPrivacyError(apiError(err, 'The export could not be downloaded. Please sign in again and retry.')); }
    finally { setPrivacyBusy(''); }
  };
  const requestPrivacy = async (event) => {
    event.preventDefault(); if (privacyBusy) return; startPrivacyAction();
    if (requestMessage.trim().length < 10) { setPrivacyError('Add at least 10 characters so the project team can understand your request.'); return; }
    if (isPreview) { setPrivacyMessage('Design preview: your privacy request was not sent.'); return; }
    setPrivacyBusy('request');
    try { const { data } = await api.post('/users/me/privacy-requests', { type: requestType, message: requestMessage.trim() }); if (data.request) setRequests((current) => [data.request, ...current]); setRequestMessage(''); setPrivacyMessage('Your privacy request has been recorded for the project team to review.'); }
    catch (err) { setPrivacyError(apiError(err, 'Your request could not be recorded. Please try again.')); }
    finally { setPrivacyBusy(''); }
  };
  const deleteAccount = async (event) => {
    event.preventDefault(); if (privacyBusy) return; startPrivacyAction();
    if (deleteConfirmation !== 'DELETE') { setPrivacyError('Type DELETE exactly to confirm this action.'); return; }
    if (isPreview) { setPrivacyMessage('Design preview: no account or listings were deleted.'); return; }
    setPrivacyBusy('delete');
    try { await api.delete('/users/me', { data: { password: deletePassword, confirmation: deleteConfirmation } }); setDeletePassword(''); setDeleteConfirmation(''); setDeleted(true); clearSession('Your account deletion has been completed.'); }
    catch (err) { setPrivacyError(apiError(err, 'Your account could not be deleted. Check your password or submit a deletion request below.')); }
    finally { setPrivacyBusy(''); }
  };
  if (loading) return <div className="page-shell empty-state" role="status">Loading your profile…</div>;
  if (deleted) return <div className="page-shell empty-state"><Head><title>Account deleted | Campus Exchange</title></Head><Icon name="check-circle" size={38} /><h1 className="page-heading">Your account has been deleted.</h1><p>You have been signed out. Read the Privacy Notice for information about any records retained.</p><Link href="/privacy" className="btn btn-secondary">Privacy Notice</Link><Link href="/" className="btn btn-primary">Back to marketplace</Link></div>;
  return <div className="page-shell profile-page">
    <Head><title>My profile | QCU Campus Exchange</title></Head>
    <header className="profile-page-heading"><div><span className="eyebrow">A PERSON BEHIND EVERY GOOD FIND</span><h1 className="page-heading">My profile</h1><p className="muted">Your own little corner of the campus exchange.</p></div><Link href="/dashboard" className="btn btn-secondary"><Icon name="grid" size={19} />My dashboard</Link></header>
    <nav className="profile-navigation" aria-label="Your account"><Link href="/profile" aria-current="page">Profile</Link><Link href="/my-listings">My listings <Icon name="arrow-up-right" size={16} /></Link><Link href="/transactions">Inbox <Icon name="arrow-up-right" size={16} /></Link></nav>
    <div className="profile-grid">
      <aside className="profile-side"><section className="profile-identity"><div className="profile-identity-top"><span>CAMPUS EXCHANGE / ACCOUNT</span><Icon name="sparkles" size={26} /></div><span className="profile-avatar">{initials}</span><h2>{name}</h2><p className="profile-email">{user?.email}</p><span className="profile-member-label"><Icon name="user" size={17} />{user?.role === 'admin' ? 'Administrator' : 'Marketplace member'}</span><div className="profile-identity-bottom"><span>GOOD THINGS<br />GO AROUND.</span><Icon name="arrow-up-right" size={38} /></div></section>
      <section className="panel profile-account-info"><span className="eyebrow">ACCOUNT DETAILS</span><dl><div><dt>Account role</dt><dd>{user?.role === 'admin' ? 'Administrator' : 'Member'}</dd></div><div><dt>Member since</dt><dd>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) : 'Not available'}</dd></div><div><dt>Email verification</dt><dd>{user?.emailVerified ? 'Email verified' : 'Not verified'}</dd></div></dl><p className="account-service-note">Email verification does not verify student status or university affiliation.</p></section></aside>
      <div className="profile-main"><section className="panel profile-details-panel"><div className="profile-section-heading"><div><span className="eyebrow">A LITTLE ABOUT YOU</span><h2>Put a name to the find.</h2></div>{!editing && <button type="button" className="btn btn-secondary" onClick={() => { setDraft(details); setEditing(true); setMessage(''); }}><Icon name="edit" size={18} />Edit profile</button>}</div>
      {isPreview && <div className="profile-edit-note"><Icon name="eye" size={21} /><span>Design preview. Changes stay on this screen and are not saved to a real account.</span></div>}
      {editing ? <form className="account-form profile-edit-form" onSubmit={save}><div className="field"><label htmlFor="profile-name">Display name</label><input id="profile-name" autoComplete="name" value={draft.name} minLength={2} maxLength={80} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div><div className="field"><label htmlFor="profile-contact">Contact preference</label><select id="profile-contact" value={draft.contactPreference} onChange={(e) => setDraft({ ...draft, contactPreference: e.target.value })}><option value="inbox">Discuss details in the marketplace inbox</option><option value="campus-meetup">Arrange a public campus meetup through the inbox</option></select><span className="field-hint">Keep phone numbers and personal contact details out of public profile text.</span></div><div className="field"><label htmlFor="profile-bio">About you</label><textarea id="profile-bio" rows={5} maxLength={500} placeholder="A course, a hobby, or your favorite kind of find." value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} /><span className="field-hint">{draft.bio.length}/500 characters</span></div>{error && <p role="alert" className="inline-error"><Icon name="alert" size={19} />{error}</p>}<div className="seller-form-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setEditing(false); setError(''); }}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}><Icon name="check" size={19} />{busy ? 'Saving…' : isPreview ? 'Apply preview' : 'Save profile'}</button></div></form> : <dl className="profile-details"><div><dt><Icon name="mail" size={19} />Email address</dt><dd>{user?.email || 'Not available'}</dd></div><div><dt><Icon name="message" size={19} />Contact preference</dt><dd>{details.contactPreference === 'campus-meetup' ? 'Public campus meetup, arranged through the inbox' : 'Marketplace inbox'}</dd></div><div><dt><Icon name="user" size={19} />About me</dt><dd className={!details.bio ? 'muted' : ''}>{details.bio || 'Give the community a little introduction.'}</dd></div></dl>}
      {message && <p className="account-success" role="status"><Icon name="check-circle" size={22} />{message}</p>}</section>
      <div className="profile-bottom-grid"><section className="profile-security-card"><Icon name="lock" size={26} /><h3>Your account. Keep it yours.</h3><p>Use a strong password, and keep your sign-in details to yourself.</p><Link href="/forgot-password">Reset password<Icon name="arrow-right" size={19} /></Link></section><section className="profile-community-card"><Icon name="shield" size={26} /><h3>A little care goes a long way.</h3><p>Chat in the inbox, meet in a public place, and inspect before you pay.</p><Link href="/safety">Campus trading guide<Icon name="arrow-right" size={19} /></Link></section></div>
      <section className="panel profile-privacy-panel" aria-labelledby="privacy-center-heading"><span className="eyebrow">YOUR DATA, YOUR CHOICES</span><h2 id="privacy-center-heading">Privacy center</h2><p>Download your information, ask the project team to review a data concern, or delete your account. Read the <Link href="/privacy">Privacy Notice</Link> for scope and retention details.</p>
      <div className="profile-export-row"><div><h3>A copy of your information</h3><p>Includes account and marketplace records associated with you.</p></div><button type="button" className="btn btn-secondary" disabled={!!privacyBusy} onClick={exportData}><Icon name="download" size={19} />{privacyBusy === 'export' ? 'Preparing…' : 'Download my data'}</button></div>
      <form className="account-form profile-request-form" onSubmit={requestPrivacy}><h3>Send a data-rights request</h3><div className="field"><label htmlFor="privacy-request-type">Request type</label><select id="privacy-request-type" value={requestType} onChange={(e) => setRequestType(e.target.value)}><option value="access">Access my personal data</option><option value="correction">Correct inaccurate information</option><option value="deletion">Request deletion assistance</option><option value="objection">Object to specific processing</option></select></div><div className="field"><label htmlFor="privacy-request-message">What would you like the team to review?</label><textarea id="privacy-request-message" value={requestMessage} minLength={10} maxLength={2000} required rows={4} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Describe your request without sharing passwords or payment account details." /></div><button type="submit" className="btn btn-primary" disabled={!!privacyBusy}>{privacyBusy === 'request' ? 'Recording request…' : 'Submit privacy request'}</button></form>
      <section className="profile-request-history" aria-labelledby="request-history-heading"><div><h3 id="request-history-heading">Your request history</h3>{!isPreview && <button type="button" className="btn btn-ghost" disabled={historyLoading} onClick={refreshRequests}>{historyLoading ? 'Refreshing…' : 'Refresh'}</button>}</div>{isPreview ? <p>Design preview. No live privacy requests are loaded.</p> : historyLoading ? <p role="status">Loading your requests…</p> : historyError ? <p className="inline-error" role="alert">{historyError}</p> : requests.length === 0 ? <p>You have not submitted a data-rights request yet.</p> : <ul>{requests.map((request) => <li key={request._id}><div><strong>{({ access: 'Data access', correction: 'Correction', deletion: 'Deletion assistance', objection: 'Processing objection' })[request.type] || 'Privacy request'}</strong><span className="badge">{request.status || 'Pending'}</span></div><p>{request.message}</p><small>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently submitted'}</small>{typeof (request.response || request.adminResponse) === 'string' && (request.response || request.adminResponse) && <div className="profile-request-response"><strong>Project team response</strong><p>{request.response || request.adminResponse}</p></div>}</li>)}</ul>}</section>
      <details className="profile-delete-section"><summary>Delete my account</summary><p>This action anonymizes your account and removes active listings. Some records may be retained as described in the Privacy Notice. You will be signed out.</p><p>If you use Google sign-in and do not have a password, submit a deletion-assistance request above.</p><form className="account-form" onSubmit={deleteAccount}><div className="field"><label htmlFor="delete-account-password">Current password</label><input id="delete-account-password" type="password" autoComplete="current-password" required value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} /></div><div className="field"><label htmlFor="delete-account-confirm">Type DELETE to confirm</label><input id="delete-account-confirm" autoComplete="off" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} required pattern="DELETE" /></div><button type="submit" className="btn btn-danger" disabled={!!privacyBusy}>{privacyBusy === 'delete' ? 'Deleting account…' : 'Permanently delete my account'}</button></form></details>
      {privacyError && <p role="alert" className="inline-error"><Icon name="alert" size={20} />{privacyError}</p>}{privacyMessage && <p role="status" className="account-success"><Icon name="check-circle" size={21} />{privacyMessage}</p>}
      </section>
      </div>
    </div>
  </div>;
}

