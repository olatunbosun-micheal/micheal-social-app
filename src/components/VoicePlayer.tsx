import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  url?: string;
  duration?: number;
  messageId: string;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ duration = 14 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const timerRef = useRef<number | null>(null);

  // Generate distinct pseudo-random waveform bar heights
  const bars = [12, 18, 24, 16, 28, 20, 14, 22, 26, 18, 12, 24, 30, 22, 16, 20, 28, 24, 18, 14, 22, 26, 16, 12];

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const playAudio = () => {
    setIsPlaying(true);
    const stepTime = 100 / playbackSpeed;
    const totalSteps = (duration * 1000) / stepTime;
    let currentStep = progress * totalSteps;

    timerRef.current = window.setInterval(() => {
      currentStep += 1;
      const newProgress = currentStep / totalSteps;
      if (newProgress >= 1) {
        setProgress(1);
        pauseAudio();
        setProgress(0);
      } else {
        setProgress(newProgress);
      }
    }, stepTime);
  };

  const pauseAudio = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds: (1 | 1.5 | 2)[] = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentTime = Math.floor(progress * duration);

  return (
    <div className="voice-note-player">
      <button className="voice-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: 2 }} />}
      </button>

      <div className="voice-waveform-container" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setProgress(clickRatio);
      }}>
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
        <span>{formatTime(isPlaying ? currentTime : duration)}</span>
        <span className="voice-speed-pill" onClick={toggleSpeed} title="Playback speed">
          {playbackSpeed}x
        </span>
      </div>
    </div>
  );
};
