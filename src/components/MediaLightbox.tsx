import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface MediaLightboxProps {
  url: string | null;
  caption?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, caption, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!url) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close-btn" onClick={onClose} title="Close (Esc)">
        <X size={22} />
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          maxWidth: '90%',
          maxHeight: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={url} alt="Expanded media" className="lightbox-image" />

        {caption && (
          <div style={{ color: '#fff', fontSize: 14, background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 8 }}>
            {caption}
          </div>
        )}

        <button
          className="control-btn"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
          onClick={() => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `media_${Date.now()}.png`;
            a.target = '_blank';
            a.click();
          }}
        >
          <Download size={14} />
          <span>Download Image</span>
        </button>
      </div>
    </div>
  );
};
