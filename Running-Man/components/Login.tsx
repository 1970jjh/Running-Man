
import React, { useState, useEffect } from 'react';
import { Role, Room } from '../types';
import { BACKGROUND_IMAGE_URL } from '../constants';
import { subscribeToRooms } from '../firebase';

interface LoginProps {
  onLogin: (role: Role, data?: { name: string; teamNumber: number; roomId?: string; password?: string }) => void;
  onAdminAccess: () => void;
}

type LoginStep = 'select-mode' | 'select-room' | 'select-team' | 'admin-login';

const Login: React.FC<LoginProps> = ({ onLogin, onAdminAccess }) => {
  const [step, setStep] = useState<LoginStep>('select-mode');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [userName, setUserName] = useState('');
  const [teamNum, setTeamNum] = useState(1);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 방 목록 실시간 구독
  useEffect(() => {
    const unsubscribe = subscribeToRooms((roomList) => {
      setRooms(roomList);
    });
    return () => unsubscribe();
  }, []);

  // 방 선택
  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setTeamNum(1);
    setStep('select-team');
  };

  // 팀 선택 및 입장
  const handleJoinTeam = () => {
    if (!selectedRoom || !userName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    onLogin(Role.USER, {
      name: userName,
      teamNumber: teamNum,
      roomId: selectedRoom.id
    });
  };

  // 관리자 모드 접근
  const handleAdminAccess = () => {
    onAdminAccess();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-indigo-900/60 to-slate-900/80 backdrop-blur-sm"></div>

      {/* 메인 로그인 카드 */}
      <div className="iso-card bg-gradient-to-br from-slate-800/95 to-slate-900/98 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-md w-full text-center border border-slate-700/50 relative z-10">
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

        {/* 모드 선택 단계 */}
        {step === 'select-mode' && (
          <div className="space-y-5">
            <button
              onClick={() => setStep('select-room')}
              className="btn-3d w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl transition-all text-lg tracking-wide"
            >
              교육생 입장
            </button>

            <button
              onClick={handleAdminAccess}
              className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold py-4 rounded-2xl transition-all border-2 border-slate-600/50 hover:border-amber-500/50"
            >
              관리자 입장
            </button>

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <div className="flex items-center justify-center gap-4 text-slate-500 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  실시간 게임
                </span>
                <span>|</span>
                <span className="font-display">19개 종목</span>
                <span>|</span>
                <span className="font-display">4 라운드</span>
              </div>
            </div>
          </div>
        )}

        {/* 방 선택 단계 */}
        {step === 'select-room' && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-white mb-4">참여할 방을 선택하세요</h3>

            {rooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-2">현재 활성화된 방이 없습니다</p>
                <p className="text-xs text-slate-500">관리자가 방을 생성할 때까지 기다려주세요</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room)}
                    className="w-full p-4 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:border-indigo-500/50 hover:bg-slate-700/80 transition-all text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold">{room.name}</p>
                        <p className="text-xs text-slate-400">
                          {room.totalTeams}개 팀 · {room.maxRounds} 라운드
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${room.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                        <span className="text-xs text-slate-400">
                          {room.gameState?.currentStatus === 'READY' ? '대기중' : '진행중'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep('select-mode')}
              className="w-full text-slate-500 hover:text-white text-sm py-3 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              돌아가기
            </button>
          </div>
        )}

        {/* 팀 선택 단계 */}
        {step === 'select-team' && selectedRoom && (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-4">
              <p className="text-xs text-indigo-300 font-semibold">선택한 방</p>
              <p className="text-white font-bold">{selectedRoom.name}</p>
            </div>

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
                  {[...Array(selectedRoom.totalTeams)].map((_, i) => (
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
              onClick={handleJoinTeam}
              disabled={!userName.trim()}
              className={`btn-3d w-full text-white font-bold py-4 rounded-2xl transition-all text-lg tracking-wide ${
                userName.trim()
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500'
                  : 'bg-slate-600 cursor-not-allowed'
              }`}
            >
              게임 참여하기
            </button>

            <button
              onClick={() => {
                setSelectedRoom(null);
                setStep('select-room');
              }}
              className="w-full text-slate-500 hover:text-white text-sm py-3 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              다른 방 선택
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
