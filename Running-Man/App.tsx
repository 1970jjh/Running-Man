
import React, { useState } from 'react';
import { Role, GameStatus, GameStep, GameState, Team } from './types';
import { STOCK_DATA } from './constants';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';

const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    roomName: '',
    totalTeams: 0,
    currentStatus: GameStatus.IDLE,
    currentStep: GameStep.MINI_GAME,
    timerSeconds: 300,
    isTimerRunning: false,
    teams: [],
    stocks: STOCK_DATA
  });

  const handleLogin = (selectedRole: Role, data?: { name: string; teamNumber: number; password?: string }) => {
    if (selectedRole === Role.ADMIN) {
      if (data?.password === '6749467') {
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-blue-500/30">
      {!role ? (
        <Login onLogin={handleLogin} />
      ) : role === Role.ADMIN ? (
        <AdminDashboard gameState={gameState} setGameState={setGameState} />
      ) : myTeam ? (
        <UserDashboard gameState={gameState} myTeam={myTeam} setGameState={setGameState} />
      ) : (
        <div className="flex-1 flex items-center justify-center">Loading session...</div>
      )}
    </div>
  );
};

export default App;
