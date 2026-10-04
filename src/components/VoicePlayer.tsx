import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  url?: string;
  duration?: number;
  messageId: string;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ url, duration = 14 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate distinct pseudo-random waveform bar heights
  const bars = [12, 18, 24, 16, 28, 20, 14, 22, 26, 18, 12, 24, 30, 22, 16, 20, 28, 24, 18, 14, 22, 26, 16, 12];

  useEffect(() => {
    if (url) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleEnded);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || duration;
      setProgress(current / total);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play().catch(e => console.error("Audio play error:", e));
      setIsPlaying(true);
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds: (1 | 1.5 | 2)[] = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentTime = audioRef.current ? audioRef.current.currentTime : 0;
  const displayTime = isPlaying ? currentTime : (audioRef.current?.duration || duration);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current) {
      audioRef.current.currentTime = clickRatio * (audioRef.current.duration || duration);
    }
    setProgress(clickRatio);
  };

  return (
    <div className="voice-note-player">
      <button className="voice-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: 2 }} />}
      </button>

      <div className="voice-waveform-container" onClick={handleSeek}>
        {bars.map((h, i) => {
          const isBarPlayed = i / bars.length <= progress;
          return (
            <div
              key={i}
              className={`waveform-bar ${isBarPlayed ? 'played' : ''}`}
              style={{
                height: `${h}px`,
                transform: isPlaying && isBarPlayed ? 'scaleY(1.15)' : 'none',
              }}
            />
          );
        })}
      </div>

      <div className="voice-meta">
        <span>{formatTime(displayTime)}</span>
        <span className="voice-speed-pill" onClick={toggleSpeed} title="Playback speed">
          {playbackSpeed}x
        </span>
      </div>
    </div>
  );
};
