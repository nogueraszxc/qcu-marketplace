import Icon from './Icon';

export function StatusBadge({ status, context = 'listing' }) {
  const normalized = (status || 'Pending').toLowerCase();
  const approved = ['approved', 'active', 'accepted', 'completed', 'sold'].includes(normalized);
  const rejected = ['rejected', 'cancelled'].includes(normalized);
  const label = normalized === 'approved' ? 'Active' : normalized === 'pending' && context === 'listing' ? 'Under review' : status || 'Pending';
  return <span className={`badge ws-status ${approved ? 'badge-success' : rejected ? 'ws-status-danger' : 'badge-warning'}`}><span aria-hidden="true" />{label}</span>;
}

export function LoadingBlock({ text = 'Loading…' }) {
  return <div className="ws-loading" role="status"><span className="ws-loading-indicator" aria-hidden="true" /><p>{text}</p></div>;
}

export function EmptyBlock({ icon = 'box', title, text, action }) {
  return <div className="empty-state ws-empty"><div className="ws-empty-icon"><Icon name={icon} size={28} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
