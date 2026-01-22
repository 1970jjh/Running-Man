
import React, { useState, useEffect } from 'react';
import { GameState, GameStatus, GameStep, Team, Room } from '../types';
import { STOCK_DATA, INITIAL_SEED_MONEY, INFO_CARDS, STEP_NAMES, getInfoPrice, ADMIN_PASSWORD } from '../constants';
import {
  createRoom,
  subscribeToRooms,
  subscribeToRoom,
  updateRoomGameState,
  deleteRoom,
  createDefaultGameState,
  isFirebaseReady,
  getFirebaseError
} from '../firebase';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminView = 'room-list' | 'room-setup' | 'room-manage';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [view, setView] = useState<AdminView>('room-list');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 방 생성 폼
  const [setupRoomName, setSetupRoomName] = useState('금융사관학교 1기');
  const [setupTeams, setSetupTeams] = useState(5);
  const [setupMaxRounds, setSetupMaxRounds] = useState(4);
  const [setupPassword, setSetupPassword] = useState(ADMIN_PASSWORD);

  // 게임 관리
  const [timerInput, setTimerInput] = useState(300);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultStep, setResultStep] = useState<'stocks' | 'teams'>('stocks');

  // Firebase 연결 상태 확인
  const firebaseConnected = isFirebaseReady();

  // 방 목록 실시간 구독
  useEffect(() => {
    if (!firebaseConnected) {
      const error = getFirebaseError();
      setErrorMessage(error || 'Firebase 연결에 실패했습니다.');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToRooms(
      (roomList) => {
        setRooms(roomList);
        setLoading(false);
        setErrorMessage(null);
      },
      (error) => {
        setErrorMessage(`방 목록을 불러올 수 없습니다: ${error.message}`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [firebaseConnected]);

  // 선택된 방 실시간 구독
  useEffect(() => {
    if (!selectedRoom) return;

    const unsubscribe = subscribeToRoom(selectedRoom.id, (room) => {
      if (room) {
        setSelectedRoom(room);
        setGameState(room.gameState);
      }
    });
    return () => unsubscribe();
  }, [selectedRoom?.id]);

  // 단계 순서 정의
  const steps = [
    { key: GameStep.MINI_GAME, label: '미니게임', icon: '🎮' },
    { key: GameStep.INFO_PURCHASE, label: '정보구매', icon: '📊' },
    { key: GameStep.INFO_NEGOTIATION, label: '정보협상', icon: '🤝' },
    { key: GameStep.INVESTMENT, label: '투자', icon: '💰' },
    { key: GameStep.RESULT, label: '결과발표', icon: '📈' }
  ];

  const currentStepIndex = gameState ? steps.findIndex(s => s.key === gameState.currentStep) : -1;

  // 새 방 생성
  const handleCreateRoom = async () => {
    if (!firebaseConnected) {
      alert('Firebase에 연결되지 않았습니다. 설정을 확인해주세요.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const newRoom = await createRoom(setupRoomName, setupPassword, setupTeams, setupMaxRounds);
      setSelectedRoom(newRoom);
      setGameState(newRoom.gameState);
      setView('room-manage');
    } catch (error: any) {
      console.error('방 생성 오류:', error);
      const errorMsg = error?.message || '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(`방 생성 실패: ${errorMsg}`);
      alert(`방 생성에 실패했습니다.\n\n오류: ${errorMsg}\n\nFirebase 설정을 확인해주세요.`);
      // 에러 발생 시 방 목록 화면으로 돌아가기
      setView('room-list');
    } finally {
      setIsCreating(false);
    }
  };

  // 방 선택 및 관리
  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setGameState(room.gameState);
    setView('room-manage');
  };

  // 방 삭제
  const handleDeleteRoom = async (roomId: string) => {
    if (confirm('정말로 이 방을 삭제하시겠습니까?')) {
      await deleteRoom(roomId);
    }
  };

  // GameState 업데이트 (Firebase에 동기화)
  const updateGameState = async (newState: GameState) => {
    if (!selectedRoom) return;
    setGameState(newState);
    await updateRoomGameState(selectedRoom.id, newState);
  };

  // 게임 시작
  const startGame = async () => {
    if (!gameState) return;

    const newState: GameState = {
      ...gameState,
      currentRound: 1,
      currentStatus: GameStatus.ROUND_1,
      currentStep: GameStep.MINI_GAME,
      completedSteps: [],
      isInvestmentLocked: true,
      revealedResults: false
    };

    await updateGameState(newState);
  };

  // 단계 변경
  const handleStepChange = async (step: GameStep, stepIdx: number) => {
    if (!gameState || stepIdx > currentStepIndex + 1) return;

    const newCompletedSteps = steps.slice(0, stepIdx).map(s => s.key);

    const newState: GameState = {
      ...gameState,
      currentStep: step,
      completedSteps: newCompletedSteps,
      revealedResults: step === GameStep.RESULT
    };

    await updateGameState(newState);

    if (step === GameStep.RESULT) {
      await calculateRoundResults();
      setShowResultModal(true);
      setResultStep('stocks');
    }
  };

  // 라운드 결과 계산
  const calculateRoundResults = async () => {
    if (!gameState) return;

    const roundIdx = gameState.currentRound;

    const newState: GameState = {
      ...gameState,
      teams: gameState.teams.map(team => {
        const portfolioValue = Object.entries(team.portfolio).reduce((sum, [stockId, qty]) => {
          const stock = gameState.stocks.find(s => s.id === stockId);
          const price = stock?.prices[roundIdx] || 0;
          return sum + (qty * price);
        }, 0);

        const totalValue = team.currentCash + portfolioValue;
        const profitRate = ((totalValue - INITIAL_SEED_MONEY) / INITIAL_SEED_MONEY) * 100;

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
    };

    await updateGameState(newState);
  };

  // 다음 라운드
  const nextRound = async () => {
    if (!gameState) return;

    const rounds = [GameStatus.ROUND_1, GameStatus.ROUND_2, GameStatus.ROUND_3, GameStatus.ROUND_4, GameStatus.FINISHED];
    const currentIdx = rounds.indexOf(gameState.currentStatus);

    if (currentIdx >= gameState.maxRounds) {
      await updateGameState({ ...gameState, currentStatus: GameStatus.FINISHED });
      return;
    }

    const nextStatus = rounds[currentIdx + 1];

    const newState: GameState = {
      ...gameState,
      currentStatus: nextStatus,
      currentRound: gameState.currentRound + 1,
      currentStep: GameStep.MINI_GAME,
      completedSteps: [],
      isTimerRunning: false,
      isInvestmentLocked: true,
      revealedResults: false,
      teams: gameState.teams.map(t => ({
        ...t,
        purchasedInfoCountPerRound: {
          ...t.purchasedInfoCountPerRound,
          [gameState.currentRound + 1]: 0
        }
      }))
    };

    await updateGameState(newState);
    setShowResultModal(false);
  };

  // 정보 구매권 부여
  const grantInfo = async (teamId: string, count: number) => {
    if (!gameState) return;

    const newState: GameState = {
      ...gameState,
      teams: gameState.teams.map(t =>
        t.id === teamId
          ? { ...t, grantedInfoCount: Math.max(0, t.grantedInfoCount + count) }
          : t
      )
    };

    await updateGameState(newState);
  };

  // 타이머 관리
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState?.isTimerRunning && gameState?.timerSeconds > 0) {
      interval = setInterval(async () => {
        const newState: GameState = {
          ...gameState,
          timerSeconds: gameState.timerSeconds - 1
        };

        if (newState.timerSeconds === 0) {
          newState.isTimerRunning = false;
          newState.isInvestmentLocked = true;
        }

        await updateGameState(newState);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState?.isTimerRunning, gameState?.timerSeconds]);

  // 투자 시작
  const startInvestment = async () => {
    if (!gameState) return;

    const newState: GameState = {
      ...gameState,
      timerSeconds: timerInput,
      timerMaxSeconds: timerInput,
      isTimerRunning: true,
      isInvestmentLocked: false
    };

    await updateGameState(newState);
  };

  // 투자 잠금/해제
  const toggleInvestmentLock = async () => {
    if (!gameState) return;

    const newState: GameState = {
      ...gameState,
      isInvestmentLocked: !gameState.isInvestmentLocked,
      isTimerRunning: gameState.isInvestmentLocked
    };

    await updateGameState(newState);
  };

  // ============ 방 목록 화면 ============
  if (view === 'room-list') {
    return (
      <div className="min-h-screen p-6 iso-grid relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">관리자 대시보드</h1>
              <p className="text-slate-400 text-sm mt-1">방을 생성하고 관리하세요</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                <span className={firebaseConnected ? 'text-emerald-400' : 'text-rose-400'}>
                  {firebaseConnected ? '서버 연결됨' : '서버 연결 실패'}
                </span>
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* Firebase 오류 메시지 */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/20 border border-rose-500/50">
              <p className="text-rose-300 text-sm font-medium">{errorMessage}</p>
              <p className="text-rose-400/70 text-xs mt-2">Firebase Realtime Database 설정을 확인해주세요.</p>
            </div>
          )}

          {/* 새 방 만들기 버튼 */}
          <button
            onClick={() => setView('room-setup')}
            disabled={!firebaseConnected}
            className={`w-full font-bold py-5 rounded-2xl text-xl mb-8 ${
              firebaseConnected
                ? 'btn-3d bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            ➕ 새 방 만들기
          </button>

          {/* 로딩 상태 */}
          {loading && (
            <div className="iso-card bg-slate-800/50 p-8 rounded-2xl text-center border border-slate-700/50">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
              <p className="text-slate-400">방 목록을 불러오는 중...</p>
            </div>
          )}

          {/* 방 목록 */}
          {!loading && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">내 방 목록</h2>

            {rooms.length === 0 ? (
              <div className="iso-card bg-slate-800/50 p-8 rounded-2xl text-center border border-slate-700/50">
                <p className="text-slate-400">생성된 방이 없습니다</p>
                <p className="text-xs text-slate-500 mt-2">위 버튼을 눌러 새 방을 만들어보세요</p>
              </div>
            ) : (
              rooms.map(room => (
                <div
                  key={room.id}
                  className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-5 rounded-2xl border border-slate-700/50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">{room.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-bold">
                          {room.totalTeams}팀
                        </span>
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-bold">
                          {room.maxRounds}라운드
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          room.gameState?.currentStatus === 'READY'
                            ? 'bg-amber-500/20 text-amber-300'
                            : room.gameState?.currentStatus === 'FINISHED'
                              ? 'bg-slate-500/20 text-slate-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {room.gameState?.currentStatus === 'READY' ? '대기중' :
                            room.gameState?.currentStatus === 'FINISHED' ? '종료됨' : '진행중'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectRoom(room)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors"
                      >
                        관리
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 font-bold hover:bg-rose-600/40 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          )}
        </div>
      </div>
    );
  }

  // ============ 방 생성 화면 ============
  if (view === 'room-setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 iso-grid relative z-10">
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-xl p-10 rounded-3xl max-w-xl w-full border border-slate-700/50 animate-fade-in-up">
          {/* 헤더 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-3xl">🏦</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">새로운 방 생성</h2>
            <p className="text-slate-400 text-sm">투자 시뮬레이션 방을 만듭니다</p>
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

            {/* 관리자 비밀번호 */}
            <div>
              <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider">
                관리자 비밀번호
              </label>
              <input
                type="password"
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600/50 text-white focus:border-indigo-500 outline-none transition-all font-medium"
                placeholder="이 방의 관리자 비밀번호"
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

            {/* 버튼들 */}
            <div className="flex gap-4">
              <button
                onClick={() => setView('room-list')}
                disabled={isCreating}
                className="flex-1 py-4 rounded-2xl bg-slate-700/50 text-slate-300 font-bold hover:bg-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={isCreating || !firebaseConnected}
                className={`flex-1 font-bold py-4 rounded-2xl transition-all ${
                  isCreating || !firebaseConnected
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'btn-3d bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white'
                }`}
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    생성 중...
                  </span>
                ) : (
                  '방 생성'
                )}
              </button>
            </div>
          </div>

          {/* 안내 */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-700/30">
                <p className="text-2xl font-bold text-emerald-400 font-display">19</p>
                <p className="text-xs text-slate-500">종목</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/30">
                <p className="text-2xl font-bold text-amber-400 font-display">95</p>
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

  // ============ 방 관리 화면 ============
  if (!gameState || !selectedRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 iso-grid relative z-10">
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-10 rounded-3xl text-center border border-slate-700/50 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
          <p className="text-xl font-bold text-white mb-2">게임 데이터 로딩 중...</p>
          <p className="text-sm text-slate-400 mb-6">잠시만 기다려주세요</p>
          <button
            onClick={() => {
              setSelectedRoom(null);
              setGameState(null);
              setView('room-list');
            }}
            className="text-slate-500 hover:text-white text-sm transition-colors"
          >
            ← 방 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 게임 종료
  if (gameState.currentStatus === GameStatus.FINISHED) {
    const sortedTeams = [...gameState.teams].sort((a, b) => {
      const aRate = a.roundResults[a.roundResults.length - 1]?.cumulativeProfitRate || 0;
      const bRate = b.roundResults[b.roundResults.length - 1]?.cumulativeProfitRate || 0;
      return bRate - aRate;
    });

    return (
      <div className="min-h-screen p-6 iso-grid relative z-10">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setView('room-list')}
            className="mb-6 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← 방 목록으로
          </button>

          <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-10 rounded-3xl border border-slate-700/50">
            <div className="text-center mb-10">
              <span className="text-6xl mb-4 block">🏆</span>
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400">
                게임 종료!
              </h2>
              <p className="text-slate-400 mt-2">{selectedRoom.name} - 최종 결과</p>
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
      </div>
    );
  }

  // 게임 시작 전 대기
  if (gameState.currentStatus === GameStatus.IDLE || gameState.currentStatus === GameStatus.READY) {
    return (
      <div className="min-h-screen p-6 iso-grid relative z-10">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setView('room-list')}
            className="mb-6 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← 방 목록으로
          </button>

          <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-10 rounded-3xl border border-slate-700/50">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white mb-2">{selectedRoom.name}</h2>
              <p className="text-slate-400">참여자를 기다리고 있습니다</p>
            </div>

            {/* 팀 현황 */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {gameState.teams.map(team => (
                <div key={team.id} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {team.number}
                    </div>
                    <div>
                      <p className="font-bold text-white">Team {team.number}</p>
                      <p className="text-xs text-slate-400">
                        {team.members.length > 0 ? `${team.members.length}명 참여` : '대기 중...'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="btn-3d w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black py-5 rounded-2xl text-xl animate-pulse-glow"
            >
              🚀 게임 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ 메인 관리 대시보드 ============
  return (
    <div className="min-h-screen p-4 md:p-6 iso-grid overflow-auto relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 상단 헤더 */}
        <header className="iso-card bg-gradient-to-r from-slate-800/90 to-slate-900/95 p-6 rounded-2xl border border-slate-700/50">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <button
                onClick={() => setView('room-list')}
                className="text-slate-400 hover:text-white text-sm mb-2 flex items-center gap-1"
              >
                ← 방 목록
              </button>
              <h1 className="text-2xl md:text-3xl font-black text-white">{selectedRoom.name}</h1>
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
                <p className="text-xs text-slate-400 uppercase font-bold">타이머</p>
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

        {/* 팀별 투자 현황 (포트폴리오) */}
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💼</span>
            팀별 투자 현황
            <span className="ml-auto text-xs text-slate-500 font-normal">
              {gameState.currentStep === GameStep.RESULT ? '✅ 투자 완료' : '실시간 업데이트'}
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {gameState.teams.map(team => {
              const portfolioEntries = Object.entries(team.portfolio).filter(([_, qty]) => qty > 0);
              const portfolioValue = portfolioEntries.reduce((sum, [stockId, qty]) => {
                const stock = gameState.stocks.find(s => s.id === stockId);
                const price = stock?.prices[gameState.currentRound] || 0;
                return sum + (qty * price);
              }, 0);
              const totalAsset = team.currentCash + portfolioValue;

              return (
                <div key={team.id} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-600/30">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {team.number}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">Team {team.number}</p>
                      <p className="text-xs text-slate-400">{team.leaderName || '대기 중...'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">총 자산</p>
                      <p className="font-bold text-amber-400">{(totalAsset / 10000).toFixed(0)}만원</p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">보유 현금</span>
                      <span className="text-emerald-400 font-bold">{(team.currentCash / 10000).toFixed(0)}만원</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">주식 평가액</span>
                      <span className="text-indigo-400 font-bold">{(portfolioValue / 10000).toFixed(0)}만원</span>
                    </div>
                  </div>

                  {portfolioEntries.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-600/30">
                      <p className="text-xs text-slate-500 mb-2 font-bold">보유 종목</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {portfolioEntries.map(([stockId, qty]) => {
                          const stock = gameState.stocks.find(s => s.id === stockId);
                          const price = stock?.prices[gameState.currentRound] || 0;
                          const value = qty * price;
                          return (
                            <div key={stockId} className="flex justify-between items-center text-xs bg-slate-600/30 px-2 py-1 rounded">
                              <span className="text-white font-medium">{stock?.name || stockId}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{qty}주</span>
                                <span className="text-indigo-300 font-bold">{(value / 10000).toFixed(0)}만</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-600/30">
                      <p className="text-xs text-slate-500 text-center py-2">보유 종목 없음</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 정보 카드 현황 - 세로 목록 형태 */}
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            정보 카드 현황
            <span className="ml-auto text-xs text-slate-500 font-normal">총 {INFO_CARDS.length}개</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map(category => {
              const categoryCards = INFO_CARDS.filter(c => c.categoryIndex === category);
              const unlockedCount = categoryCards.filter(card =>
                gameState.teams.some(t => t.unlockedCards.includes(card.id))
              ).length;

              return (
                <div key={category} className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-indigo-300">카테고리 {category}</p>
                    <span className="text-xs text-slate-500">{unlockedCount}/{categoryCards.length}</span>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {categoryCards.map(card => {
                      const unlockedByTeams = gameState.teams.filter(t => t.unlockedCards.includes(card.id));
                      const isUnlocked = unlockedByTeams.length > 0;

                      return (
                        <div
                          key={card.id}
                          className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                            isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-600/30 text-slate-500'
                          }`}
                        >
                          <span className="font-medium">{card.stockId}</span>
                          {isUnlocked && (
                            <span className="text-[10px] text-emerald-400">
                              T{unlockedByTeams.map(t => t.number).join(',')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
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

              {/* 팀별 수익률 */}
              {resultStep === 'teams' && (
                <div className="space-y-6">
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
