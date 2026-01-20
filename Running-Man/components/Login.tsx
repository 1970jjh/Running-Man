
import React, { useState } from 'react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role, data?: { name: string; teamNumber: number; password?: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [teamNum, setTeamNum] = useState(1);

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-900 bg-[url('https://images.unsplash.com/photo-1611974717482-58a25a184ee5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-blend-overlay">
      <div className="bg-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[40px] p-10 max-w-md w-full text-center border border-white/20 transform transition-all hover:scale-[1.01]">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">투자의 귀재들</h1>
        <p className="text-blue-200 mb-8 font-medium italic opacity-80 uppercase tracking-widest text-xs">The Legends of Investment</p>

        {!isAdminMode ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="이름을 입력하세요"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
            />
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
              <span className="text-white/50 text-xs font-bold pl-3">소속 팀</span>
              <select 
                value={teamNum}
                onChange={(e) => setTeamNum(Number(e.target.value))}
                className="flex-1 bg-transparent text-white font-black focus:outline-none appearance-none cursor-pointer"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i+1} value={i+1} className="bg-slate-800">Team {i+1}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => onLogin(Role.USER, { name: userName, teamNumber: teamNum })}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl transition-all transform hover:translate-y-[-2px] shadow-[0_10px_20px_rgba(37,99,235,0.3)] active:scale-95"
            >
              게임 참여하기
            </button>
            <button
              onClick={() => setIsAdminMode(true)}
              className="w-full text-white/30 text-[10px] hover:text-white/60 transition-colors py-2 uppercase font-black"
            >
              Admin Access
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button
              onClick={() => onLogin(Role.ADMIN, { name: 'Admin', teamNumber: 0, password })}
              className="w-full bg-slate-100 hover:bg-white text-slate-900 font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
            >
              관리자 로그인
            </button>
            <button
              onClick={() => setIsAdminMode(false)}
              className="w-full text-white/30 text-xs py-2 font-bold"
            >
              돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
