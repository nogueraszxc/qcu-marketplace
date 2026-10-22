import Link from 'next/link';
import Image from 'next/image';
import Brand from './Brand';
import Icon from './Icon';
import { universityAssetsEnabled } from '../lib/branding';

export default function AccountShell({ children, kind = 'login' }) {
  return <div className="account-shell account-shell-glass">
    <aside className={"account-poster "+(kind === "login" ? "account-poster-campus" : "")}>
      {kind === "login" && universityAssetsEnabled && <div className="account-campus-backdrop" aria-hidden="true"><Image src="/api/brand-assets?asset=campus" alt="" fill unoptimized preload sizes="(max-width: 760px) 100vw, 48vw"/></div>}
      <div className="account-poster-top"><Brand light={kind === "login"} /><span className="account-poster-edition">THE CAMPUS EDITION</span></div>
      <div className="account-poster-copy"><span className="eyebrow">GOOD THINGS GO AROUND.</span><h2>Your campus.<br />{' '}Your people.<br /><span>Your next find.</span></h2><p>A textbook for next term. A little extra desk space. Good things deserve another go.</p></div>
      {kind !== "login" && <div className="account-poster-collage" aria-hidden="true">
        <div className="account-poster-photo account-poster-books"><Image src="/products/books.svg" width={300} height={240} alt="" unoptimized /><span>ONE MORE CHAPTER.</span></div>
        <div className="account-poster-photo account-poster-tote"><Image src="/products/tote.svg" width={300} height={240} alt="" unoptimized /></div>
        <div className="account-loop-sticker"><Icon name="arrow-up-right" size={30} /><span>PASS<br />IT ON.</span></div>
        <div className="account-campus-note"><Icon name="pin" size={18} /><span>San Bartolome · San Francisco<br />Batasan Hills</span></div>
      </div>}
      {kind === "login" && <div className="account-location-card"><Icon name="pin" size={21}/><div><strong>Good finds. Familiar places.</strong><span>Connect, inspect, then pay at meet-up.</span></div></div>}
      <div className="account-poster-bottom"><span>LESS NEW. MORE YOU.</span><Icon name="sparkles" size={22} /><span>QCU CAMPUS EXCHANGE</span></div>
    </aside>
    <section className={`account-main account-main-${kind}`}>
      <Link href="/" className="account-back"><Icon name="arrow-left" size={19} /> Back to marketplace</Link>
      <div className="account-form-wrap">{children}</div>
      <p className="account-bottom-note"><Icon name="shield" size={18} /> Independently operated by Chandler Noguera.</p>
    </section>
  </div>;
}

