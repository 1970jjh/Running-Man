
import React, { useState, useEffect } from 'react';
import { Role, GameStatus, GameStep, GameState, Room } from './types';
import { STOCK_DATA, ADMIN_PASSWORD } from './constants';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';
import { subscribeToRoom, updateRoomGameState, joinTeam } from './firebase';

type AppView = 'login' | 'admin' | 'user';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('login');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // 방 구독 (사용자가 방에 입장했을 때)
  useEffect(() => {
    if (!currentRoomId || view === 'admin') return;

    const unsubscribe = subscribeToRoom(currentRoomId, (room) => {
      if (room) {
        setGameState(room.gameState);
      }
    });

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
      // 사용자: 방에 입장
      const success = await joinTeam(data.roomId, data.teamNumber, data.name);

      if (success) {
        setCurrentRoomId(data.roomId);
        setCurrentTeamId(`team-${data.teamNumber}`);
        setView('user');
      } else {
        alert('방에 입장할 수 없습니다. 다시 시도해주세요.');
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
  };

  const myTeam = gameState?.teams.find(t => t.id === currentTeamId);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-indigo-500/30">
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
        <div className="flex-1 flex items-center justify-center iso-grid">
          <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-10 rounded-3xl text-center border border-slate-700/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
            <p className="text-xl font-bold text-white">게임 로딩 중...</p>
            <p className="text-sm text-slate-400 mt-2">잠시만 기다려주세요</p>
            <button
              onClick={handleLogout}
              className="mt-6 text-slate-500 hover:text-white text-sm transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
