import React from 'react';
import { Download, Share, PlusSquare, MoreVertical, X, Check, ShieldCheck } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  hasPrompt: boolean;
  onTriggerPrompt?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  hasPrompt,
  onTriggerPrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          padding: '24px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Download size={16} strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Install Gateway App
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                STANDALONE 1-ON-1 VAULT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Benefits bar */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={14} color="var(--status-online)" />
          <span>Full-screen app experience, background alerts &amp; instant biometric/vault access.</span>
        </div>

        {/* Direct native trigger button if browser supports it */}
        {hasPrompt && onTriggerPrompt && (
          <button
            type="button"
            className="land-primary-btn"
            onClick={onTriggerPrompt}
            style={{ padding: '10px 14px' }}
          >
            <Download size={15} />
            <span>Install Instantly</span>
          </button>
        )}

        {/* Step-by-Step Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {isIOS ? 'How to install on iOS Safari:' : 'How to install on Mobile & Desktop:'}
          </span>

          {isIOS ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-app)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Share size={14} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  <strong>1.</strong> Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-app)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlusSquare size={14} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  <strong>2.</strong> Scroll down and select <strong>"Add to Home Screen"</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-app)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-online)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  <strong>3.</strong> Tap <strong>"Add"</strong> in the top right corner.
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-app)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MoreVertical size={14} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  <strong>1.</strong> Tap your browser's menu <strong>(⋮ or ···)</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-app)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Download size={14} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  <strong>2.</strong> Tap <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          className="land-secondary-btn"
          onClick={onClose}
          style={{ marginTop: '4px' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};
