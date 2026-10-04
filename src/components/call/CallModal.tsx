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
  SwitchCamera,
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
  const [isCallWithVideo, setIsCallWithVideo] = useState(session.isVideo);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [declineMessage, setDeclineMessage] = useState<string | null>(null);

  // Dynamic layout: automatically expand to video if either party enables video
  const isVideoLayout = isCallWithVideo || isVideoEnabled || hasRemoteVideo;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<string | null>(null);
  const callStatusRef = useRef<CallSession['status']>(session.status);
  const durationRef = useRef(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);

  // Sync internal call status with prop updates
  useEffect(() => {
    setCallStatus(session.status);
    callStatusRef.current = session.status;
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
        remoteAudioRef.current.volume = isSpeakerMuted ? 0 : 1.0;
        remoteAudioRef.current.muted = isSpeakerMuted;
        const playPromise = remoteAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio autoplay blocked by browser policy, unlocking on interaction:', err);
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

      // 2. Play video via HTMLVideoElement (unmuted so sound is heard directly)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = false; // UNMUTED: Audio is heard clearly
        remoteVideoRef.current.volume = isSpeakerMuted ? 0 : 1.0;
        const vidPromise = remoteVideoRef.current.play();
        if (vidPromise !== undefined) {
          vidPromise.catch((err) => {
            console.warn('Video element play error:', err);
          });
        }
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      setHasRemoteVideo(hasVideo);
      if (hasVideo) {
        setIsCallWithVideo(true);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        // Only set connected if user is not in ringing stage waiting to accept
        if (callStatusRef.current !== 'ringing') {
          setCallStatus('connected');
          callStatusRef.current = 'connected';
        }
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
          // If receiving an offer while user is still hearing ringtone (has not accepted yet):
          // BUFFER the offer! Do NOT auto-answer!
          if (callStatusRef.current === 'ringing') {
            console.log('Incoming offer buffered; waiting for recipient to click Accept');
            pendingOfferRef.current = signal.sdp;
            return;
          }

          const stream = localStreamRef.current || (await acquireLocalMedia(session.isVideo));
          if (stream) {
            stream.getTracks().forEach((track) => {
              const senders = pc.getSenders();
              if (!senders.some((s) => s.track === track)) {
                pc.addTrack(track, stream);
              }
            });
          }

          if (signal.sdp.includes('m=video') || (signal as { hasVideo?: boolean }).hasVideo) {
            setIsCallWithVideo(true);
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
          callStatusRef.current = 'connected';
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
      callStatusRef.current = 'connected';
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

    // Listen for call rejected by peer
    const handleCallRejected = () => {
      soundFX.stopRingtone();
      soundFX.playCallEnd();
      setCallStatus('ended');
      callStatusRef.current = 'ended';
      setDeclineMessage(`${session.targetUser.name} declined the call`);
      setTimeout(cleanupAndClose, 2000);
    };

    // Listen for call ended / terminated
    const handleCallEnded = (data?: { status?: string }) => {
      soundFX.stopRingtone();
      soundFX.playCallEnd();
      setCallStatus('ended');
      callStatusRef.current = 'ended';
      const msg = data?.status === 'cancelled' || (session.direction === 'incoming' && durationRef.current === 0)
        ? 'Call cancelled by caller'
        : 'Call ended';
      setDeclineMessage(msg);
      setTimeout(cleanupAndClose, 1500);
    };

    realtimeClient.on('call.signal', handleSignal);
    realtimeClient.on('call.accepted', handleCallAccepted);
    realtimeClient.on('call.accept', handleCallAccepted);
    realtimeClient.on('call.rejected', handleCallRejected);
    realtimeClient.on('call.reject', handleCallRejected);
    realtimeClient.on('call.ended', handleCallEnded);
    realtimeClient.on('call.end', handleCallEnded);

    return () => {
      isSubscribed = false;
      realtimeClient.off('call.signal', handleSignal);
      realtimeClient.off('call.accepted', handleCallAccepted);
      realtimeClient.off('call.accept', handleCallAccepted);
      realtimeClient.off('call.rejected', handleCallRejected);
      realtimeClient.off('call.reject', handleCallRejected);
      realtimeClient.off('call.ended', handleCallEnded);
      realtimeClient.off('call.end', handleCallEnded);
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
    soundFX.stopRingtone();
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
    callStatusRef.current = 'ended';
    setDeclineMessage(finalDuration > 0 ? 'Call ended' : 'Call cancelled');
    setTimeout(cleanupAndClose, 1200);
  };

  // Reject call trigger
  const handleRejectCall = () => {
    soundFX.stopRingtone();
    soundFX.playCallEnd();
    realtimeClient.rejectCall({
      targetUserId: session.targetUser.id,
      conversationId: session.conversationId,
      isVideo: session.isVideo,
      reason: 'declined',
    });
    setCallStatus('ended');
    callStatusRef.current = 'ended';
    setDeclineMessage('You declined the call');
    setTimeout(cleanupAndClose, 1800);
  };

  // Accept incoming call trigger
  const handleAccept = async (video: boolean) => {
    setCallStatus('connected');
    callStatusRef.current = 'connected';
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

    // If an SDP offer was buffered while ringing, now process and answer it!
    if (pendingOfferRef.current) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: pendingOfferRef.current }));
        await drainPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        realtimeClient.sendCallSignal({
          targetUserId: session.targetUser.id,
          signal: { type: 'answer', sdp: answer.sdp },
        });
        pendingOfferRef.current = null;
      } catch (e) {
        console.error('Failed to answer buffered offer on accept:', e);
      }
    }
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
        setIsCallWithVideo(true);
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: 'user',
          },
        });
        const newTrack = videoStream.getVideoTracks()[0];
        if (newTrack) {
          if (!localStreamRef.current) {
            localStreamRef.current = new MediaStream();
          }
          localStreamRef.current.addTrack(newTrack);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }

          const pc = pcRef.current;
          if (pc) {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStreamRef.current);
            }

            // Create and send SDP offer to renegotiate video track with peer
            try {
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });
              await pc.setLocalDescription(offer);
              realtimeClient.sendCallSignal({
                targetUserId: session.targetUser.id,
                signal: { type: 'offer', sdp: offer.sdp, hasVideo: true },
              });
            } catch (err) {
              console.warn('Renegotiation offer error:', err);
            }
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

          const pc = pcRef.current;
          if (pc) {
            const videoSender = pc.getSenders().find((s) => s.track === videoTrack || (s.track && s.track.kind === 'video'));
            if (videoSender) {
              pc.removeTrack(videoSender);
              try {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                await pc.setLocalDescription(offer);
                realtimeClient.sendCallSignal({
                  targetUserId: session.targetUser.id,
                  signal: { type: 'offer', sdp: offer.sdp, hasVideo: false },
                });
              } catch (err) {
                console.warn('Renegotiation off offer error:', err);
              }
            }
          }
        }
      }
      setIsVideoEnabled(false);
      if (!hasRemoteVideo) {
        setIsCallWithVideo(false);
      }
    }
  };

  // Toggle Speaker Audio Mute
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
      setIsSpeakerMuted(!isSpeakerMuted);
    }
  };

  // Toggle Camera Facing Mode (Front / Rear for Mobile)
  const toggleCameraFacing = async () => {
    if (!isVideoEnabled) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    try {
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: { exact: nextMode },
          },
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: nextMode },
        });
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack && pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      if (localStreamRef.current) {
        const oldVideo = localStreamRef.current.getVideoTracks()[0];
        if (oldVideo) {
          oldVideo.stop();
          localStreamRef.current.removeTrack(oldVideo);
        }
        if (newVideoTrack) {
          localStreamRef.current.addTrack(newVideoTrack);
        }
      }

      if (localVideoRef.current && newStream) {
        localVideoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.warn('Failed to switch camera:', err);
    }
  };

  return (
    <div
      className={`call-overlay-backdrop ${isFullscreen ? 'fullscreen' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={{
        position: 'fixed',
        inset: isMinimized ? 'auto' : 0,
        bottom: isMinimized ? 24 : undefined,
        right: isMinimized ? 24 : undefined,
        zIndex: 1000,
        background: isMinimized ? 'transparent' : 'rgba(5, 7, 11, 0.94)',
        backdropFilter: isMinimized ? 'none' : 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMinimized ? 0 : 16,
        pointerEvents: isMinimized ? 'none' : 'auto',
      }}
    >
      {/* Hidden audio element for remote stream audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div
        className="call-modal-container"
        style={{
          width: isMinimized ? '160px' : '100%',
          maxWidth: isMinimized ? '160px' : (isVideoLayout ? (isFullscreen ? '100vw' : '880px') : '420px'),
          height: isMinimized ? (isVideoLayout ? '120px' : 'auto') : (isVideoLayout ? (isFullscreen ? '100vh' : 'auto') : 'auto'),
          maxHeight: isFullscreen && !isMinimized ? '100vh' : '90vh',
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-strong)',
          borderRadius: isFullscreen && !isMinimized ? 0 : 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'auto',
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
              {isVideoLayout ? 'Secure Video Link' : 'Direct Audio Feed'}
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
            <button
              className="icon-action-btn"
              onClick={() => {
                if (!isMinimized) setIsFullscreen(false);
                setIsMinimized(!isMinimized);
              }}
              title={isMinimized ? 'Expand Call' : 'Minimize Call'}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            {isVideoLayout && !isMinimized && (
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
            minHeight: isVideoLayout ? 400 : 280,
          }}
        >
          {/* Video Streams */}
          {isVideoLayout && (
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
                  className="call-pip-preview"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: isMinimized ? '40px' : '110px',
                    height: isMinimized ? '40px' : '140px',
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
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    }}
                  />
                  <button
                    onClick={toggleCameraFacing}
                    title="Flip camera (front / rear)"
                    style={{
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 5,
                    }}
                  >
                    <SwitchCamera size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Avatar & Calling Info (shown in Audio call or while connecting/video off) */}
          {(!isVideoLayout || !hasRemoteVideo || callStatus !== 'connected') && (
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
                    {session.targetUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
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

              {declineMessage ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.16)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    fontWeight: 700,
                    fontSize: 13.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <PhoneOff size={15} />
                  <span>{declineMessage}</span>
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>

        {/* Incoming Call Answer/Decline Bar */}
        {session.direction === 'incoming' && callStatus === 'ringing' ? (
          <div
            className="call-answer-bar"
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
        ) : callStatus === 'ended' ? (
          <div
            style={{
              padding: '18px 24px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <PhoneOff size={15} color="#ef4444" />
            <span>{declineMessage || 'Call ended'}</span>
          </div>
        ) : (
          /* Active Call Controls Bar */
          <div
            className="call-controls-bar"
            style={{
              padding: isMinimized ? '8px 12px' : '16px 24px',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMinimized ? 8 : 16,
            }}
          >
            {/* Mute Mic Button */}
            <button
              className="icon-action-btn"
              onClick={toggleMute}
              style={{
                width: isMinimized ? 36 : 44,
                height: isMinimized ? 36 : 44,
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
                width: isMinimized ? 36 : 44,
                height: isMinimized ? 36 : 44,
                borderRadius: 'var(--radius-sm)',
                background: !isVideoEnabled ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-active)',
                color: !isVideoEnabled ? '#ef4444' : 'var(--text-primary)',
                border: !isVideoEnabled ? '1px solid #ef4444' : '1px solid var(--border-strong)',
              }}
              title={isVideoEnabled ? 'Disable camera' : 'Enable camera'}
            >
              {isVideoEnabled ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            </button>

            {/* Flip Camera Button (Front / Rear) */}
            {isVideoEnabled && !isMinimized && (
              <button
                className="icon-action-btn"
                onClick={toggleCameraFacing}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-active)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}
                title="Flip camera (front / rear)"
              >
                <SwitchCamera size={19} />
              </button>
            )}

            {/* Toggle Speaker Button */}
            <button
              className="icon-action-btn"
              onClick={toggleSpeaker}
              style={{
                width: isMinimized ? 36 : 44,
                height: isMinimized ? 36 : 44,
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
                width: isMinimized ? 36 : 44,
                height: isMinimized ? 36 : 44,
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
