import Link from 'next/link';
import Image from 'next/image';
import Brand from './Brand';
import Icon from './Icon';
import { universityAssetsEnabled } from '../lib/branding';
import { CAMPUS_LABEL } from '../lib/campuses';

const steps = [
  ['Discover', 'Find your next campus essential.'],
  ['Connect', 'Chat and agree on the details.'],
  ['Meet', 'Inspect your find, then pay.'],
];

export default function LoginShell({ children }) {
  return <div className="login-scene">
    {universityAssetsEnabled && <div className="login-scene-photo" aria-hidden="true">
      <Image src="/api/brand-assets?asset=campus" alt="" fill unoptimized preload sizes="100vw" />
    </div>}
    <div className="login-scene-scrim" aria-hidden="true" />
    <div className="login-scene-inner">
      <header className="login-scene-header">
        <Brand light />
        <span className="login-community-label"><span aria-hidden="true" />Your campus marketplace</span>
      </header>

      <div className="login-scene-content">
        <section className="login-story" aria-labelledby="login-story-title">
          <p className="login-story-eyebrow">A LITTLE LESS NEW. A LOT MORE POSSIBILITY.</p>
          <h2 id="login-story-title">Good things find<br /><em>new homes.</em></h2>
          <p className="login-story-description">Find your next campus essential. Pass on what you no longer need, and keep good things going around.</p>
          <div className="login-location">
            <span className="login-location-icon"><Icon name="pin" size={22} /></span>
            <div><strong>It starts with your community.</strong><p>{CAMPUS_LABEL}</p></div>
          </div>
        </section>

        <section className="login-glass-card" aria-labelledby="login-title">
          <div className="login-card-emblem" aria-hidden="true"><Icon name="store" size={25} /></div>
          {children}
          <div className="login-help"><Icon name="shield" size={19} /><p>Need a hand signing in?<br /><a href="mailto:noguera.chandler.espenilla@gmail.com">Contact Chandler</a> for account support.</p></div>
        </section>
      </div>

      <footer className="login-scene-footer">
        <ol className="login-steps" aria-label="How the marketplace works">{steps.map(([title, description], index) => <li key={title}>
          <div><strong>{title}</strong><span aria-hidden="true">0{index + 1}</span></div><p>{description}</p>
        </li>)}</ol>
        <div className="login-footer-meta"><span>{new Date().getFullYear()} · <a href="mailto:noguera.chandler.espenilla@gmail.com">Chandler Noguera</a></span><nav aria-label="Login page links"><Link href="/">Marketplace</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/copyright">Credits</Link></nav></div>
      </footer>
    </div>
  </div>;
}
