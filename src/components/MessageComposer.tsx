import React, { useState, useRef } from 'react';
import { Paperclip, Mic, Send, X, Image, FileText, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { ReplyContext } from '../types';
import { soundFX } from '../services/soundEffects';
import { API_BASE } from '../config';

interface MessageComposerProps {
  onSendMessage: (
    content: string,
    type?: 'text' | 'image' | 'video' | 'file' | 'audio',
    fileData?: { url: string; fileName: string; fileSize: number; duration?: number }
  ) => void;
  replyTo: ReplyContext | null;
  onClearReply: () => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  isOtherPartyBlocked?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  replyTo,
  onClearReply,
  onTypingStart,
  onTypingStop,
  isOtherPartyBlocked = false,
}) => {
  const [text, setText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Handle typing triggers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      onTypingStop();
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    soundFX.playSend();
    onSendMessage(text.trim(), 'text');
    setText('');
    onClearReply();
    onTypingStop();
  };

  // Start Live Voice Recording
  const startRecording = async () => {
    try {
      soundFX.playRecordStart();
      setIsRecording(true);
      setRecordingSeconds(0);
      audioChunksRef.current = [];

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          recorder.start();
        } catch {
          // Microphone permission not granted or unsupported; mock recording timer continues
        }
      }
    } catch {
      // Audio record fallback
    }
  };

  // Stop & Send Voice Note
  const stopAndSendRecording = () => {
    soundFX.playRecordStop();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = Math.max(1, recordingSeconds);
    const chunks = [...audioChunksRef.current];
    setIsRecording(false);
    setRecordingSeconds(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });

          const token = localStorage.getItem('gateway_token');
          const formData = new FormData();
          formData.append('file', audioFile);

          const res = await fetch(`${API_BASE}/media/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            onSendMessage(`Voice note (${duration}s)`, 'audio', {
              url: data.url,
              fileName: data.fileName || audioFile.name,
              fileSize: data.fileSize || audioBlob.size,
              duration,
            });
          } else {
            onSendMessage(`Voice note (${duration}s)`, 'audio', {
              url: URL.createObjectURL(audioBlob),
              fileName: audioFile.name,
              fileSize: audioBlob.size,
              duration,
            });
          }
        } catch (e) {
          console.error('Failed to upload voice note:', e);
        } finally {
          recorder.stream.getTracks().forEach((track) => track.stop());
        }
      };
      recorder.stop();
    } else {
      setUploadError('Microphone permission or device required to record voice notes.');
    }
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    soundFX.playRecordStop();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle File Upload — uploads to server, gets back a permanent URL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected if needed
    e.target.value = '';

    setShowAttachmentMenu(false);
    setUploadError(null);
    setIsUploading(true);

    try {
      const token = localStorage.getItem('gateway_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const attachment = await res.json();
      // attachment = { id, type, url, fileName, fileSize, mimeType }

      const caption = text.trim() || file.name;
      onSendMessage(
        caption,
        attachment.type as 'image' | 'video' | 'audio' | 'file',
        {
          url: attachment.url,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
        }
      );
      setText('');
      onClearReply();
      soundFX.playSend();
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setIsUploading(false);
    }
  };


  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isOtherPartyBlocked) {
    return (
      <div className="composer-container">
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
          This contact is blocked. Messaging is disabled.
        </div>
      </div>
    );
  }

  return (
    <div className="composer-container">
      {/* Upload Error Banner */}
      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(244,63,94,0.12)', color: 'var(--accent-danger)', fontSize: 13, borderTop: '1px solid rgba(244,63,94,0.25)' }}>
          <AlertCircle size={14} />
          <span>{uploadError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setUploadError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Upload Progress Banner */}
      {isUploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(99,102,241,0.10)', color: 'var(--accent-primary)', fontSize: 13, borderTop: '1px solid var(--border-subtle)' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Uploading file...</span>
        </div>
      )}

      {/* Quoted Reply Banner */}
      {replyTo && (
        <div className="composer-reply-banner">
          <div>
            <div style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '12px' }}>
              Replying to {replyTo.senderName}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              {replyTo.content}
            </div>
          </div>
          <button className="icon-action-btn" onClick={onClearReply}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Attachment Menu Popover */}
      {showAttachmentMenu && (
        <div className="attachment-popover">
          <button
            className="attachment-option"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={18} color="#6366f1" />
            <span>Photos & Videos</span>
          </button>
          <button
            className="attachment-option"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText size={18} color="#06b6d4" />
            <span>Document / PDF</span>
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <div className="composer-main-row">
        {isRecording ? (
          /* Active Voice Recording Bar */
          <div className="voice-recording-bar">
            <div className="voice-recording-status">
              <div className="pulsing-rec-dot" />
              <span>Recording {formatRecordTime(recordingSeconds)}</span>
            </div>

            <div className="voice-recording-controls">
              <button className="cancel-rec-btn" onClick={cancelRecording}>
                <Trash2 size={16} />
                <span>Cancel</span>
              </button>

              <button
                className="send-circle-btn"
                style={{ width: 36, height: 36 }}
                onClick={stopAndSendRecording}
                title="Send Voice Message"
              >
                <CheckCircle2 size={20} />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Composer Input */
          <>
            <div className="composer-input-box">
              <button
                className="composer-action-btn"
                onClick={() => {
                  setShowAttachmentMenu(!showAttachmentMenu);
                }}
                title="Attach media or document"
              >
                <Paperclip size={20} />
              </button>

              <textarea
                className="composer-textarea"
                placeholder="Type a message..."
                rows={1}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {text.trim() ? (
              <button
                className="send-circle-btn"
                onClick={handleSend}
                title="Send message (Enter)"
              >
                <Send size={18} style={{ marginLeft: 2 }} />
              </button>
            ) : (
              <button
                className="send-circle-btn"
                onClick={startRecording}
                title="Record voice message"
              >
                <Mic size={20} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
