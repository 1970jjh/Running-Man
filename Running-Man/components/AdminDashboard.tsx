
import React, { useState, useEffect } from 'react';
import { GameState, GameStatus, GameStep, Team } from '../types';
import { STOCK_DATA, INITIAL_SEED_MONEY, INFO_CARDS, STEP_NAMES, getInfoPrice } from '../constants';

interface AdminDashboardProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ gameState, setGameState }) => {
  const [setupRoomName, setSetupRoomName] = useState('금융사관학교 1기');
  const [setupTeams, setSetupTeams] = useState(5);
  const [setupMaxRounds, setSetupMaxRounds] = useState(4);
  const [timerInput, setTimerInput] = useState(300);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultStep, setResultStep] = useState<'stocks' | 'teams'>('stocks');

  // 단계 순서 정의
  const steps = [
    { key: GameStep.MINI_GAME, label: '미니게임', icon: '🎮' },
    { key: GameStep.INFO_PURCHASE, label: '정보구매', icon: '📊' },
    { key: GameStep.INFO_NEGOTIATION, label: '정보협상', icon: '🤝' },
    { key: GameStep.INVESTMENT, label: '투자', icon: '💰' },
    { key: GameStep.RESULT, label: '결과발표', icon: '📈' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === gameState.currentStep);

  // 방 생성
  const startRoom = () => {
    const teams: Team[] = Array.from({ length: setupTeams }).map((_, i) => ({
      id: `team-${i + 1}`,
      number: i + 1,
      leaderName: '',
      members: [],
      currentCash: INITIAL_SEED_MONEY,
      portfolio: {},
      unlockedCards: [],
      grantedInfoCount: 0,
      purchasedInfoCountPerRound: {},
      roundResults: []
    }));

    setGameState(prev => ({
      ...prev,
      roomName: setupRoomName,
      totalTeams: setupTeams,
      maxRounds: setupMaxRounds,
      currentRound: 1,
      currentStatus: GameStatus.ROUND_1,
      currentStep: GameStep.MINI_GAME,
      completedSteps: [],
      teams,
      stocks: STOCK_DATA,
      isInvestmentLocked: true,
      revealedResults: false
    }));
  };

  // 단계 변경 (순차적으로만 가능)
  const handleStepChange = (step: GameStep, stepIdx: number) => {
    if (stepIdx > currentStepIndex + 1) return; // 순차적으로만 진행 가능

    // 이전 단계들을 완료로 표시
    const newCompletedSteps = steps.slice(0, stepIdx).map(s => s.key);

    setGameState(prev => ({
      ...prev,
      currentStep: step,
      completedSteps: newCompletedSteps,
      // 결과발표 단계면 결과 모달 표시
      revealedResults: step === GameStep.RESULT
    }));

    if (step === GameStep.RESULT) {
      calculateRoundResults();
      setShowResultModal(true);
      setResultStep('stocks');
    }
  };

  // 라운드 결과 계산
  const calculateRoundResults = () => {
    const roundIdx = gameState.currentRound;

    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(team => {
        // 현재 포트폴리오 가치 계산
        const portfolioValue = Object.entries(team.portfolio).reduce((sum, [stockId, qty]) => {
          const stock = prev.stocks.find(s => s.id === stockId);
          const price = stock?.prices[roundIdx] || 0;
          return sum + (qty * price);
        }, 0);

        const totalValue = team.currentCash + portfolioValue;
        const profitRate = ((totalValue - INITIAL_SEED_MONEY) / INITIAL_SEED_MONEY) * 100;

        // 이전 누적 수익률
        const prevCumulativeRate = team.roundResults.length > 0
          ? team.roundResults[team.roundResults.length - 1].cumulativeProfitRate
          : 0;

        const newRoundResult = {
          round: roundIdx,
          portfolioValue,
          totalValue,
          profitRate,
          cumulativeProfitRate: prevCumulativeRate + profitRate
        };

        return {
          ...team,
          roundResults: [...team.roundResults, newRoundResult]
        };
      })
    }));
  };

  // 다음 라운드로 진행
  const nextRound = () => {
    const rounds = [GameStatus.ROUND_1, GameStatus.ROUND_2, GameStatus.ROUND_3, GameStatus.ROUND_4, GameStatus.FINISHED];
    const currentIdx = rounds.indexOf(gameState.currentStatus);

    if (currentIdx >= gameState.maxRounds) {
      setGameState(prev => ({ ...prev, currentStatus: GameStatus.FINISHED }));
      return;
    }

    const nextStatus = rounds[currentIdx + 1];

    setGameState(prev => ({
      ...prev,
      currentStatus: nextStatus,
      currentRound: prev.currentRound + 1,
      currentStep: GameStep.MINI_GAME,
      completedSteps: [],
      isTimerRunning: false,
      isInvestmentLocked: true,
      revealedResults: false,
      // 팀별 라운드당 구매 개수 초기화
      teams: prev.teams.map(t => ({
        ...t,
        purchasedInfoCountPerRound: {
          ...t.purchasedInfoCountPerRound,
          [prev.currentRound + 1]: 0
        }
      }))
    }));

    setShowResultModal(false);
  };

  // 정보 구매권 부여
  const grantInfo = (teamId: string, count: number) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t =>
        t.id === teamId
          ? { ...t, grantedInfoCount: Math.max(0, t.grantedInfoCount + count) }
          : t
      )
    }));
  };

  // 타이머 관리
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.isTimerRunning && gameState.timerSeconds > 0) {
      interval = setInterval(() => {
        setGameState(prev => ({ ...prev, timerSeconds: prev.timerSeconds - 1 }));
      }, 1000);
    } else if (gameState.timerSeconds === 0 && gameState.isTimerRunning) {
      setGameState(prev => ({ ...prev, isTimerRunning: false, isInvestmentLocked: true }));
    }
    return () => clearInterval(interval);
  }, [gameState.isTimerRunning, gameState.timerSeconds]);

  // 투자 시작
  const startInvestment = () => {
    setGameState(prev => ({
      ...prev,
      timerSeconds: timerInput,
      timerMaxSeconds: timerInput,
      isTimerRunning: true,
      isInvestmentLocked: false
    }));
  };

  // 투자 일시 정지/재개
  const toggleInvestmentLock = () => {
    setGameState(prev => ({
      ...prev,
      isInvestmentLocked: !prev.isInvestmentLocked,
      isTimerRunning: prev.isInvestmentLocked // 잠금 해제 시 타이머 재개
    }));
  };

  // 게임 시작 전 설정 화면
  if (gameState.currentStatus === GameStatus.IDLE || gameState.currentStatus === GameStatus.READY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 iso-grid">
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-xl p-10 rounded-3xl max-w-xl w-full border border-slate-700/50">
          {/* 헤더 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-3xl">🏦</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">새로운 게임 생성</h2>
            <p className="text-slate-400 text-sm">투자 시뮬레이션을 시작합니다</p>
          </div>

          <div className="space-y-6">
            {/* 방 이름 */}
            <div>
              <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider">
                방 이름
              </label>
              <input
                type="text"
                value={setupRoomName}
                onChange={e => setSetupRoomName(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600/50 text-white focus:border-indigo-500 outline-none transition-all font-medium"
                placeholder="방 이름을 입력하세요"
              />
            </div>

            {/* 팀 개수 & 라운드 설정 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider">
                  참여 팀 수 (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={setupTeams}
                  onChange={e => setSetupTeams(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600/50 text-white focus:border-indigo-500 outline-none transition-all font-bold text-xl text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider">
                  라운드 수 (1-4)
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={setupMaxRounds}
                  onChange={e => setSetupMaxRounds(Math.min(4, Math.max(1, Number(e.target.value))))}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600/50 text-white focus:border-indigo-500 outline-none transition-all font-bold text-xl text-center"
                />
              </div>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={startRoom}
              className="btn-3d w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black py-5 rounded-2xl text-xl tracking-wide mt-4 animate-pulse-glow"
            >
              🚀 투자의 귀재들 START
            </button>
          </div>

          {/* 안내 */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-700/30">
                <p className="text-2xl font-bold text-emerald-400 font-display">19</p>
                <p className="text-xs text-slate-500">종목</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/30">
                <p className="text-2xl font-bold text-amber-400 font-display">76</p>
                <p className="text-xs text-slate-500">정보 카드</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/30">
                <p className="text-2xl font-bold text-rose-400 font-display">1,000만</p>
                <p className="text-xs text-slate-500">시드머니</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 게임 종료 화면
  if (gameState.currentStatus === GameStatus.FINISHED) {
    const sortedTeams = [...gameState.teams].sort((a, b) => {
      const aRate = a.roundResults[a.roundResults.length - 1]?.cumulativeProfitRate || 0;
      const bRate = b.roundResults[b.roundResults.length - 1]?.cumulativeProfitRate || 0;
      return bRate - aRate;
    });

    return (
      <div className="min-h-screen flex items-center justify-center p-6 iso-grid">
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-xl p-10 rounded-3xl max-w-3xl w-full border border-slate-700/50">
          <div className="text-center mb-10">
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400">
              게임 종료!
            </h2>
            <p className="text-slate-400 mt-2">최종 결과를 확인하세요</p>
          </div>

          <div className="space-y-4">
            {sortedTeams.map((team, idx) => {
              const finalResult = team.roundResults[team.roundResults.length - 1];
              return (
                <div
                  key={team.id}
                  className={`p-5 rounded-2xl flex items-center gap-4 ${
                    idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/50' :
                    idx === 1 ? 'bg-gradient-to-r from-slate-400/20 to-gray-400/20 border border-slate-400/30' :
                    idx === 2 ? 'bg-gradient-to-r from-orange-600/20 to-amber-700/20 border border-orange-600/30' :
                    'bg-slate-700/30 border border-slate-600/30'
                  }`}
                >
                  <span className="text-3xl font-black text-slate-400 w-12 font-display">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-white">Team {team.number}</p>
                    <p className="text-sm text-slate-400">{team.leaderName || '참여자 없음'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black font-display ${
                      (finalResult?.cumulativeProfitRate || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(finalResult?.cumulativeProfitRate || 0) >= 0 ? '+' : ''}
                      {(finalResult?.cumulativeProfitRate || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-500">누적 수익률</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 메인 관리자 대시보드
  return (
    <div className="min-h-screen p-4 md:p-6 iso-grid overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 상단 헤더 */}
        <header className="iso-card bg-gradient-to-r from-slate-800/90 to-slate-900/95 p-6 rounded-2xl border border-slate-700/50">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">{gameState.roomName}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
                  Round {gameState.currentRound} / {gameState.maxRounds}
                </span>
                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">
                  {STEP_NAMES[gameState.currentStep]}
                </span>
                <span className="bg-slate-500/20 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-slate-500/30">
                  {gameState.totalTeams} Teams
                </span>
              </div>
            </div>

            {/* 타이머 & 다음 라운드 */}
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-400 uppercase font-bold">Timer</p>
                <p className={`text-2xl font-black font-display ${
                  gameState.timerSeconds < 60 ? 'text-rose-400' :
                  gameState.timerSeconds < 180 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {Math.floor(gameState.timerSeconds / 60)}:{(gameState.timerSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
              {gameState.currentStep === GameStep.RESULT && (
                <button
                  onClick={nextRound}
                  className="btn-3d bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold"
                >
                  {gameState.currentRound >= gameState.maxRounds ? '게임 종료' : '다음 라운드 →'}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 단계 진행 버튼들 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {steps.map((step, idx) => {
            const isCompleted = gameState.completedSteps.includes(step.key);
            const isCurrent = gameState.currentStep === step.key;
            const isAvailable = idx <= currentStepIndex + 1;

            return (
              <button
                key={step.key}
                disabled={!isAvailable}
                onClick={() => handleStepChange(step.key, idx)}
                className={`p-4 md:p-5 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 border-2 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30 scale-105'
                    : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isAvailable
                        ? 'bg-slate-700/50 text-white border-slate-600/50 hover:border-indigo-500/50 hover:bg-slate-700'
                        : 'bg-slate-800/30 text-slate-600 border-slate-700/30 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl">{step.icon}</span>
                <span className="text-xs uppercase tracking-wide">Step {idx + 1}</span>
                <span>{step.label}</span>
                {isCompleted && <span className="text-xs text-emerald-400">✓ 완료</span>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 팀별 정보 구매권 관리 */}
          <div className="lg:col-span-2 iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              팀별 정보 구매권 관리
              <span className="ml-auto text-xs text-slate-500 font-normal">미니게임 순위별 부여</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.teams.map(team => (
                <div key={team.id} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {team.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">Team {team.number}</p>
                    <p className="text-xs text-slate-400 truncate">{team.leaderName || '대기 중...'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg text-sm font-bold">
                      {team.grantedInfoCount}개
                    </span>
                    <button
                      onClick={() => grantInfo(team.id, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-600/50 text-white font-bold hover:bg-rose-500/50 transition-colors"
                    >
                      -
                    </button>
                    <button
                      onClick={() => grantInfo(team.id, 1)}
                      className="w-8 h-8 rounded-lg bg-slate-600/50 text-white font-bold hover:bg-emerald-500/50 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 정보 구매 가격 안내 */}
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-300 font-medium">
                💡 현재 라운드 정보 구매 가격: <span className="font-bold">{(getInfoPrice(gameState.currentRound) / 10000).toLocaleString()}만원</span>
                <span className="text-xs text-amber-400/70 ml-2">(라운드당 10개 제한)</span>
              </p>
            </div>
          </div>

          {/* 투자 단계 통제 */}
          <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              투자 단계 통제
            </h3>

            <div className="space-y-4">
              {/* 타이머 설정 */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">타이머 (초)</label>
                <input
                  type="number"
                  value={timerInput}
                  onChange={e => setTimerInput(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white font-bold text-center text-xl outline-none focus:border-indigo-500"
                />
              </div>

              {/* 타이머 시작 */}
              <button
                onClick={startInvestment}
                disabled={gameState.currentStep !== GameStep.INVESTMENT}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  gameState.currentStep === GameStep.INVESTMENT
                    ? 'btn-3d bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                🚀 투자 시작
              </button>

              {/* 투자 잠금/해제 */}
              <button
                onClick={toggleInvestmentLock}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  gameState.isInvestmentLocked
                    ? 'bg-rose-500/20 text-rose-300 border-2 border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                {gameState.isInvestmentLocked ? '🔒 투자 잠금됨 (클릭하여 열기)' : '🔓 투자 진행중 (클릭하여 잠금)'}
              </button>

              {/* 타이머 프로그레스 */}
              {gameState.timerMaxSeconds > 0 && (
                <div className="mt-4">
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        gameState.timerSeconds < 60 ? 'bg-gradient-to-r from-rose-500 to-rose-400' :
                        gameState.timerSeconds < 180 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                        'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      }`}
                      style={{ width: `${(gameState.timerSeconds / gameState.timerMaxSeconds) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 주가 현황 (관리자용) */}
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            주가 현황 (관리자용)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {gameState.stocks.map(stock => {
              const currentPrice = stock.prices[gameState.currentRound];
              const prevPrice = stock.prices[gameState.currentRound - 1] || stock.prices[0];
              const change = ((currentPrice - prevPrice) / prevPrice) * 100;

              return (
                <div key={stock.id} className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{stock.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      change >= 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-lg font-black text-indigo-300 font-display">
                    {currentPrice.toLocaleString()}원
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 정보 카드 현황 */}
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            정보 카드 현황 (관리자용 - 전체 공개)
            <span className="ml-auto text-xs text-slate-500 font-normal">총 {INFO_CARDS.length}개</span>
          </h3>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {INFO_CARDS.map(card => {
              // 어떤 팀이 열었는지 확인
              const unlockedByTeams = gameState.teams.filter(t => t.unlockedCards.includes(card.id));

              return (
                <div
                  key={card.id}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border transition-all ${
                    unlockedByTeams.length > 0
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-700/30 border-slate-600/30 text-slate-400'
                  }`}
                  title={unlockedByTeams.length > 0 ? `Team ${unlockedByTeams.map(t => t.number).join(', ')}` : '미공개'}
                >
                  <span className="text-[10px] opacity-60">{card.id}</span>
                  <span>{card.stockId}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 결과 발표 모달 */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="iso-card bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-700/50">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">
                  📊 Round {gameState.currentRound} 결과발표
                </h2>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* 탭 버튼 */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setResultStep('stocks')}
                  className={`px-6 py-3 rounded-xl font-bold transition-all ${
                    resultStep === 'stocks'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  📈 종목별 주가
                </button>
                <button
                  onClick={() => setResultStep('teams')}
                  className={`px-6 py-3 rounded-xl font-bold transition-all ${
                    resultStep === 'teams'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  🏆 팀별 수익률
                </button>
              </div>

              {/* 종목별 주가 */}
              {resultStep === 'stocks' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {gameState.stocks.map(stock => {
                    const currentPrice = stock.prices[gameState.currentRound];
                    const prevPrice = stock.prices[gameState.currentRound - 1] || stock.prices[0];
                    const change = ((currentPrice - prevPrice) / prevPrice) * 100;

                    return (
                      <div key={stock.id} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-lg font-bold text-white">{stock.name}</span>
                          <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                            change >= 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-2xl font-black text-indigo-300 font-display">
                          {currentPrice.toLocaleString()}원
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          이전: {prevPrice.toLocaleString()}원
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 팀별 수익률 막대그래프 */}
              {resultStep === 'teams' && (
                <div className="space-y-6">
                  {/* 라운드 수익률 */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">라운드 {gameState.currentRound} 수익률</h3>
                    <div className="flex items-end gap-4 h-48 p-4 bg-slate-700/30 rounded-xl">
                      {gameState.teams.map(team => {
                        const result = team.roundResults.find(r => r.round === gameState.currentRound);
                        const rate = result?.profitRate || 0;
                        const maxRate = Math.max(...gameState.teams.map(t => Math.abs(t.roundResults.find(r => r.round === gameState.currentRound)?.profitRate || 0)), 10);
                        const height = Math.min(100, (Math.abs(rate) / maxRate) * 100);

                        return (
                          <div key={team.id} className="flex-1 flex flex-col items-center">
                            <span className={`text-sm font-bold mb-2 ${rate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {rate >= 0 ? '+' : ''}{rate.toFixed(1)}%
                            </span>
                            <div className="w-full flex flex-col justify-end h-32">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-1000 ${
                                  rate >= 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-rose-600 to-rose-400'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 mt-2 font-bold">Team {team.number}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 누적 수익률 */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">누적 수익률</h3>
                    <div className="flex items-end gap-4 h-48 p-4 bg-slate-700/30 rounded-xl">
                      {gameState.teams.map(team => {
                        const result = team.roundResults[team.roundResults.length - 1];
                        const rate = result?.cumulativeProfitRate || 0;
                        const maxRate = Math.max(...gameState.teams.map(t => Math.abs(t.roundResults[t.roundResults.length - 1]?.cumulativeProfitRate || 0)), 10);
                        const height = Math.min(100, (Math.abs(rate) / maxRate) * 100);

                        return (
                          <div key={team.id} className="flex-1 flex flex-col items-center">
                            <span className={`text-sm font-bold mb-2 ${rate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {rate >= 0 ? '+' : ''}{rate.toFixed(1)}%
                            </span>
                            <div className="w-full flex flex-col justify-end h-32">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-1000 ${
                                  rate >= 0 ? 'bg-gradient-to-t from-indigo-600 to-purple-400' : 'bg-gradient-to-t from-rose-600 to-rose-400'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 mt-2 font-bold">Team {team.number}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 다음 버튼 */}
              <div className="mt-6 flex justify-end">
                {resultStep === 'stocks' ? (
                  <button
                    onClick={() => setResultStep('teams')}
                    className="btn-3d bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold"
                  >
                    팀별 수익률 보기 →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="btn-3d bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold"
                  >
                    확인
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
