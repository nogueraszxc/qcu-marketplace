import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { EmptyBlock, LoadingBlock, StatusBadge } from '../components/WorkspaceUI';
import { demoProducts, formatPrice } from '../lib/demo';

export default function Dashboard() {
  const { user, loading: authLoading, isPreview } = useAuth();
  const [liveProducts, setProducts] = useState([]);
  const [loadingData, setLoading] = useState(true);
  const [error, setError] = useState('');
  const products = isPreview ? demoProducts.filter((item) => item.sellerId === 'preview-student') : liveProducts;
  const loading = authLoading || (!isPreview && loadingData);

  const loadListings = useCallback(() => {
    if (!user || isPreview) return;
    return api.get('/products/my-listings', {
      }).then((response) => {
      setProducts(Array.isArray(response.data) ? response.data : []);
      setError('');
    }).catch(() => setError('Your listings could not be loaded. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, [user, isPreview]);

  useEffect(() => { loadListings(); }, [loadListings]);

  const active = products.filter((item) => ['approved', 'active'].includes(item.status?.toLowerCase())).length;
  const sold = products.filter((item) => item.status?.toLowerCase() === 'sold').length;
  const pending = products.filter((item) => !['approved', 'active', 'sold', 'rejected'].includes(item.status?.toLowerCase())).length;
  const recent = [...products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const metrics = [
    { label: 'Total listings', value: products.length, icon: 'box' },
    { label: 'Active on campus', value: active, icon: 'store' },
    { label: 'Under review', value: pending, icon: 'clock' },
    { label: 'Items sold', value: sold, icon: 'check-circle' },
  ];

  return (
    <div className="page-shell workspace-page">
      <Head><title>Your campus hub | QCU Buy & Sell</title></Head>
      <div className="ws-page-top">
        <div><p className="eyebrow">YOUR CAMPUS. YOUR CONNECTIONS.</p><h1 className="page-heading">Your campus hub<span className="ws-heading-dot">.</span></h1><p className="muted">Hey {user?.name?.split(' ')[0] || 'there'}, here is what is happening with your listings.</p></div>
        <Link className="btn btn-secondary" href="/browse">Explore the marketplace <Icon name="arrow-up-right" size={20} /></Link>
      </div>

      <section className="ws-hub-actions" aria-label="Your next steps">
        <div className="ws-hub-campaign">
          <div><p className="eyebrow">FROM YOUR DESK TO SOMEONE ELSE’S</p><h2>Good things deserve<br className="ws-desktop-break" /> another chapter.</h2><p>A finished textbook. An extra calculator. Pass it on to someone on campus.</p><Link className="btn btn-gold" href="/sell"><Icon name="plus" size={20} /> Create a listing</Link></div>
          <div className="ws-campaign-symbol" aria-hidden="true"><Icon name="box" size={90} /><span>PASS IT ON</span><Icon name="arrow-up-right" size={35} /></div>
        </div>
        <div className="panel ws-hub-next"><span className="ws-section-number" aria-hidden="true">01 / YOUR NEXT STEP</span><h2>Keep it moving.</h2><Link href="/transactions"><Icon name="message" size={22} /><span><strong>Open your inbox</strong><small>Talk details. Plan a meetup.</small></span><Icon name="arrow-right" size={20} /></Link><Link href="/my-listings"><Icon name="edit" size={22} /><span><strong>Manage your listings</strong><small>Update details and check status.</small></span><Icon name="arrow-right" size={20} /></Link></div>
      </section>

      {error && <div className="inline-error ws-error" role="alert"><Icon name="alert" /><span>{error}</span><button className="btn btn-secondary" onClick={loadListings}>Try again</button></div>}
      <section className="panel ws-metrics" aria-label="Your listing overview">
        {metrics.map((metric) => <div className="ws-metric" key={metric.label}><div className="ws-metric-top"><Icon name={metric.icon} size={20} /><span>{metric.label}</span></div><strong>{loading ? '—' : metric.value}</strong></div>)}
      </section>

      <div className="ws-dashboard-columns">
        <section className="panel ws-recent">
          <div className="ws-section-head"><div><p className="eyebrow">YOUR SELLER DESK</p><h2>Latest listings</h2></div><Link className="ws-text-link" href="/my-listings">Manage all <Icon name="arrow-right" size={20} /></Link></div>
          {loading ? <LoadingBlock text="Loading your listings…" /> : recent.length ? <div className="ws-recent-list">{recent.slice(0, 4).map((product) => <Link className="ws-recent-row" key={product._id} href="/my-listings"><div className="ws-item-thumb">{product.image ? <Image src={product.image} alt="" width={80} height={80} unoptimized /> : <Icon name="box" size={28} />}</div><div className="ws-item-copy"><h3>{product.title}</h3><p>{product.category} <span>·</span> {formatPrice(product.price)}</p></div><StatusBadge status={product.status} /><Icon className="ws-row-arrow" name="arrow-up-right" size={22} /></Link>)}</div> : <EmptyBlock icon="box" title="Your seller desk is ready" text="Add your first listing and help a fellow QCU student find something useful." action={<Link className="btn btn-primary" href="/sell">List your first item <Icon name="plus" size={20} /></Link>} />}
          <div className="ws-panel-foot"><Icon name={pending ? 'clock' : 'shield'} size={20} /><span>{loading ? 'Your listing overview will appear here.' : pending ? `${pending} ${pending === 1 ? 'listing is' : 'listings are'} waiting for admin review.` : 'New listings are reviewed before appearing in the marketplace.'}</span></div>
        </section>
        <aside className="ws-seller-checklist"><div className="ws-checklist-heading"><span className="ws-section-number">GOOD LISTING CHECKLIST</span><Icon name="sparkles" size={28} /></div><h2>A little detail.<br />A better deal.</h2><ol><li><span>01</span><div><strong>Let the photos do the talking.</strong><p>Use a clear photo of the actual item.</p></div></li><li><span>02</span><div><strong>Keep the description honest.</strong><p>Include condition, size, and anything worth knowing.</p></div></li><li><span>03</span><div><strong>Agree on a safe meetup.</strong><p>Choose a public place on campus and inspect before paying.</p></div></li></ol><Link className="ws-text-link" href="/safety">Read the campus trading guide <Icon name="arrow-up-right" size={20} /></Link></aside>
      </div>

      {recent.length > 0 && !loading && <section className="ws-history"><div className="ws-history-heading"><Icon name="clock" size={22} /><h2>From your listing history</h2></div><div className="ws-history-strip">{recent.slice(0, 3).map((product) => <div key={product._id}><p>{product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', timeZone: 'Asia/Manila' }) : 'Date unavailable'}</p><h3>{product.title}</h3><span>Posted to your seller desk</span></div>)}</div></section>}
    </div>
  );
}

