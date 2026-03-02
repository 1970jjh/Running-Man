
import React, { useState, useEffect, useCallback } from 'react';
import { Role, GameStatus, GameStep, GameState, Room } from './types';
import { STOCK_DATA, ADMIN_PASSWORD } from './constants';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';
import FullScreenButton from './components/FullScreenButton';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';
import { subscribeToRoom, updateRoomGameState, joinTeam, isFirebaseReady, getRoom, leaveTeam, executeTeamTrade, TradeRequest } from './firebase';

type AppView = 'login' | 'admin' | 'user';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('login');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [currentTeamNumber, setCurrentTeamNumber] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);

  // 방 나가기 처리
  const handleLeaveRoom = useCallback(async () => {
    if (currentRoomId && currentTeamNumber) {
      try {
        await leaveTeam(currentRoomId, currentTeamNumber);
      } catch (error) {
        console.error('방 나가기 오류:', error);
      }
    }
    setView('login');
    setCurrentRoomId(null);
    setCurrentTeamId(null);
    setCurrentTeamNumber(null);
    setGameState(null);
    setJoinError(null);
    setShowExitConfirm(false);
    setPendingExit(null);
  }, [currentRoomId, currentTeamNumber]);

  // 퇴장 확인 팝업 표시
  const confirmExit = useCallback((onConfirm?: () => void) => {
    if (view === 'user' && currentRoomId) {
      setShowExitConfirm(true);
      if (onConfirm) {
        setPendingExit(() => onConfirm);
      }
    } else {
      if (onConfirm) {
        onConfirm();
      } else {
        handleLeaveRoom();
      }
    }
  }, [view, currentRoomId, handleLeaveRoom]);

  // History API 관리 - 뒤로가기 버튼 지원
  useEffect(() => {
    // 초기 히스토리 상태 설정
    if (view === 'login') {
      window.history.replaceState({ view: 'login' }, '');
    }
  }, []);

  // 뷰 변경 시 히스토리 푸시
  useEffect(() => {
    if (view !== 'login') {
      window.history.pushState({ view }, '');
    }
  }, [view]);

  // 뒤로가기(popstate) 이벤트 핸들링
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 사용자가 방에 있을 때 뒤로가기 시 확인 팝업
      if (view === 'user' && currentRoomId) {
        // 히스토리를 다시 앞으로 밀어서 나가지 않도록
        window.history.pushState({ view: 'user' }, '');
        setShowExitConfirm(true);
        setPendingExit(() => handleLeaveRoom);
      } else if (view === 'admin') {
        // 관리자는 바로 로그인 화면으로
        setView('login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, currentRoomId, handleLeaveRoom]);

  // 페이지 떠날 때 경고 (새로고침, 탭 닫기 등)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (view === 'user' && currentRoomId) {
        event.preventDefault();
        event.returnValue = '방에서 퇴장하시겠습니까?';
        return '방에서 퇴장하시겠습니까?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view, currentRoomId]);

  // 페이지 언로드 시 방 나가기
  useEffect(() => {
    const handleUnload = () => {
      if (currentRoomId && currentTeamNumber) {
        // 동기적으로 방 나가기 시도 (navigator.sendBeacon 사용)
        const data = JSON.stringify({ roomId: currentRoomId, teamNumber: currentTeamNumber });
        // Note: Firebase는 sendBeacon을 직접 지원하지 않으므로,
        // 실제로는 서버에서 비활성 사용자 정리가 필요할 수 있음
      }
    };

    window.addEventListener('unload', handleUnload);
    return () => window.removeEventListener('unload', handleUnload);
  }, [currentRoomId, currentTeamNumber]);

  // 방 구독 (사용자가 방에 입장했을 때)
  useEffect(() => {
    if (!currentRoomId || view === 'admin') return;

    const unsubscribe = subscribeToRoom(
      currentRoomId,
      (room) => {
        if (room) {
          setGameState(room.gameState);
          setJoinError(null);
        } else {
          // 방이 삭제되었거나 찾을 수 없음
          setJoinError('방을 찾을 수 없습니다. 방이 삭제되었을 수 있습니다.');
        }
      },
      (error) => {
        console.error('방 구독 오류:', error);
        setJoinError(`서버 연결 오류: ${error.message}`);
      }
    );

    return () => unsubscribe();
  }, [currentRoomId, view]);

  // GameState 업데이트 함수 (Firebase와 동기화)
  // 중요: 로컬 상태를 직접 업데이트하지 않고 Firebase만 업데이트
  // Firebase 구독에서 상태 변경을 받아 처리하므로 race condition 방지
  const handleSetGameState: React.Dispatch<React.SetStateAction<GameState>> = async (action) => {
    if (!currentRoomId || !gameState) return;

    const updater = typeof action === 'function'
      ? (current: GameState) => (action as (prev: GameState) => GameState)(current)
      : (_current: GameState) => action as GameState;

    const success = await updateRoomGameState(currentRoomId, updater);
    if (!success) {
      console.error('Firebase 업데이트 실패');
    }
  };

  // 로그인 핸들러
  const handleLogin = async (
    selectedRole: Role,
    data?: { name: string; teamNumber: number; roomId?: string; password?: string }
  ) => {
    if (selectedRole === Role.USER && data?.roomId) {
      // Firebase 연결 확인
      if (!isFirebaseReady()) {
        alert('서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      setIsJoining(true);
      setJoinError(null);

      try {
        // 먼저 방이 존재하는지 확인
        const room = await getRoom(data.roomId);
        if (!room) {
          alert('방을 찾을 수 없습니다. 방이 삭제되었거나 유효하지 않습니다.');
          setIsJoining(false);
          return;
        }

        if (!room.isActive) {
          alert('이 방은 더 이상 활성화되지 않았습니다.');
          setIsJoining(false);
          return;
        }

        // 팀 참가 시도
        const success = await joinTeam(data.roomId, data.teamNumber, data.name);

        if (success) {
          setCurrentRoomId(data.roomId);
          setCurrentTeamId(`team-${data.teamNumber}`);
          setCurrentTeamNumber(data.teamNumber);
          setView('user');
        } else {
          alert('방에 입장할 수 없습니다.\n\n가능한 원인:\n- 서버 연결 문제\n- 방이 삭제됨\n- 팀이 존재하지 않음\n\n다시 시도해주세요.');
        }
      } catch (error: any) {
        console.error('입장 오류:', error);
        alert(`입장 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`);
      } finally {
        setIsJoining(false);
      }
    }
  };

  // 관리자 접근
  const handleAdminAccess = () => {
    setView('admin');
  };

  // 로그아웃 (관리자용)
  const handleLogout = () => {
    setView('login');
    setCurrentRoomId(null);
    setCurrentTeamId(null);
    setCurrentTeamNumber(null);
    setGameState(null);
    setJoinError(null);
  };

  // 사용자 방 나가기 요청 (확인 팝업 표시)
  const handleUserExitRequest = () => {
    confirmExit(handleLeaveRoom);
  };

  const myTeam = gameState?.teams.find(t => t.id === currentTeamId);
  const myTeamIndex = gameState?.teams.findIndex(t => t.id === currentTeamId) ?? -1;

  // 거래 실행 함수 (Firebase Transaction 기반)
  const handleTrade = useCallback(async (trade: Omit<TradeRequest, 'roomId' | 'teamIndex'>): Promise<{ success: boolean; error?: string }> => {
    if (!currentRoomId || myTeamIndex < 0) {
      return { success: false, error: '방 또는 팀 정보가 없습니다.' };
    }
    return executeTeamTrade({ ...trade, roomId: currentRoomId, teamIndex: myTeamIndex });
  }, [currentRoomId, myTeamIndex]);

  return (
    <ThemeProvider>
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {/* 통합 배경 */}
      <div className="app-background" />

      {/* 전체화면 버튼 & 테마 토글 */}
      <FullScreenButton />
      <ThemeToggle />

      {view === 'login' && (
        <Login
          onLogin={handleLogin}
          onAdminAccess={handleAdminAccess}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard onLogout={handleLogout} />
      )}

      {view === 'user' && gameState && myTeam && (
        <UserDashboard
          gameState={gameState}
          myTeam={myTeam}
          setGameState={handleSetGameState}
          onExitRequest={handleUserExitRequest}
          onTrade={handleTrade}
        />
      )}

      {view === 'user' && (!gameState || !myTeam) && (
        <div className="flex-1 flex items-center justify-center iso-grid relative z-10">
          <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-10 rounded-3xl text-center border border-slate-700/50 max-w-md animate-fade-in-up">
            {isJoining ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                <p className="text-xl font-bold text-white">방에 입장 중...</p>
                <p className="text-sm text-slate-400 mt-2">잠시만 기다려주세요</p>
              </>
            ) : joinError ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center animate-bounce-soft">
                  <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p className="text-xl font-bold text-white mb-2">연결 오류</p>
                <p className="text-sm text-rose-300 mb-4">{joinError}</p>
                <button
                  onClick={handleLogout}
                  className="btn-3d mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold"
                >
                  다시 시도하기
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                <p className="text-xl font-bold text-white">게임 로딩 중...</p>
                <p className="text-sm text-slate-400 mt-2">잠시만 기다려주세요</p>
                <button
                  onClick={handleLogout}
                  className="mt-6 text-slate-500 hover:text-white text-sm transition-colors"
                >
                  돌아가기
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 퇴장 확인 모달 */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="iso-card bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl max-w-sm w-full p-8 text-center border border-slate-700/50 animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-4 bg-rose-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">방에서 퇴장하시겠습니까?</h3>
            <p className="text-slate-400 text-sm mb-6">게임 진행 상황은 유지되지만,<br/>다시 입장해야 합니다.</p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  setPendingExit(null);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-700/50 text-white font-bold hover:bg-slate-600/50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (pendingExit) {
                    pendingExit();
                  } else {
                    handleLeaveRoom();
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors"
              >
                퇴장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ThemeProvider>
  );
};

export default App;
