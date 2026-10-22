import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import api, { apiError } from '../lib/api';
import toast from 'react-hot-toast';
import Icon from '../components/Icon';
import { formatPrice } from '../lib/demo';
import { createPolicyConsent, policyLinks } from '../lib/policies';
import { CAMPUS_NAMES } from '../lib/campuses';

export default function SellItem() {
  const { user, isPreview } = useAuth();
  const router = useRouter();
  const fileInput = useRef(null);
  const titleInput = useRef(null);
  const warrantyInput = useRef(null);
  const consentInput = useRef(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'Books', condition: 'Good', location: '', image: '', warrantyTerms: '' });
  const update = (event) => { setPreviewReady(false); setForm({ ...form, [event.target.name]: event.target.value }); };
  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageError(''); setPreviewReady(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setImageError('Choose a JPG, PNG, or WebP image.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setImageError('Your image is too large. Choose a photo smaller than 5 MB.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => setForm((previous) => ({ ...previous, image: reader.result }));
    reader.onerror = () => setImageError('We could not open that image. Try choosing another photo.');
    reader.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault(); if (busy) return; setError('');
    if (!user) { router.push('/login'); return; }
    if (!form.image) { setImageError('Add a clear photo of your item before continuing.'); fileInput.current?.focus(); return; }
    if (!form.title.trim()) { setError('Give your item a name before continuing.'); titleInput.current?.focus(); return; }
    if (!form.warrantyTerms.trim()) { setError('State the seller warranty and refund terms before continuing.'); warrantyInput.current?.focus(); return; }
    if (!accepted) { setError('Confirm listing accuracy and your right to sell the item and use its image.'); consentInput.current?.focus(); return; }
    if (isPreview) { setPreviewReady(true); toast.success('Listing preview ready. Nothing was published.'); return; }
    setBusy(true);
    try { await api.post('/products', { ...form, title: form.title.trim(), warrantyTerms: form.warrantyTerms.trim(), consent: createPolicyConsent('listing', accepted) }); toast.success('Your item was submitted for review.'); router.push('/my-listings'); }
    catch (err) { setError(apiError(err, 'Your item could not be submitted. Your details are still here; check your connection and try again.')); }
    finally { setBusy(false); }
  };
  return <div className="page-shell seller-page">
    <Head><title>Sell an item | QCU Campus Exchange</title></Head>
    <Link href="/my-listings" className="account-back"><Icon name="arrow-left" size={19} /> Back to my listings</Link>
    <header className="seller-page-title"><div><span className="eyebrow">MAKE SOME SPACE. MAKE SOMEONE’S DAY.</span><h1 className="page-heading">Pass something good on.</h1><p className="muted">Your old favorite could be someone&apos;s next great find.</p></div><span className="seller-title-stamp"><Icon name="arrow-up-right" size={30} /><span>THE CAMPUS<br />CIRCULAR.</span></span></header>
    <ol className="seller-progress" aria-label="Listing checklist"><li className={form.image ? 'complete' : ''}><span>{form.image ? <Icon name="check" size={17} /> : '1'}</span>Add a photo</li><li className={form.title.trim() && form.price ? 'complete' : ''}><span>{form.title.trim() && form.price ? <Icon name="check" size={17} /> : '2'}</span>Fill in the details</li><li className={previewReady ? 'complete' : ''}><span>{previewReady ? <Icon name="check" size={17} /> : '3'}</span>Give it a final look</li></ol>
    <div className="seller-grid">
      <form onSubmit={submit} className="panel seller-form">
        <section className="seller-form-section"><div className="seller-section-heading"><span aria-hidden="true">01</span><div><h2>Let your item do the talking.</h2><p>A clear photo of the actual item is the best place to start.</p></div></div>
          <label className={`seller-upload ${form.image ? 'has-image' : ''}`}><input ref={fileInput} id="item-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label={form.image ? 'Change item photo' : 'Upload item photo'} aria-invalid={!!imageError} aria-describedby={imageError ? 'item-image-error' : !form.image ? 'item-image-hint' : undefined} />{form.image ? <><Image src={form.image} alt="Your listing photo preview" fill sizes="(max-width: 760px) 90vw, 720px" unoptimized style={{ objectFit: 'contain' }} /><span className="seller-upload-change"><Icon name="camera" size={20} /> Change photo</span></> : <><span className="seller-upload-icon"><Icon name="upload" size={30} /></span><strong>Choose a photo</strong><span id="item-image-hint">JPG, PNG or WebP · Up to 5 MB</span></>}</label>
          {form.image && <button type="button" className="seller-remove-photo" onClick={() => { setForm({ ...form, image: '' }); setPreviewReady(false); if (fileInput.current) fileInput.current.value = ''; }}><Icon name="trash" size={18} />Remove photo</button>}
          {imageError && <p className="inline-error seller-image-error" id="item-image-error" role="alert"><Icon name="alert" size={20} />{imageError}</p>}
        </section>
        <section className="seller-form-section"><div className="seller-section-heading"><span aria-hidden="true">02</span><div><h2>Make the details count.</h2><p>Keep it clear, honest, and easy to find.</p></div></div>
          <div className="account-form"><div className="field"><label htmlFor="item-title">Item name <span aria-hidden="true">*</span></label><input ref={titleInput} id="item-title" name="title" value={form.title} onChange={update} placeholder="e.g. Calculus textbook, 7th edition" maxLength={120} required aria-describedby="item-title-hint" /><span className="field-hint" id="item-title-hint">A specific title helps the right person find it.</span></div>
            <div className="field"><label htmlFor="item-description">Description</label><textarea id="item-description" name="description" value={form.description} onChange={update} rows={4} maxLength={2000} placeholder="What’s included? Any marks or wear? Share what a buyer would want to know." /><span className="field-hint">Include the size, edition, or model when it helps.</span></div>
            <div className="field"><label htmlFor="item-campus">Meet-up campus <span aria-hidden="true">*</span></label><select id="item-campus" name="location" value={form.location} onChange={update} required aria-describedby="item-campus-hint"><option value="" disabled>Choose a campus</option>{CAMPUS_NAMES.map(campus => <option key={campus}>{campus}</option>)}</select><span className="field-hint" id="item-campus-hint">Choose the campus where you can meet. Agree on a public meeting spot in the inbox.</span></div><div className="form-grid seller-form-row"><div className="field"><label htmlFor="item-category">Category</label><select id="item-category" name="category" value={form.category} onChange={update}>{['Books', 'Electronics', 'Clothing', 'Food', 'Services', 'Others'].map((category) => <option key={category}>{category}</option>)}</select></div><div className="field"><label htmlFor="item-condition">Condition</label><select id="item-condition" name="condition" value={form.condition} onChange={update}>{['New', 'Like New', 'Good', 'Fair'].map((condition) => <option key={condition}>{condition}</option>)}</select></div></div>
          </div>
        </section>
        <section className="seller-form-section seller-price-section"><div className="seller-section-heading"><span aria-hidden="true">03</span><div><h2>A fair price. A fresh start.</h2><p>Set your asking price in Philippine pesos.</p></div></div><div className="field seller-price-field"><label htmlFor="item-price">Price in pesos <span aria-hidden="true">*</span></label><div><span aria-hidden="true">₱</span><input id="item-price" name="price" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={form.price} onChange={update} required /></div></div></section>
        <section className="seller-form-section account-form"><div className="field"><label htmlFor="item-warranty">Seller warranty and refund terms <span aria-hidden="true">*</span></label><textarea ref={warrantyInput} id="item-warranty" name="warrantyTerms" value={form.warrantyTerms} onChange={update} maxLength={2000} rows={4} required aria-describedby="item-warranty-hint" placeholder="Describe any seller warranty and how buyers can request a refund if it applies." /><span className="field-hint" id="item-warranty-hint">If you offer no additional seller warranty, state that clearly. These terms do not waive any applicable legal rights. Payments are arranged directly with the seller at meetup.</span><button type="button" className="btn btn-secondary seller-warranty-choice" onClick={() => { setForm({ ...form, warrantyTerms: 'No additional seller warranty.' }); setPreviewReady(false); }}>Use “No additional seller warranty”</button></div></section>
        <div className="seller-submit-area"><div className="account-consent"><input ref={consentInput} id="listing-consent" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><label htmlFor="listing-consent">I confirm this listing is accurate, I have the right to sell it and use its images, and I agree to the <Link href={policyLinks.terms} target="_blank" rel="noopener noreferrer">marketplace rules</Link>.</label></div>{error && <p className="inline-error" role="alert"><Icon name="alert" size={20} />{error}</p>}{previewReady && <div className="account-success" role="status"><Icon name="check-circle" size={22} /><span>Your listing preview is ready. This is sample mode, so the item has not been saved or published.</span></div>}<div className="seller-form-actions"><Link href="/my-listings" className="btn btn-secondary">Cancel</Link><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : isPreview ? 'Preview listing' : 'Submit listing'}<Icon name="arrow-right" size={20} /></button></div><p className="seller-submit-note">{isPreview ? 'Design preview only. Nothing will be published.' : 'Listings are reviewed before they appear in the marketplace.'}</p></div>
      </form>
      <aside className="seller-sidebar"><div className="seller-preview-card"><div className="seller-preview-heading"><Icon name="eye" size={20} /><span>YOUR NEXT GOOD FIND</span></div><div className="seller-preview-photo">{form.image ? <Image src={form.image} alt="Listing card preview" fill sizes="(max-width: 760px) 90vw, 360px" unoptimized style={{ objectFit: 'cover' }} /> : <div><Icon name="camera" size={44} /><span>Your photo, front and center.</span></div>}<span className="seller-condition">{form.condition}</span></div><div className="seller-preview-copy"><span className="eyebrow">{form.category}</span><h3>{form.title || 'Your item goes here.'}</h3><strong>{form.price ? formatPrice(form.price) : '₱0.00'}</strong><div><span className="seller-small-avatar">{(user?.name || 'You').slice(0, 1)}</span><span>{user?.name || 'Your name'}<small>Marketplace member</small></span></div></div></div>
      <section className="seller-tips"><Icon name="sparkles" size={26} /><h3>Good listings get<br />the little things right.</h3><ul><li>Take the photo in natural light.</li><li>Keep the price student-friendly.</li><li>Be upfront about signs of wear.</li><li>Choose a public campus meetup.</li></ul></section><Link href="/safety" className="seller-safety-link"><Icon name="shield" size={20} /><span>Read the campus trading guide</span><Icon name="arrow-up-right" size={18} /></Link></aside>
    </div>
  </div>;
}


