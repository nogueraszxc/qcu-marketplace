import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { EmptyBlock, LoadingBlock, StatusBadge } from '../components/WorkspaceUI';
import { demoProducts, formatPrice } from '../lib/demo';
import { CAMPUS_NAMES } from '../lib/campuses';

const categories = ['Books', 'Electronics', 'Clothing', 'Food', 'Services', 'Others'];
const conditions = ['New', 'Like New', 'Good', 'Fair'];
const tabs = ['All listings', 'Active', 'Under review', 'Sold', 'Rejected'];
function listingGroup(item) {
  const status = item.status?.toLowerCase();
  if (['active', 'approved'].includes(status)) return 'Active';
  if (status === 'sold') return 'Sold';
  if (status === 'rejected') return 'Rejected';
  return 'Under review';
}

export default function MyListings() {
  const { user, loading: authLoading, isPreview } = useAuth();
  const [liveListings, setListings] = useState([]);
  const [previewListings, setPreviewListings] = useState(() => demoProducts.filter((item) => item.sellerId === 'preview-student'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All listings');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Newest first');
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editForm, setEditForm] = useState({ title: '', price: '', category: 'Books', condition: 'Good', description: '', location: '', warrantyTerms:'' });
  const listings = isPreview ? previewListings : liveListings;

  const fetchMyListings = useCallback(() => {
    if (!user || isPreview) return;
    return api.get('/products/my-listings', { }).then((response) => {
      setListings(Array.isArray(response.data) ? response.data : []);
      setError('');
    }).catch(() => setError('We could not load your listings. Check the connection and try again.'))
      .finally(() => setLoading(false));
  }, [user, isPreview]);

  useEffect(() => { fetchMyListings(); }, [fetchMyListings]);

  function edit(item) {
    setFormError('');
    setEditingProduct(item);
    setEditForm({ title: item.title, price: item.price, category: item.category || 'Others', condition: item.condition || 'Good', description: item.description || '', location: CAMPUS_NAMES.includes(item.location) ? item.location : '', warrantyTerms:item.warrantyTerms||'No additional seller warranty. Applicable legal rights still apply.' });
  }

  async function updateListing(event) {
    event.preventDefault();
    if (!editForm.title.trim()) { setFormError('Add a name for your item.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (isPreview) {
        setPreviewListings((items) => items.map((item) => item._id === editingProduct._id ? { ...item, ...editForm, price: Number(editForm.price) } : item));
        toast.success('Preview only: listing changes are shown locally.');
      } else {
        await api.put(`/products/${editingProduct._id}`, editForm, { });
        toast.success('Listing updated and submitted for review.');
        await fetchMyListings();
      }
      setEditingProduct(null);
    } catch { setFormError('Your changes could not be saved. Try again in a moment.'); }
    finally { setSaving(false); }
  }

  async function deleteListing() {
    setSaving(true);
    setFormError('');
    try {
      if (isPreview) {
        setPreviewListings((items) => items.filter((item) => item._id !== deletingProduct._id));
        toast.success('Preview only: listing removed from this view.');
      } else {
        await api.delete(`/products/${deletingProduct._id}`, { });
        toast.success('Your listing has been deleted.');
        await fetchMyListings();
      }
      setDeletingProduct(null);
    } catch { setFormError('This listing could not be deleted. Please try again.'); }
    finally { setSaving(false); }
  }

  const filteredListings = listings.filter((item) => (activeTab === 'All listings' || listingGroup(item) === activeTab) && `${item.title} ${item.category}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'Price: low to high' ? Number(a.price) - Number(b.price) : sort === 'Price: high to low' ? Number(b.price) - Number(a.price) : new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <div className="page-shell workspace-page">
      <Head><title>My listings | QCU Buy & Sell</title></Head>
      <div className="ws-page-top ws-listing-page-top"><div><p className="eyebrow">YOUR SELLER DESK</p><h1 className="page-heading">My listings<span className="ws-heading-dot">.</span></h1><p className="muted">Good things, ready for their next campus chapter.</p></div><div className="ws-listing-total"><strong>{(!isPreview && loading) || authLoading ? '—' : listings.length}</strong><span>items on<br />your seller desk</span></div></div>
      <div className="ws-listing-action-bar"><div><Icon name="store" size={22} /><span>Keep the details fresh. Help your next buyer find you.</span></div><Link className="btn btn-primary" href="/sell"><Icon name="plus" size={20} /> Create a listing</Link></div>
      <div className="ws-listings-summary"><span><strong>{listings.length}</strong> total listings</span><span><i />{listings.filter((item) => listingGroup(item) === 'Active').length} active on campus</span><span><Icon name="clock" size={15} />{listings.filter((item) => listingGroup(item) === 'Under review').length} under review</span></div>
      <section className="panel ws-listings-panel">
        <div className="ws-listing-controls"><div className="ws-tabs" aria-label="Filter listings by status">{tabs.map((tab) => <button key={tab} aria-pressed={activeTab === tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab}<span>{tab === 'All listings' ? listings.length : listings.filter((item) => listingGroup(item) === tab).length}</span></button>)}</div><div className="ws-listing-tools"><label className="ws-search"><Icon name="search" size={20} /><input type="search" aria-label="Search your listings" placeholder="Search by item or category" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="ws-sort"><span>Sort</span><select aria-label="Sort listings" value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest first</option><option>Price: low to high</option><option>Price: high to low</option></select></label></div></div>
        {error ? <EmptyBlock icon="alert" title="A small connection hiccup" text={error} action={<button className="btn btn-secondary" onClick={fetchMyListings}>Try again</button>} /> : (!isPreview && loading) || authLoading ? <LoadingBlock text="Finding your listings…" /> : filteredListings.length ? <div className="ws-table-wrap" role="region" aria-label="Your listings"><table className="ws-listing-table"><caption className="sr-only">Manage your listings, prices, and review status.</caption><thead><tr><th>Item</th><th>Price</th><th>Status</th><th className="ws-actions-head">Manage</th></tr></thead><tbody>{filteredListings.map((item) => <tr key={item._id}><td><div className="ws-table-item"><div className="ws-item-thumb">{item.image ? <Image src={item.image} alt="" width={66} height={66} unoptimized /> : <Icon name="box" />}</div><div><h3>{item.title}</h3><p>{item.category} <span>·</span> {item.condition || 'Condition not specified'}</p></div></div></td><td className="ws-table-price">{formatPrice(item.price)}</td><td><StatusBadge status={item.status} /></td><td><div className="ws-listing-actions"><button className="btn btn-secondary" onClick={() => edit(item)} aria-label={`Edit ${item.title}`}><Icon name="edit" size={16} /><span>Edit</span></button><button className="ws-icon-button ws-delete-button" aria-label={`Delete ${item.title}`} onClick={() => { setDeletingProduct(item); setFormError(''); }}><Icon name="trash" size={18} /></button></div></td></tr>)}</tbody></table></div> : <EmptyBlock icon={search ? 'search' : 'box'} title={search || activeTab !== 'All listings' ? 'No listings match just yet' : 'Good things deserve a second chapter'} text={search || activeTab !== 'All listings' ? 'Try another search or view all your listings.' : 'List an item and connect with someone who needs it on campus.'} action={search || activeTab !== 'All listings' ? <button className="btn btn-secondary" onClick={() => { setSearch(''); setActiveTab('All listings'); }}>Clear filters</button> : <Link className="btn btn-primary" href="/sell"><Icon name="plus" size={17} /> List your first item</Link>} />}
        <div className="ws-panel-foot"><Icon name="shield" size={16} /><span>Your listings help keep useful things in the QCU community.</span><span className="ws-result-count" role="status" aria-live="polite">{filteredListings.length} of {listings.length} listings</span></div>
      </section>
      <div className="ws-campus-reminder"><div className="ws-reminder-icon"><Icon name="camera" size={24} /></div><div><h3>Make your listing worth a closer look.</h3><p>Clear photos, an honest description, and a fair price help the right buyer find you.</p></div><Link className="ws-text-link" href="/safety">Trading guide <Icon name="arrow-up-right" size={20} /></Link></div>

      <Dialog open={Boolean(editingProduct)} onClose={() => !saving && setEditingProduct(null)} className="ws-dialog">
        <div className="ws-dialog-backdrop" aria-hidden="true" /><div className="ws-dialog-position"><DialogPanel className="ws-dialog-panel"><div className="ws-dialog-head"><div><p className="eyebrow">LISTING DETAILS</p><DialogTitle>Edit your listing</DialogTitle></div><button className="ws-icon-button" aria-label="Close edit listing" onClick={() => setEditingProduct(null)} disabled={saving}><Icon name="x" /></button></div><Description className="muted ws-dialog-description">Keep the details helpful and accurate for your next buyer.</Description><form onSubmit={updateListing} className="ws-edit-form"><label className="field">Item name<input required maxLength={120} value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label><div className="form-grid"><label className="field">Price (₱)<input type="number" min="0" step="0.01" required value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} /></label><label className="field">Condition<select value={editForm.condition} onChange={(event) => setEditForm({ ...editForm, condition: event.target.value })}>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label></div><label className="field">Category<select value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field">Meet-up campus<select required value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })}><option value="" disabled>Choose a campus</option>{CAMPUS_NAMES.map(campus => <option key={campus}>{campus}</option>)}</select></label><label className="field">Description<textarea rows={4} required maxLength={3000} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label><label className="field">Seller warranty terms<textarea rows={3} required maxLength={2000} value={editForm.warrantyTerms} onChange={event=>setEditForm({...editForm,warrantyTerms:event.target.value})}/><span className="field-hint">State the period, coverage, and refund process, or explicitly state no additional seller warranty. You cannot waive applicable legal rights.</span></label>{isPreview && <p className="ws-preview-note"><Icon name="eye" size={15} />Preview changes stay on this screen.</p>}{formError && <p className="inline-error" role="alert">{formError}</p>}<div className="ws-dialog-actions"><button className="btn btn-secondary" type="button" disabled={saving} onClick={() => setEditingProduct(null)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : isPreview ? 'Preview changes' : 'Save changes'}<Icon name="check" size={17} /></button></div></form></DialogPanel></div>
      </Dialog>
      <Dialog open={Boolean(deletingProduct)} onClose={() => !saving && setDeletingProduct(null)} className="ws-dialog"><div className="ws-dialog-backdrop" aria-hidden="true" /><div className="ws-dialog-position"><DialogPanel className="ws-dialog-panel ws-confirm-panel"><div className="ws-confirm-icon"><Icon name="trash" size={25} /></div><DialogTitle>Remove this listing?</DialogTitle><Description className="muted">“{deletingProduct?.title}” will be removed from your listings.{!isPreview && ' This cannot be undone.'}</Description>{formError && <p className="inline-error" role="alert">{formError}</p>}<div className="ws-dialog-actions"><button data-autofocus className="btn btn-secondary" disabled={saving} onClick={() => setDeletingProduct(null)}>Keep listing</button><button className="btn ws-danger-button" disabled={saving} onClick={deleteListing}>{saving ? 'Removing…' : isPreview ? 'Remove in preview' : 'Delete listing'}</button></div></DialogPanel></div></Dialog>
    </div>
  );
}


