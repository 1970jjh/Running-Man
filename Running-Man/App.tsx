
import React, { useState } from 'react';
import { Role, GameStatus, GameStep, GameState } from './types';
import { STOCK_DATA, ADMIN_PASSWORD } from './constants';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';

const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    roomName: '',
    totalTeams: 0,
    maxRounds: 4,
    currentRound: 0,
    currentStatus: GameStatus.IDLE,
    currentStep: GameStep.WAITING,
    completedSteps: [],
    timerSeconds: 300,
    timerMaxSeconds: 300,
    isTimerRunning: false,
    isInvestmentLocked: true,
    teams: [],
    stocks: STOCK_DATA,
    revealedResults: false
  });

  const handleLogin = (selectedRole: Role, data?: { name: string; teamNumber: number; password?: string }) => {
    if (selectedRole === Role.ADMIN) {
      if (data?.password === ADMIN_PASSWORD) {
        setRole(Role.ADMIN);
      } else {
        alert('비밀번호가 틀렸습니다.');
      }
    } else {
      if (!data?.name) return alert('이름을 입력해주세요.');
      if (gameState.currentStatus === GameStatus.IDLE) return alert('관리자가 방을 생성할 때까지 기다려주세요.');

      const teamId = `team-${data.teamNumber}`;
      const team = gameState.teams.find(t => t.id === teamId);

      if (team) {
        setRole(Role.USER);
        setCurrentTeamId(teamId);
        // 팀 리더 이름 업데이트
        setGameState(prev => ({
          ...prev,
          teams: prev.teams.map(t => t.id === teamId ? { ...t, leaderName: data.name } : t)
        }));
      } else {
        alert('해당 팀을 찾을 수 없습니다.');
      }
    }
  };

  const myTeam = gameState.teams.find(t => t.id === currentTeamId);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {!role ? (
        <Login onLogin={handleLogin} availableTeams={gameState.totalTeams || 10} />
      ) : role === Role.ADMIN ? (
        <AdminDashboard gameState={gameState} setGameState={setGameState} />
      ) : myTeam ? (
        <UserDashboard gameState={gameState} myTeam={myTeam} setGameState={setGameState} />
      ) : (
        <div className="flex-1 flex items-center justify-center iso-grid">
          <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-10 rounded-3xl text-center border border-slate-700/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
            <p className="text-xl font-bold text-white">세션 로딩 중...</p>
            <p className="text-sm text-slate-400 mt-2">잠시만 기다려주세요</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
