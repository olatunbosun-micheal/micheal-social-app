import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../../types';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Phone,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Shield,
} from 'lucide-react';
import { realtimeClient } from '../../services/realtimeClient';
import { soundFX } from '../../services/soundEffects';

export interface CallSession {
  targetUser: User;
  conversationId: string;
  isVideo: boolean;
  direction: 'outgoing' | 'incoming';
  status: 'calling' | 'ringing' | 'connected' | 'ended';
}

interface CallModalProps {
  session: CallSession;
  currentUser: User;
  onEndCall: () => void;
  onAcceptCall: (isVideo: boolean) => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const CallModal: React.FC<CallModalProps> = ({
  session,
  currentUser: _currentUser,
  onEndCall,
  onAcceptCall,
}) => {
  const [callStatus, setCallStatus] = useState<CallSession['status']>(session.status);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(session.isVideo);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationRef = useRef(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);

  // Sync internal call status with prop updates
  useEffect(() => {
    setCallStatus(session.status);
  }, [session.status]);

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Start call timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      soundFX.stopRingtone();
      durationRef.current = 0;
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus]);

  // Audio ringtone playback for calling / ringing states
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'ringing') {
      soundFX.playRingtone();
    } else {
      soundFX.stopRingtone();
    }

    return () => {
      soundFX.stopRingtone();
    };
  }, [callStatus]);

  // Initialize or cleanup PeerConnection
  const initPeerConnection = () => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Handle ICE Candidates generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        realtimeClient.sendCallSignal({
          targetUserId: session.targetUser.id,
          signal: { type: 'candidate', candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate },
        });
      }
    };

    // Handle remote media track reception
    pc.ontrack = (event) => {
      console.log('WebRTC ontrack event received:', event.track.kind);
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        stream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = stream;
      }

      // 1. Play audio via dedicated HTMLAudioElement
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = isSpeakerMuted;
        const playPromise = remoteAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio autoplay blocked by browser policy, unlocking on click:', err);
            const unlock = () => {
              remoteAudioRef.current?.play().catch(() => {});
              window.removeEventListener('click', unlock);
              window.removeEventListener('touchstart', unlock);
            };
            window.addEventListener('click', unlock);
            window.addEventListener('touchstart', unlock);
          });
        }
      }

      // 2. Play video via HTMLVideoElement (muted to prevent feedback & browser autoplay pause)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = true;
        const vidPromise = remoteVideoRef.current.play();
        if (vidPromise !== undefined) {
          vidPromise.catch((err) => {
            console.warn('Video element play error:', err);
          });
        }
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      setHasRemoteVideo(hasVideo);
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    return pc;
  };

  // Request user media stream (mic with echo-cancellation + optional camera)
  const acquireLocalMedia = async (videoWanted: boolean) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: videoWanted
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && videoWanted) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err: unknown) {
      console.warn('Could not acquire media with video, falling back to audio:', err);
      // Fallback to audio-only if video fails (e.g. no camera attached)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = audioStream;
        setIsVideoEnabled(false);
        return audioStream;
      } catch {
        setMediaError('Microphone or camera permission denied.');
        return null;
      }
    }
  };

  // Flush queued ICE candidates
  const drainPendingCandidates = async (pc: RTCPeerConnection) => {
    for (const cand of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Queued ICE candidate application failed:', err);
      }
    }
    pendingCandidatesRef.current = [];
  };

  // Setup Call: Outgoing or Connected
  useEffect(() => {
    let isSubscribed = true;

    const setupCall = async () => {
      if (session.direction === 'outgoing' && callStatus === 'calling') {
        // Outgoing initiator: acquire local media and prepare peer connection
        const stream = await acquireLocalMedia(session.isVideo);
        if (!stream || !isSubscribed) return;

        const pc = initPeerConnection();
        stream.getTracks().forEach((track) => {
          const senders = pc.getSenders();
          if (!senders.some((s) => s.track === track)) {
            pc.addTrack(track, stream);
          }
        });

        // Create WebRTC Offer
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          realtimeClient.sendCallSignal({
            targetUserId: session.targetUser.id,
            signal: { type: 'offer', sdp: offer.sdp },
          });
        } catch (e) {
          console.error('Failed to create offer:', e);
        }
      }
    };

    setupCall();

    // Listen for WebRTC signals (Offer, Answer, Candidate)
    const handleSignal = async (data: { signal: { type: string; sdp?: string; candidate?: RTCIceCandidateInit } }) => {
      const pc = initPeerConnection();
      const { signal } = data;

      try {
        if (signal.type === 'offer' && signal.sdp) {
          const stream = localStreamRef.current || (await acquireLocalMedia(session.isVideo));
          if (stream) {
            stream.getTracks().forEach((track) => {
              const senders = pc.getSenders();
              if (!senders.some((s) => s.track === track)) {
                pc.addTrack(track, stream);
              }
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          await drainPendingCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          realtimeClient.sendCallSignal({
            targetUserId: session.targetUser.id,
            signal: { type: 'answer', sdp: answer.sdp },
          });
        } else if (signal.type === 'answer' && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          await drainPendingCandidates(pc);
          setCallStatus('connected');
        } else if (signal.type === 'candidate' && signal.candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              pendingCandidatesRef.current.push(signal.candidate);
            }
          } catch (candErr) {
            console.warn('ICE candidate addition failed:', candErr);
          }
        }
      } catch (err) {
        console.error('Signaling handling error:', err);
      }
    };

    // Listen for call accepted
    const handleCallAccepted = async () => {
      setCallStatus('connected');
      soundFX.stopRingtone();
      const pc = initPeerConnection();

      // Ensure local tracks are attached before creating offer if not sent yet
      const stream = localStreamRef.current || (await acquireLocalMedia(session.isVideo));
      if (stream) {
        stream.getTracks().forEach((track) => {
          const senders = pc.getSenders();
          if (!senders.some((s) => s.track === track)) {
            pc.addTrack(track, stream);
          }
        });
      }

      if (!pc.localDescription) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          realtimeClient.sendCallSignal({
            targetUserId: session.targetUser.id,
            signal: { type: 'offer', sdp: offer.sdp },
          });
        } catch (err) {
          console.error('Call accepted offer creation error:', err);
        }
      }
    };

    // Listen for call ended / rejected
    const handleCallEnded = () => {
      setCallStatus('ended');
      soundFX.playCallEnd();
      setTimeout(cleanupAndClose, 1200);
    };

    realtimeClient.on('call.signal', handleSignal);
    realtimeClient.on('call.accepted', handleCallAccepted);
    realtimeClient.on('call.rejected', handleCallEnded);
    realtimeClient.on('call.ended', handleCallEnded);

    return () => {
      isSubscribed = false;
      realtimeClient.off('call.signal', handleSignal);
      realtimeClient.off('call.accepted', handleCallAccepted);
      realtimeClient.off('call.rejected', handleCallEnded);
      realtimeClient.off('call.ended', handleCallEnded);
    };
  }, []);

  // Cleanup all media streams and connections
  const cleanupAndClose = () => {
    soundFX.stopRingtone();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    onEndCall();
  };

  // End call trigger with duration and status logging
  const handleEndCall = () => {
    soundFX.playCallEnd();
    const finalDuration = durationRef.current;
    const finalStatus = finalDuration > 0 ? 'completed' : (session.direction === 'outgoing' ? 'cancelled' : 'missed');

    realtimeClient.endCall({
      targetUserId: session.targetUser.id,
      conversationId: session.conversationId,
      duration: finalDuration,
      isVideo: session.isVideo,
      status: finalStatus,
    });
    setCallStatus('ended');
    setTimeout(cleanupAndClose, 1000);
  };

  // Reject call trigger
  const handleRejectCall = () => {
    soundFX.playCallEnd();
    realtimeClient.rejectCall({
      targetUserId: session.targetUser.id,
      conversationId: session.conversationId,
      isVideo: session.isVideo,
    });
    setCallStatus('ended');
    setTimeout(cleanupAndClose, 1000);
  };

  // Accept incoming call trigger
  const handleAccept = async (video: boolean) => {
    setCallStatus('connected');
    soundFX.stopRingtone();
    setIsVideoEnabled(video);

    const stream = await acquireLocalMedia(video);
    const pc = initPeerConnection();

    if (stream) {
      stream.getTracks().forEach((track) => {
        const senders = pc.getSenders();
        if (!senders.some((s) => s.track === track)) {
          pc.addTrack(track, stream);
        }
      });
    }

    onAcceptCall(video);
    realtimeClient.acceptCall({
      targetUserId: session.targetUser.id,
      conversationId: session.conversationId,
      isVideo: video,
    });
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      // Turn video on
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = videoStream.getVideoTracks()[0];
        if (localStreamRef.current && newTrack) {
          localStreamRef.current.addTrack(newTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          if (pcRef.current) {
            pcRef.current.addTrack(newTrack, localStreamRef.current);
          }
        }
        setIsVideoEnabled(true);
      } catch (e) {
        console.warn('Could not enable video:', e);
      }
    } else {
      // Turn video off
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      setIsVideoEnabled(false);
    }
  };

  // Toggle Speaker Audio Mute
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
      setIsSpeakerMuted(!isSpeakerMuted);
    }
  };

  return (
    <div
      className={`call-overlay-backdrop ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(5, 7, 11, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Hidden audio element for remote stream audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div
        className="call-modal-container"
        style={{
          width: '100%',
          maxWidth: session.isVideo ? (isFullscreen ? '100vw' : '880px') : '420px',
          height: session.isVideo ? (isFullscreen ? '100vh' : '580px') : 'auto',
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-strong)',
          borderRadius: isFullscreen ? 0 : 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(13, 18, 28, 0.7)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: callStatus === 'connected' ? 'var(--status-online)' : 'var(--accent-warning)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'currentColor',
                  animation: callStatus === 'connected' ? 'none' : 'pulse 1.2s infinite',
                }}
              />
              {session.isVideo ? 'Secure Video Link' : 'Direct Audio Feed'}
            </span>

            {callStatus === 'connected' && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  marginLeft: 8,
                }}
              >
                {formatDuration(duration)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {session.isVideo && (
              <button
                className="icon-action-btn"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Media Error Message */}
        {mediaError && (
          <div
            style={{
              padding: '10px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-danger)',
              fontSize: 12.5,
              textAlign: 'center',
            }}
          >
            {mediaError}
          </div>
        )}

        {/* Call Body */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#04060a',
            overflow: 'hidden',
            minHeight: session.isVideo ? 400 : 280,
          }}
        >
          {/* Video Streams */}
          {session.isVideo && (
            <>
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: hasRemoteVideo && callStatus === 'connected' ? 'block' : 'none',
                }}
              />

              {/* Local Video Picture-in-Picture Preview */}
              {isVideoEnabled && (
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 130,
                    height: 98,
                    background: '#11141c',
                    border: '1.5px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    zIndex: 20,
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Mirror effect
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Avatar & Calling Info (shown in Audio call or while connecting/video off) */}
          {(!session.isVideo || !hasRemoteVideo || callStatus !== 'connected') && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '28px 20px',
                textAlign: 'center',
                zIndex: 5,
              }}
            >
              {/* Pulsing Avatar Frame */}
              <div
                style={{
                  position: 'relative',
                  width: 104,
                  height: 104,
                  marginBottom: 18,
                }}
              >
                {callStatus !== 'ended' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -6,
                      border: '2px solid var(--accent-primary)',
                      borderRadius: 'var(--radius-md)',
                      animation: 'pulse 1.8s infinite',
                      opacity: 0.6,
                    }}
                  />
                )}
                {session.targetUser.avatar ? (
                  <img
                    src={session.targetUser.avatar}
                    alt={session.targetUser.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {session.targetUser.name[0]}
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{session.targetUser.name}</span>
                {session.targetUser.role === 'owner' && (
                  <Shield size={16} color="var(--accent-primary)" />
                )}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 6,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {callStatus === 'calling' && 'Calling direct line...'}
                {callStatus === 'ringing' && 'Incoming call...'}
                {callStatus === 'connected' && formatDuration(duration)}
                {callStatus === 'ended' && 'Call terminated'}
              </div>
            </div>
          )}
        </div>

        {/* Incoming Call Answer/Decline Bar */}
        {session.direction === 'incoming' && callStatus === 'ringing' ? (
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <button
              onClick={handleRejectCall}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <PhoneOff size={16} />
              <span>Decline</span>
            </button>

            <button
              onClick={() => handleAccept(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Phone size={16} />
              <span>Answer Audio</span>
            </button>

            {session.isVideo && (
              <button
                onClick={() => handleAccept(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <VideoIcon size={16} />
                <span>Answer Video</span>
              </button>
            )}
          </div>
        ) : (
          /* Active Call Controls Bar */
          <div
            style={{
              padding: '16px 24px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            {/* Mute Mic Button */}
            <button
              className="icon-action-btn"
              onClick={toggleMute}
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-active)',
                color: isMuted ? '#ef4444' : 'var(--text-primary)',
                border: isMuted ? '1px solid #ef4444' : '1px solid var(--border-strong)',
              }}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
            </button>

            {/* Toggle Video Button */}
            <button
              className="icon-action-btn"
              onClick={toggleVideo}
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: !isVideoEnabled ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-active)',
                color: !isVideoEnabled ? '#ef4444' : 'var(--text-primary)',
                border: !isVideoEnabled ? '1px solid #ef4444' : '1px solid var(--border-strong)',
              }}
              title={isVideoEnabled ? 'Disable camera' : 'Enable camera'}
            >
              {isVideoEnabled ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            </button>

            {/* Toggle Speaker Button */}
            <button
              className="icon-action-btn"
              onClick={toggleSpeaker}
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: isSpeakerMuted ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-active)',
                color: isSpeakerMuted ? '#ef4444' : 'var(--text-primary)',
                border: isSpeakerMuted ? '1px solid #ef4444' : '1px solid var(--border-strong)',
              }}
              title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
            >
              {isSpeakerMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>

            {/* Hang Up Button */}
            <button
              onClick={handleEndCall}
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title="Hang up call"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
