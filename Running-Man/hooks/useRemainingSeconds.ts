import { useEffect, useState } from 'react';
import { GameState } from '../types';
import { getRemainingSeconds, getServerNow } from '../firebase';

// 타이머 남은 시간(초). 진행 중이면 timerEndAt 기준으로 초가 바뀔 때마다 화면만 다시 그림
// (Firebase에는 쓰지 않음)
export const useRemainingSeconds = (
  gameState: Pick<GameState, 'timerSeconds' | 'isTimerRunning' | 'timerEndAt'> | null
): number => {
  const [, setTick] = useState(0);
  const timerEndAt = gameState?.isTimerRunning ? gameState.timerEndAt : null;

  useEffect(() => {
    if (!timerEndAt) return;

    let timeout: ReturnType<typeof setTimeout>;
    const scheduleNextTick = () => {
      const msLeft = timerEndAt - getServerNow();
      if (msLeft <= 0) {
        setTick(t => t + 1);
        return;
      }
      // 다음 초 경계 직후에 갱신
      timeout = setTimeout(() => {
        setTick(t => t + 1);
        scheduleNextTick();
      }, (msLeft % 1000) + 10);
    };

    scheduleNextTick();
    return () => clearTimeout(timeout);
  }, [timerEndAt]);

  return gameState ? getRemainingSeconds(gameState) : 0;
};
