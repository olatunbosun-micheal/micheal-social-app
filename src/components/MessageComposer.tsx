import React, { useState, useRef } from 'react';
import { Paperclip, Mic, Send, X, Image, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import type { ReplyContext } from '../types';
import { soundFX } from '../services/soundEffects';

interface MessageComposerProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file' | 'audio', fileData?: { url: string; fileName: string; fileSize: number; duration?: number }) => void;
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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    const duration = Math.max(1, recordingSeconds);
    const audioUrl = 'recorded_voice_blob';
    onSendMessage(`Voice note (${duration}s)`, 'audio', {
      url: audioUrl,
      fileName: `Voice_Note_${Date.now()}.m4a`,
      fileSize: 32000 * duration,
      duration: duration,
    });

    setIsRecording(false);
    setRecordingSeconds(0);
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
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Handle File Upload Simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachmentMenu(false);
    const isImg = file.type.startsWith('image/');
    const previewUrl = URL.createObjectURL(file);

    onSendMessage(
      isImg ? 'Photo attachment' : file.name,
      isImg ? 'image' : 'file',
      {
        url: previewUrl,
        fileName: file.name,
        fileSize: file.size,
      }
    );
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
