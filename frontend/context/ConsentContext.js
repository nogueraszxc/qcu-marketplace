import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { analyticsPage, consentSnapshot, parseConsent, subscribeConsent, writeConsent } from '../lib/consent';
import { fallbackPublicConfig, policyVersion } from '../lib/policies';
import { isPreviewMode } from '../lib/api';
const ConsentContext = createContext(null);
const serverSnapshot = () => null;
const subscribeHydration = () => () => {};
export function ConsentProvider({ children }) {
  const { isPreview } = useAuth();
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const encoded = useSyncExternalStore(subscribeConsent, consentSnapshot, serverSnapshot);
  const choice = useMemo(() => parseConsent(encoded), [encoded]);
  const [config, setConfig] = useState(fallbackPublicConfig);
  const [configStatus, setConfigStatus] = useState('loading');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const tracked = useRef(null);
  useEffect(() => {
    if (isPreview || isPreviewMode()) {
      Promise.resolve().then(() => { setConfig(fallbackPublicConfig); setConfigStatus('preview'); });
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch('/api/public/config', { credentials: 'omit', cache: 'no-store', signal: controller.signal, referrerPolicy: 'no-referrer' })
      .then(response => { if (!response.ok) throw new Error('Configuration unavailable'); return response.json(); })
      .then(data => { if (!active) return; setConfig({ ...fallbackPublicConfig, ...data, operator: { ...fallbackPublicConfig.operator, ...data.operator }, analytics: { ...fallbackPublicConfig.analytics, ...data.analytics }, retention: { ...fallbackPublicConfig.retention, ...data.retention } }); setConfigStatus('ready'); })
      .catch(() => { if (active) setConfigStatus('unavailable'); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [isPreview]);
  const savePreferences = async ({ analytics }) => {
    const next = writeConsent(analytics);
    setFeedback(analytics ? 'Optional analytics enabled on this browser.' : 'Optional analytics rejected on this browser.');
    setPreferencesOpen(false);
    if (isPreview || isPreviewMode()) { setFeedback('Preview preference updated locally. No request was sent.'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/privacy/consent', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ analytics: next.analytics, version: policyVersion }), signal: AbortSignal.timeout(8000), referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Preference sync failed');
    } catch { setFeedback('Your browser choice is saved. The server preference could not be updated; open privacy choices to retry.'); }
    finally { setSaving(false); }
  };
  useEffect(() => {
    const page = analyticsPage(router.pathname);
    if (!hydrated || !page || !choice?.analytics || isPreview || isPreviewMode() || configStatus !== 'ready' || !config.analytics.enabled) return;
    const key = `${router.pathname}:${choice.updatedAt}`;
    if (tracked.current === key) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    // Recheck the current browser choice immediately before dispatch. Never send IDs, URLs, queries, referrers, or account credentials.
    if (parseConsent(consentSnapshot())?.analytics && !isPreviewMode()) {
      tracked.current = key;
      fetch('/api/analytics/events', { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ event: 'page_view', page, consent: { analytics: true, version: policyVersion } }), signal: controller.signal }).catch(() => {}).finally(() => clearTimeout(timeout));
    }
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [hydrated, choice, router.pathname, isPreview, configStatus, config.analytics.enabled]);
  return <ConsentContext.Provider value={{ hydrated, choice, config, configStatus, isPreview, preferencesOpen, openPreferences: () => { setFeedback(''); setPreferencesOpen(true); }, closePreferences: () => setPreferencesOpen(false), savePreferences, saving, feedback }}>{children}</ConsentContext.Provider>;
}
export const useConsent = () => useContext(ConsentContext);
