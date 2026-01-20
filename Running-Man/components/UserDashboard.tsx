
import React, { useState, useMemo } from 'react';
import { GameState, Team, GameStatus, GameStep, Stock } from '../types';
import InvestmentModule from './InvestmentModule';
import { INFO_CARDS } from '../constants';

interface UserDashboardProps {
  gameState: GameState;
  myTeam: Team;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ gameState, myTeam, setGameState }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'invest' | 'status'>('info');
  const [showConfirmPopup, setShowConfirmPopup] = useState<string | null>(null);

  const totalAssets = useMemo(() => {
    const currentRoundIdx = [GameStatus.IDLE, GameStatus.SETUP, GameStatus.ROUND_1, GameStatus.ROUND_2, GameStatus.ROUND_3, GameStatus.ROUND_4].indexOf(gameState.currentStatus);
    // Explicitly typing acc and the destructured [id, qty] as [string, number] to prevent "not a number" arithmetic errors in TS
    const stockValue = Object.entries(myTeam.portfolio).reduce((acc: number, [id, qty]: [string, number]) => {
      const stock = gameState.stocks.find(s => s.id === id);
      const price = stock?.prices[currentRoundIdx] || 0;
      return acc + (qty * price);
    }, 0);
    return myTeam.currentCash + stockValue;
  }, [myTeam, gameState.stocks, gameState.currentStatus]);

  const purchaseInfo = (cardId: string) => {
    const roundNumber = parseInt(gameState.currentStatus.split('_')[1] || '1');
    const price = roundNumber * 100000;

    if (myTeam.currentCash < price) return alert('잔액이 부족합니다.');
    if (myTeam.purchasedInfoCount >= 10) return alert('라운드당 최대 10개까지 구매 가능합니다.');

    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === myTeam.id ? {
        ...t,
        currentCash: t.currentCash - price,
        unlockedCards: [...t.unlockedCards, cardId],
        purchasedInfoCount: t.purchasedInfoCount + 1
      } : t)
    }));
    setShowConfirmPopup(null);
  };

  const useFreeInfo = (cardId: string) => {
    if (myTeam.grantedInfoCount <= 0) return alert('사용 가능한 무료 정보권이 없습니다.');
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === myTeam.id ? {
        ...t,
        grantedInfoCount: t.grantedInfoCount - 1,
        unlockedCards: [...t.unlockedCards, cardId]
      } : t)
    }));
    setShowConfirmPopup(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 text-white font-sans">
      {/* 상단 팀 스탯 바 */}
      <header className="bg-white/10 backdrop-blur-md p-6 pt-10 border-b border-white/10 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
            <h2 className="text-xl font-black tracking-tight">TEAM {myTeam.number}</h2>
          </div>
          <span className="bg-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase">
            {gameState.currentStatus} | {gameState.currentStep}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
            <p className="text-[10px] text-white/40 font-black uppercase mb-1">Total Assets</p>
            <p className="text-xl font-black text-blue-400">{totalAssets.toLocaleString()}₩</p>
          </div>
          <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
            <p className="text-[10px] text-white/40 font-black uppercase mb-1">Cash Available</p>
            <p className="text-xl font-black text-emerald-400">{myTeam.currentCash.toLocaleString()}₩</p>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-28">
        {activeTab === 'info' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black tracking-tighter border-l-4 border-blue-500 pl-3">정보 센터</h3>
                <div className="text-[10px] font-bold text-white/50 bg-white/5 px-3 py-1 rounded-full">
                  무료권: {myTeam.grantedInfoCount} | 유료: {myTeam.purchasedInfoCount}/10
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                {INFO_CARDS.filter(c => c.round === parseInt(gameState.currentStatus.split('_')[1] || '1') || myTeam.unlockedCards.includes(c.id)).map(card => {
                  const isUnlocked = myTeam.unlockedCards.includes(card.id);
                  return (
                    <div 
                      key={card.id} 
                      onClick={() => !isUnlocked && setShowConfirmPopup(card.id)}
                      className={`relative aspect-[3/4] rounded-3xl overflow-hidden shadow-xl transform transition-all active:scale-95 ${isUnlocked ? 'bg-white text-slate-900 border-4 border-blue-500' : 'bg-slate-800 text-white'}`}
                    >
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                           <svg className="w-8 h-8 text-white/20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Locked Info</p>
                           <p className="text-[8px] font-bold mt-1 opacity-60">TAB TO UNLOCK</p>
                        </div>
                      )}
                      <div className="p-4 flex flex-col h-full">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full self-start mb-2 ${isUnlocked ? 'bg-blue-100 text-blue-600' : 'bg-white/10 text-white/50'}`}>#{card.id}</span>
                        <h4 className="text-sm font-black mb-1">{card.stockId}사 전략 보고서</h4>
                        {isUnlocked && <p className="text-[10px] font-medium leading-tight opacity-70 mt-2">{card.content}</p>}
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <InvestmentModule 
            gameState={gameState} 
            myTeam={myTeam} 
            totalAssets={totalAssets}
            setGameState={setGameState}
          />
        )}

        {activeTab === 'status' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <h3 className="text-lg font-black tracking-tighter border-l-4 border-blue-500 pl-3">팀 현황 리포트</h3>
             <div className="bg-white/5 rounded-[40px] p-8 border border-white/5 text-center">
                <p className="text-white/40 text-[10px] font-black mb-4">현재 수익률 분포</p>
                <div className="flex items-end justify-center gap-4 h-48">
                  {[10, 45, 20, 80, 55].map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-xl" style={{ height: `${h}%` }}></div>
                      <span className="text-[8px] font-black opacity-40 uppercase">R{i+1}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* 하단 탭 내비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-2xl border-t border-white/10 px-8 py-5 flex justify-around items-center rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <button onClick={() => setActiveTab('info')} className={`flex flex-col items-center transition-all ${activeTab === 'info' ? 'text-blue-500 scale-110' : 'text-white/30'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z"></path></svg>
          <span className="text-[8px] font-black mt-1 uppercase tracking-widest">Reports</span>
        </button>
        <button onClick={() => setActiveTab('invest')} className={`flex flex-col items-center transition-all ${activeTab === 'invest' ? 'text-blue-500 scale-110' : 'text-white/30'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-[8px] font-black mt-1 uppercase tracking-widest">Trade</span>
        </button>
        <button onClick={() => setActiveTab('status')} className={`flex flex-col items-center transition-all ${activeTab === 'status' ? 'text-blue-500 scale-110' : 'text-white/30'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          <span className="text-[8px] font-black mt-1 uppercase tracking-widest">Assets</span>
        </button>
      </nav>

      {/* 정보 구매 확인 팝업 */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-800 p-8 rounded-[40px] border border-white/10 max-w-xs w-full text-center">
            <h4 className="text-xl font-black mb-2">정보 열람</h4>
            <p className="text-white/60 text-xs mb-8">정말 이 정보를 구매하시겠습니까?</p>
            <div className="space-y-3">
              {myTeam.grantedInfoCount > 0 && (
                <button 
                  onClick={() => useFreeInfo(showConfirmPopup)}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl"
                >
                  무료권 사용 (잔여 {myTeam.grantedInfoCount})
                </button>
              )}
              <button 
                onClick={() => purchaseInfo(showConfirmPopup)}
                className="w-full bg-white/10 text-white font-black py-4 rounded-2xl"
              >
                현금 구매 ({(parseInt(gameState.currentStatus.split('_')[1] || '1') * 10).toLocaleString()}만원)
              </button>
              <button onClick={() => setShowConfirmPopup(null)} className="w-full text-white/30 text-[10px] font-black uppercase pt-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
