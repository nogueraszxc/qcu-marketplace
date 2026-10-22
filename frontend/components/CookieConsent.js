import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import Modal from './Modal';
import Icon from './Icon';
export default function CookieConsent() {
  const { hydrated, choice, isPreview, preferencesOpen, openPreferences, closePreferences, savePreferences, saving, feedback } = useConsent();
  const [analytics, setAnalytics] = useState(false);
  const banner = useRef(null);
  const showBanner = hydrated && !choice && !isPreview && !preferencesOpen;
  useEffect(() => { if (preferencesOpen) Promise.resolve().then(() => setAnalytics(choice?.analytics === true)); }, [preferencesOpen, choice]);
  useEffect(() => {
    const node = banner.current;
    if (!showBanner || !node) { document.documentElement.style.removeProperty('--cookie-notice-space'); return; }
    const measure = () => document.documentElement.style.setProperty('--cookie-notice-space', `${node.getBoundingClientRect().height + 16}px`);
    const observer = new ResizeObserver(measure); observer.observe(node); measure();
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--cookie-notice-space'); };
  }, [showBanner]);
  return <>
    {showBanner && <section className="cookie-banner" aria-label="Privacy choices" ref={banner}><div tabIndex={0} role="region" aria-label="About browser storage"><span className="eyebrow">YOUR BROWSER, YOUR CHOICE</span><h2>Keep the essentials. Choose the rest.</h2><p>Sign-in and privacy preferences use necessary storage. Optional first-party analytics counts pages in aggregate, without profiles or advertising trackers. <Link href="/cookies">See storage details</Link>.</p></div><div className="cookie-banner-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => savePreferences({ analytics: false })}>Reject optional</button><button className="btn btn-secondary" disabled={saving} onClick={() => savePreferences({ analytics: true })}>Accept optional</button><button className="btn btn-secondary" onClick={openPreferences}>Customize</button></div></section>}
    <Modal open={preferencesOpen} onClose={closePreferences} title="Your privacy choices" description="Optional analytics is off until you choose it. You can change your mind at any time.">
      {isPreview && <p className="policy-callout">Design preview: choices remain local and no server requests are made.</p>}
      <div className="privacy-choice"><div><h3>Essential storage</h3><p>Sign-in session, saved finds, demo mode, and your privacy choice. These support features you request.</p></div><span className="badge">Always available</span></div>
      <label className="privacy-choice privacy-choice-toggle" htmlFor="optional-analytics"><div><h3>Optional page analytics</h3><p>Daily counts by a short page category. No account ID, full URL, query, search text, referrer, advertising ID, or message content is included.</p></div><span className="privacy-checkbox"><input id="optional-analytics" type="checkbox" checked={analytics} onChange={event => setAnalytics(event.target.checked)} /><span className="sr-only">Enable optional analytics</span></span></label>
      <p className="policy-small">This choice lasts up to 180 days or until the policy version changes. Withdrawal stops future events; existing anonymous totals cannot be linked back to you. <Link href="/privacy">Privacy notice</Link> · <Link href="/cookies">Storage details</Link></p>
      <div className="privacy-dialog-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => savePreferences({ analytics: false })}>Reject optional</button><button className="btn btn-primary" disabled={saving} onClick={() => savePreferences({ analytics })}>{saving ? 'Saving…' : 'Save choices'}</button></div>
      {feedback && <p className="policy-feedback" role="status"><Icon name="check-circle" size={18}/>{feedback}</p>}
    </Modal>
    <div className="sr-only" role="status" aria-live="polite">{feedback}</div>
  </>;
}
