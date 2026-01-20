
import React, { useState, useEffect } from 'react';
import { GameState, GameStatus, GameStep, Team } from '../types';
import { STOCK_DATA, INITIAL_SEED_MONEY } from '../constants';

interface AdminDashboardProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ gameState, setGameState }) => {
  const [setupRoomName, setSetupRoomName] = useState('금융사관학교 1기');
  const [setupTeams, setSetupTeams] = useState(5);
  const [timerInput, setTimerInput] = useState(300);

  // 시퀀스 버튼 활성화 로직
  const steps = [
    { key: GameStep.MINI_GAME, label: '미니게임' },
    { key: GameStep.INFO_PURCHASE, label: '정보구매' },
    { key: GameStep.INFO_NEGOTIATION, label: '정보협상' },
    { key: GameStep.INVESTMENT, label: '투자시작/종료' },
    { key: GameStep.RESULT, label: '결과발표' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === gameState.currentStep);

  const startRoom = () => {
    const teams: Team[] = Array.from({ length: setupTeams }).map((_, i) => ({
      id: `team-${i + 1}`,
      number: i + 1,
      leaderName: '',
      currentCash: INITIAL_SEED_MONEY,
      portfolio: {},
      unlockedCards: [],
      grantedInfoCount: 0,
      purchasedInfoCount: 0,
      roundResults: []
    }));

    setGameState(prev => ({
      ...prev,
      roomName: setupRoomName,
      totalTeams: setupTeams,
      currentStatus: GameStatus.ROUND_1,
      currentStep: GameStep.MINI_GAME,
      teams,
      stocks: STOCK_DATA
    }));
  };

  const handleStepChange = (step: GameStep) => {
    setGameState(prev => ({ ...prev, currentStep: step }));
  };

  const nextRound = () => {
    const rounds = [GameStatus.ROUND_1, GameStatus.ROUND_2, GameStatus.ROUND_3, GameStatus.ROUND_4, GameStatus.FINISHED];
    const nextIdx = rounds.indexOf(gameState.currentStatus) + 1;
    if (nextIdx < rounds.length) {
      setGameState(prev => ({
        ...prev,
        currentStatus: rounds[nextIdx],
        currentStep: GameStep.MINI_GAME,
        isTimerRunning: false,
        teams: prev.teams.map(t => ({ ...t, purchasedInfoCount: 0 }))
      }));
    }
  };

  const grantInfo = (teamId: string, count: number) => {
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === teamId ? { ...t, grantedInfoCount: t.grantedInfoCount + count } : t)
    }));
  };

  useEffect(() => {
    let interval: any;
    if (gameState.isTimerRunning && gameState.timerSeconds > 0) {
      interval = setInterval(() => {
        setGameState(prev => ({ ...prev, timerSeconds: prev.timerSeconds - 1 }));
      }, 1000);
    } else if (gameState.timerSeconds === 0) {
      setGameState(prev => ({ ...prev, isTimerRunning: false }));
    }
    return () => clearInterval(interval);
  }, [gameState.isTimerRunning, gameState.timerSeconds]);

  if (gameState.currentStatus === GameStatus.SETUP || gameState.currentStatus === GameStatus.IDLE) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[50px] shadow-[20px_20px_60px_#d9d9d9,-20px_-20px_60px_#ffffff] max-w-2xl w-full border border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <span className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl">🏠</span>
            새로운 방 생성
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">방 이름</label>
              <input 
                type="text" 
                value={setupRoomName} 
                onChange={e => setSetupRoomName(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">참여 팀 개수 (1-10)</label>
              <input 
                type="number" 
                min="1" max="10" 
                value={setupTeams} 
                onChange={e => setSetupTeams(Number(e.target.value))}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-bold"
              />
            </div>
            <button 
              onClick={startRoom}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-200 transition-all transform active:scale-95 text-lg uppercase"
            >
              투자의 귀재들 START
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{gameState.roomName}</h1>
            <div className="flex gap-2 mt-2">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                {gameState.currentStatus}
              </span>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                STEP: {gameState.currentStep}
              </span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
             <div className="text-right mr-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">Investment Timer</p>
                <p className="text-2xl font-black text-slate-800">{Math.floor(gameState.timerSeconds / 60)}:{(gameState.timerSeconds % 60).toString().padStart(2, '0')}</p>
             </div>
             <button onClick={nextRound} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-black transition-all">NEXT ROUND</button>
          </div>
        </header>

        {/* 시퀀스 제어 센터 */}
        <div className="grid grid-cols-5 gap-4">
          {steps.map((step, idx) => (
            <button
              key={step.key}
              disabled={idx > currentStepIndex + 1 && gameState.currentStep !== step.key}
              onClick={() => handleStepChange(step.key)}
              className={`p-6 rounded-3xl font-black text-sm shadow-sm border-b-4 transition-all transform active:scale-95 flex flex-col items-center gap-2 ${
                gameState.currentStep === step.key 
                  ? 'bg-blue-600 text-white border-blue-800 translate-y-1' 
                  : idx <= currentStepIndex 
                    ? 'bg-white text-slate-800 border-slate-200' 
                    : 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
              }`}
            >
              <span className="text-xs opacity-60">Step {idx + 1}</span>
              {step.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-200">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex justify-between">
                팀별 정보 구매권 관리
                <span className="text-xs text-slate-400 font-bold uppercase self-center tracking-tighter">Mini-game rewards</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {gameState.teams.map(team => (
                  <div key={team.id} className="p-4 rounded-3xl bg-slate-50 flex justify-between items-center border border-slate-100">
                    <span className="font-black text-slate-700">Team {team.number}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">보유: {team.grantedInfoCount}개</span>
                      <button onClick={() => grantInfo(team.id, 1)} className="bg-white w-8 h-8 rounded-full border border-slate-200 font-black shadow-sm">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 타이머 및 매수 통제 */}
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-200">
                <h3 className="text-xl font-black text-slate-800 mb-6">투자 단계 통제</h3>
                <div className="flex gap-4 items-center">
                  <input 
                    type="number" 
                    value={timerInput} 
                    onChange={e => setTimerInput(Number(e.target.value))}
                    className="w-32 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
                  />
                  <button 
                    onClick={() => setGameState(prev => ({ ...prev, timerSeconds: timerInput, isTimerRunning: true }))}
                    className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-100"
                  >
                    타이머 가동
                  </button>
                  <button 
                    onClick={() => setGameState(prev => ({ ...prev, isTimerRunning: false }))}
                    className="flex-1 bg-rose-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-rose-100"
                  >
                    일시 정지
                  </button>
                </div>
            </div>
          </div>

          {/* 추론 로그 (Reasoning Trace) */}
          <div className="bg-slate-900 rounded-[40px] p-8 shadow-xl text-slate-300 font-mono text-xs overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </div>
            <h4 className="text-white font-black mb-4 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Admin Reasoning
            </h4>
            <div className="space-y-3 opacity-80">
              <p className="text-emerald-400 font-bold"># [Trace] 시퀀스 동기화 완료</p>
              <p>- 각 팀의 세션 데이터를 중앙 GameState로 취합 중입니다.</p>
              <p>- 실존 주가 변동률 {STOCK_DATA.length}종목 연동 확인.</p>
              <p className="text-amber-400"># [Algo] 30% 투자 제한 감시 활성</p>
              <p>- 각 팀의 실시간 포트폴리오 자산 대비 신규 매수액이 한도(TotalAsset * 0.3)를 초과할 경우 교육생 UI에서 차단됩니다.</p>
              <p className="text-blue-400"># [Sys] 정보 카드 데이터 로딩</p>
              <p>- 총 76개의 암호화된 이미지 카드 인덱싱 완료.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
