
import React, { useState, useEffect } from 'react';
import { Role, GameStatus, GameStep, GameState, Room } from './types';
import { STOCK_DATA, ADMIN_PASSWORD } from './constants';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';
import FullScreenButton from './components/FullScreenButton';
import { subscribeToRoom, updateRoomGameState, joinTeam, isFirebaseReady, getRoom } from './firebase';

type AppView = 'login' | 'admin' | 'user';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('login');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
  const handleSetGameState: React.Dispatch<React.SetStateAction<GameState>> = async (action) => {
    if (!currentRoomId || !gameState) return;

    const newState = typeof action === 'function' ? action(gameState) : action;
    setGameState(newState);
    await updateRoomGameState(currentRoomId, newState);
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

  // 로그아웃
  const handleLogout = () => {
    setView('login');
    setCurrentRoomId(null);
    setCurrentTeamId(null);
    setGameState(null);
    setJoinError(null);
  };

  const myTeam = gameState?.teams.find(t => t.id === currentTeamId);

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {/* 통합 배경 */}
      <div className="app-background" />

      {/* 전체화면 버튼 */}
      <FullScreenButton />

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
    </div>
  );
};

export default App;
