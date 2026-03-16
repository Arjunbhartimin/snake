import { useState, useEffect, useCallback } from 'react';

export const useAudio = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    if (!audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }, [audioContext]);

  const playEatSound = useCallback(() => {
    playTone(440, 'sine', 0.1);
    setTimeout(() => playTone(880, 'sine', 0.1), 50);
  }, [playTone]);

  const playGameOverSound = useCallback(() => {
    playTone(220, 'sawtooth', 0.5, 0.2);
    setTimeout(() => playTone(110, 'sawtooth', 0.5, 0.2), 100);
  }, [playTone]);

  const playLevelUpSound = useCallback(() => {
    playTone(523.25, 'square', 0.1);
    setTimeout(() => playTone(659.25, 'square', 0.1), 100);
    setTimeout(() => playTone(783.99, 'square', 0.2), 200);
  }, [playTone]);

  const playClickSound = useCallback(() => {
    playTone(1000, 'sine', 0.05, 0.05);
  }, [playTone]);

  return { playEatSound, playGameOverSound, playLevelUpSound, playClickSound };
};
