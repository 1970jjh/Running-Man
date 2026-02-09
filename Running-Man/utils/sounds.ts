// 사운드 유틸리티 - Web Audio API를 사용한 알림음 생성

// AudioContext 싱글톤
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
};

// 오디오 컨텍스트 resume (사용자 상호작용 후 필요)
export const resumeAudioContext = async () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume();
  }
};

/**
 * 매수/매도 체결음 - 경쾌한 'Ding dong' 사운드
 * 실제 주식 체결음과 비슷한 두 개의 음이 연속으로 울리는 소리
 */
export const playTradeSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 첫 번째 음 (Ding) - 높은 음
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1200, now);
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialDecayTo?.(0.01, now + 0.15) || gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // 두 번째 음 (Dong) - 약간 낮은 음
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(900, now + 0.12);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.25, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.35);
};

/**
 * 스텝 전환 알림음 - 부드러운 차임 소리
 * 귀에 부담되지 않는 간단한 알림음
 */
export const playStepChangeSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 상승하는 두 음으로 긍정적인 알림
  const frequencies = [523.25, 659.25]; // C5, E5

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);

    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.3);
  });
};

/**
 * 매매시간 종료 알람음 - 따르릉 벨 소리
 * 타이머 종료를 알리는 명확한 알람 소리
 */
export const playTimerEndSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 벨 소리를 시뮬레이션 - 빠르게 진동하는 고음
  for (let i = 0; i < 3; i++) {
    const startTime = now + i * 0.25;

    // 메인 벨 음
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, startTime);

    // 빠른 떨림 효과
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(25, startTime);
    lfoGain.gain.setValueAtTime(50, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(startTime);
    lfo.stop(startTime + 0.2);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }
};

/**
 * 최종 결과 발표음 - 팡파레 느낌
 */
export const playFinalResultSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 상승하는 세 음으로 팡파레 효과
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.15);

    gain.gain.setValueAtTime(0, now + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.05);
    gain.gain.setValueAtTime(0.25, now + i * 0.15 + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.5);
  });
};
