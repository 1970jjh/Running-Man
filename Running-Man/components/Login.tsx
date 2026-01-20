
import React, { useState } from 'react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role, data?: { name: string; teamNumber: number; password?: string }) => void;
  availableTeams: number;
}

const Login: React.FC<LoginProps> = ({ onLogin, availableTeams }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [teamNum, setTeamNum] = useState(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 iso-grid relative overflow-hidden">
      {/* 배경 장식 요소들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 플로팅 3D 큐브들 */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl animate-float border border-indigo-500/30" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl animate-float border border-emerald-500/30" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl animate-float border border-amber-500/30" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-14 h-14 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-2xl animate-float border border-rose-500/30" style={{ animationDelay: '0.5s' }}></div>

        {/* 주식 차트 라인 장식 */}
        <svg className="absolute bottom-0 left-0 w-full h-32 opacity-20" preserveAspectRatio="none">
          <path d="M0,100 Q50,80 100,90 T200,70 T300,85 T400,60 T500,75 T600,50 T700,65 T800,40 T900,55 T1000,30 T1100,45 T1200,20 T1300,35 T1400,10"
                fill="none" stroke="url(#chartGradient)" strokeWidth="2"/>
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1"/>
              <stop offset="50%" stopColor="#10b981"/>
              <stop offset="100%" stopColor="#f59e0b"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 메인 로그인 카드 */}
      <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-md w-full text-center border border-slate-700/50 relative z-10">
        {/* 로고 영역 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-12 hover:rotate-0 transition-transform duration-500">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">$</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white mb-2">
            투자의 귀재들
          </h1>
          <p className="text-indigo-300/70 text-xs font-semibold tracking-[0.3em] uppercase">
            Investment Simulator
          </p>
        </div>

        {!isAdminMode ? (
          <div className="space-y-5">
            {/* 이름 입력 */}
            <div className="relative">
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600/50 text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-slate-700/80 outline-none transition-all font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
            </div>

            {/* 팀 선택 */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-2xl border-2 border-slate-600/50 focus-within:border-indigo-500 transition-all">
                <span className="text-slate-400 text-sm font-semibold pl-3 whitespace-nowrap">소속 팀</span>
                <select
                  value={teamNum}
                  onChange={(e) => setTeamNum(Number(e.target.value))}
                  className="flex-1 bg-transparent text-white font-bold text-lg focus:outline-none appearance-none cursor-pointer pr-8"
                >
                  {[...Array(availableTeams || 10)].map((_, i) => (
                    <option key={i+1} value={i+1} className="bg-slate-800 text-white">
                      Team {i+1}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 게임 참여 버튼 */}
            <button
              onClick={() => onLogin(Role.USER, { name: userName, teamNumber: teamNum })}
              className="btn-3d w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl transition-all text-lg tracking-wide"
            >
              게임 참여하기
            </button>

            {/* 관리자 모드 전환 */}
            <button
              onClick={() => setIsAdminMode(true)}
              className="w-full text-slate-500 hover:text-indigo-400 text-xs py-3 uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Admin Access
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 관리자 비밀번호 입력 */}
            <div className="relative">
              <input
                type="password"
                placeholder="관리자 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-700/50 border-2 border-slate-600/50 text-white placeholder-slate-400 focus:border-amber-500 focus:bg-slate-700/80 outline-none transition-all font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
            </div>

            {/* 관리자 로그인 버튼 */}
            <button
              onClick={() => onLogin(Role.ADMIN, { name: 'Admin', teamNumber: 0, password })}
              className="btn-3d w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 text-white font-bold py-4 rounded-2xl transition-all text-lg tracking-wide"
            >
              관리자 로그인
            </button>

            {/* 돌아가기 */}
            <button
              onClick={() => setIsAdminMode(false)}
              className="w-full text-slate-500 hover:text-white text-xs py-3 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              돌아가기
            </button>
          </div>
        )}

        {/* 하단 장식 */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="flex items-center justify-center gap-4 text-slate-500 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Market
            </span>
            <span>|</span>
            <span className="font-display">19 Stocks</span>
            <span>|</span>
            <span className="font-display">4 Rounds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
