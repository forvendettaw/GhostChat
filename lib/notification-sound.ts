let audioContext: AudioContext | null = null;

export function initAudioContext() {
  if (typeof window === 'undefined') return;
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  try {
    audioContext = new AudioContext();
  } catch (err) {
    console.error('AudioContext init failed:', err);
  }
}

export function playNotificationSound() {
  if (!audioContext) initAudioContext();
  if (!audioContext) return;
  
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = 800;
    gain.gain.value = 0.15;
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.15);
  } catch (err) {
    console.error('Sound failed:', err);
  }
}
