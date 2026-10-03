import React, { useState } from 'react';
import { X, Copy, Check, Share2, UserPlus, ShieldAlert, Sparkles } from 'lucide-react';

export interface InviteData {
  id: string;
  code: string;
  recipientName?: string;
  note?: string;
  maxUses: number;
  usedCount: number;
  isRevoked: boolean;
  expiresAt?: string | null;
  createdAt: string;
  qrCodeSvg?: string;
}

interface InviteModalProps {
  ownerName: string;
  onClose: () => void;
  onGenerateInvite: (params: { recipientName?: string; note?: string; maxUses: number; expiresInHours?: number | null }) => Promise<InviteData>;
  existingInvites: InviteData[];
  onRevokeInvite: (id: string) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  ownerName,
  onClose,
  onGenerateInvite,
  existingInvites,
  onRevokeInvite,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [isSingleUse, setIsSingleUse] = useState(true);
  const [expiryHours, setExpiryHours] = useState<number | null>(null);
  const [createdInvite, setCreatedInvite] = useState<InviteData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const invite = await onGenerateInvite({
        recipientName: recipientName.trim() || undefined,
        note: note.trim() || undefined,
        maxUses: isSingleUse ? 1 : 0,
        expiresInHours: expiryHours,
      });
      setCreatedInvite(invite);
    } catch {
      alert('Failed to generate invitation link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteUrl = createdInvite
    ? `${window.location.origin}/invite/${createdInvite.code}`
    : '';

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share && inviteUrl) {
      try {
        await navigator.share({
          title: `Chat with ${ownerName}`,
          text: createdInvite?.recipientName
            ? `Hi ${createdInvite.recipientName}, I made a private chat for us: `
            : `A private place to chat directly with ${ownerName}: `,
          url: inviteUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div
        className="onboarding-card"
        style={{ maxWidth: 480, margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="onboarding-badge">
            <UserPlus size={14} />
            <span>Invitation System</span>
          </div>
          <button className="icon-action-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="inbox-tabs" style={{ padding: 0, border: 'none' }}>
          <button
            className={`inbox-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Invite
          </button>
          <button
            className={`inbox-tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            Active Invites ({existingInvites.filter((i) => !i.isRevoked).length})
          </button>
        </div>

        {activeTab === 'create' ? (
          !createdInvite ? (
            <form className="onboarding-form" onSubmit={handleCreate}>
              <div>
                <h2 className="onboarding-title" style={{ fontSize: 18 }}>Invite Someone</h2>
                <p className="onboarding-desc">
                  Create a unique, private invitation link for someone to start a 1-on-1 channel with you.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Recipient Name (Optional Personalization)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah, David, Alex"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Personal Note (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. For our project discussions"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Usage Limit</label>
                  <select
                    className="form-input"
                    value={isSingleUse ? 'single' : 'multi'}
                    onChange={(e) => setIsSingleUse(e.target.value === 'single')}
                  >
                    <option value="single">Single Use (1 person only)</option>
                    <option value="multi">Multi Use (Unlimited)</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Expiration</label>
                  <select
                    className="form-input"
                    value={expiryHours === null ? 'never' : String(expiryHours)}
                    onChange={(e) => setExpiryHours(e.target.value === 'never' ? null : Number(e.target.value))}
                  >
                    <option value="never">Never Expires</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                    <option value="720">30 Days</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Sparkles size={16} />
                <span>{isSubmitting ? 'Generating...' : 'Generate Invitation Link'}</span>
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 className="onboarding-title" style={{ fontSize: 18 }}>Invitation Ready</h2>
                <p className="onboarding-desc">
                  {createdInvite.recipientName
                    ? `Personalized invitation created for ${createdInvite.recipientName}.`
                    : 'Your private invitation link is active and ready to share.'}
                </p>
              </div>

              {/* Link Box */}
              <div
                style={{
                  background: 'var(--bg-app)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--accent-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inviteUrl}
                </span>
                <button className="icon-action-btn" onClick={handleCopy} title="Copy Link">
                  {copied ? <Check size={16} color="var(--status-online)" /> : <Copy size={16} />}
                </button>
              </div>

              {/* QR Code Section */}
              {createdInvite.qrCodeSvg && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg-app)',
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <img
                    src={createdInvite.qrCodeSvg}
                    alt="Invite QR Code"
                    style={{ width: 140, height: 140, borderRadius: 8 }}
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Scan with camera to chat with {ownerName}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="submit-btn"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={handleShare}
                >
                  <Share2 size={16} />
                  <span>Share Link</span>
                </button>
                <button
                  className="control-btn"
                  style={{ padding: '0 16px' }}
                  onClick={() => {
                    setCreatedInvite(null);
                    setRecipientName('');
                    setNote('');
                  }}
                >
                  Create Another
                </button>
              </div>
            </div>
          )
        ) : (
          /* Manage Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
            {existingInvites.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
                No invites generated yet.
              </div>
            ) : (
              existingInvites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    background: 'var(--bg-app)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                      {inv.recipientName ? inv.recipientName : `Link #${inv.code}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {inv.code} • {inv.maxUses === 1 ? `${inv.usedCount}/1 Used` : `${inv.usedCount} Uses`}
                      {inv.isRevoked && ' • (Revoked)'}
                    </div>
                  </div>

                  {!inv.isRevoked && (
                    <button
                      className="control-btn"
                      style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                      onClick={() => onRevokeInvite(inv.id)}
                      title="Revoke link access"
                    >
                      <ShieldAlert size={13} />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
