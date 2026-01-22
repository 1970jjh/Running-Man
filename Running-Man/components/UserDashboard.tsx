
import React, { useState, useMemo } from 'react';
import { GameState, Team, GameStatus, GameStep } from '../types';
import InvestmentModule from './InvestmentModule';
import { INFO_CARDS, getInfoPrice, MAX_PURCHASED_INFO_PER_ROUND, STEP_NAMES, INITIAL_SEED_MONEY } from '../constants';

interface UserDashboardProps {
  gameState: GameState;
  myTeam: Team;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onExitRequest?: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ gameState, myTeam, setGameState, onExitRequest }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'invest' | 'portfolio'>('info');
  const [showConfirmPopup, setShowConfirmPopup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [viewingCard, setViewingCard] = useState<string | null>(null);

  // 총 자산 계산
  const totalAssets = useMemo(() => {
    const stockValue = Object.entries(myTeam.portfolio).reduce((acc, [id, qty]) => {
      const stock = gameState.stocks.find(s => s.id === id);
      const price = stock?.prices[gameState.currentRound] || 0;
      return acc + (qty * price);
    }, 0);
    return myTeam.currentCash + stockValue;
  }, [myTeam, gameState.stocks, gameState.currentRound]);

  // 현재 라운드 구매 개수
  const currentRoundPurchased = myTeam.purchasedInfoCountPerRound[gameState.currentRound] || 0;

  // 정보 구매 (현금)
  const purchaseInfo = (cardId: string) => {
    const price = getInfoPrice(gameState.currentRound);

    if (myTeam.currentCash < price) {
      alert('잔액이 부족합니다.');
      return;
    }
    if (currentRoundPurchased >= MAX_PURCHASED_INFO_PER_ROUND) {
      alert(`라운드당 최대 ${MAX_PURCHASED_INFO_PER_ROUND}개까지 구매 가능합니다.`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === myTeam.id ? {
        ...t,
        currentCash: t.currentCash - price,
        unlockedCards: [...t.unlockedCards, cardId],
        purchasedInfoCountPerRound: {
          ...t.purchasedInfoCountPerRound,
          [gameState.currentRound]: (t.purchasedInfoCountPerRound[gameState.currentRound] || 0) + 1
        }
      } : t)
    }));
    setShowConfirmPopup(null);
  };

  // 무료권 사용
  const useFreeInfo = (cardId: string) => {
    if (myTeam.grantedInfoCount <= 0) {
      alert('사용 가능한 무료 정보권이 없습니다.');
      return;
    }
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

  // 수익률 계산
  const profitRate = useMemo(() => {
    return ((totalAssets - INITIAL_SEED_MONEY) / INITIAL_SEED_MONEY) * 100;
  }, [totalAssets]);

  return (
    <div className="min-h-screen flex flex-col iso-grid relative z-10">
      {/* 상단 헤더 */}
      <header className="bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl p-4 md:p-6 border-b border-slate-700/50 sticky top-0 z-40 animate-fade-in-up">
        <div className="max-w-4xl mx-auto">
          {/* 팀 정보 & 상태 */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {/* 나가기 버튼 */}
              {onExitRequest && (
                <button
                  onClick={onExitRequest}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 border border-slate-600/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600/50 hover:border-rose-500/50 transition-all"
                  title="방 나가기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                </button>
              )}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                {myTeam.number}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Team {myTeam.number}</h2>
                <p className="text-xs text-slate-400">{myTeam.leaderName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
                R{gameState.currentRound}
              </span>
              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">
                {STEP_NAMES[gameState.currentStep]}
              </span>
            </div>
          </div>

          {/* 자산 현황 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Assets</p>
              <p className="text-lg font-black text-white font-display">{totalAssets.toLocaleString()}원</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Cash</p>
              <p className="text-lg font-black text-emerald-400 font-display">{myTeam.currentCash.toLocaleString()}원</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Profit</p>
              <p className={`text-lg font-black font-display ${profitRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* 타이머 (투자 단계일 때) */}
          {gameState.currentStep === GameStep.INVESTMENT && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-bold">투자 시간</span>
                <span className={`text-sm font-black font-display ${
                  gameState.timerSeconds < 60 ? 'text-rose-400' :
                  gameState.timerSeconds < 180 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {Math.floor(gameState.timerSeconds / 60)}:{(gameState.timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    gameState.timerSeconds < 60 ? 'bg-gradient-to-r from-rose-500 to-rose-400' :
                    gameState.timerSeconds < 180 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                    'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  }`}
                  style={{ width: `${(gameState.timerSeconds / (gameState.timerMaxSeconds || 300)) * 100}%` }}
                />
              </div>
              {gameState.isInvestmentLocked && (
                <p className="text-xs text-rose-400 mt-2 text-center font-bold">🔒 투자가 잠금되었습니다</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-4 pb-24 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* 정보 센터 탭 */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* 정보 구매권 현황 */}
              <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-5 border border-slate-700/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="text-2xl">🎫</span>
                    정보 구매권
                  </h3>
                  <div className="flex gap-3 text-sm">
                    <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg font-bold border border-indigo-500/30">
                      무료권: {myTeam.grantedInfoCount}개
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg font-bold border border-amber-500/30">
                      유료 구매: {currentRoundPurchased}/{MAX_PURCHASED_INFO_PER_ROUND}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  💡 현재 라운드 구매 가격: <span className="text-amber-300 font-bold">{(getInfoPrice(gameState.currentRound) / 10000).toLocaleString()}만원</span>
                </p>
                {/* 정보 구매 단계 안내 */}
                {gameState.currentStep !== GameStep.INFO_PURCHASE && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <p className="text-xs text-rose-300 font-medium">
                      🔒 정보 구매는 <span className="font-bold">'정보구매'</span> 단계에서만 가능합니다.
                      <span className="block text-rose-400/70 mt-1">현재 단계: {STEP_NAMES[gameState.currentStep]}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 카테고리 필터 */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                    selectedCategory === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  전체
                </button>
                {[0, 1, 2, 3, 4].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    카테고리 {cat}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedCategory(-1)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                    selectedCategory === -1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  내 정보 ({myTeam.unlockedCards.length})
                </button>
              </div>

              {/* 정보 카드 목록 (세로 리스트) */}
              <div className="space-y-2">
                {INFO_CARDS
                  .filter(card => {
                    if (selectedCategory === -1) return myTeam.unlockedCards.includes(card.id);
                    if (selectedCategory !== null) return card.categoryIndex === selectedCategory;
                    return true;
                  })
                  .map(card => {
                    const isUnlocked = myTeam.unlockedCards.includes(card.id);
                    const canPurchase = gameState.currentStep === GameStep.INFO_PURCHASE;

                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          if (isUnlocked) {
                            setViewingCard(card.id);
                          } else if (canPurchase) {
                            setShowConfirmPopup(card.id);
                          }
                        }}
                        className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                          isUnlocked
                            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 cursor-pointer'
                            : canPurchase
                              ? 'bg-slate-700/30 border border-slate-600/30 hover:border-indigo-500/50 cursor-pointer'
                              : 'bg-slate-800/30 border border-slate-700/30 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {/* 카드 ID & 아이콘 */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isUnlocked
                            ? 'bg-emerald-500/30 border border-emerald-500/50'
                            : 'bg-slate-700/50 border border-slate-600/30'
                        }`}>
                          <span className="text-lg font-black text-white">{card.stockId}</span>
                        </div>

                        {/* 카드 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                              {card.id}
                            </span>
                            <span className="text-sm font-bold text-white">{card.stockId}사 정보</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">카테고리 {card.categoryIndex}</p>
                        </div>

                        {/* 상태 표시 */}
                        <div className="flex items-center">
                          {isUnlocked ? (
                            <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30">
                              ✓ 열람
                            </span>
                          ) : canPurchase ? (
                            <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/30">
                              구매
                            </span>
                          ) : (
                            <span className="bg-slate-700/50 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold">
                              🔒
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 투자 탭 */}
          {activeTab === 'invest' && (
            <InvestmentModule
              gameState={gameState}
              myTeam={myTeam}
              totalAssets={totalAssets}
              setGameState={setGameState}
            />
          )}

          {/* 포트폴리오 탭 */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* 보유 종목 */}
              <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-5 border border-slate-700/50">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">💼</span>
                  보유 종목
                </h3>

                {Object.entries(myTeam.portfolio).filter(([_, qty]) => qty > 0).length === 0 ? (
                  <p className="text-center text-slate-400 py-8">보유 중인 종목이 없습니다</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(myTeam.portfolio)
                      .filter(([_, qty]) => qty > 0)
                      .map(([stockId, qty]) => {
                        const stock = gameState.stocks.find(s => s.id === stockId);
                        if (!stock) return null;

                        const currentPrice = stock.prices[gameState.currentRound];
                        const value = qty * currentPrice;

                        // 주가 변동률: 1R은 0%, 2R부터는 이전 라운드 대비
                        let change = 0;
                        if (gameState.currentRound > 1) {
                          const prevPrice = stock.prices[gameState.currentRound - 1];
                          change = ((currentPrice - prevPrice) / prevPrice) * 100;
                        }

                        return (
                          <div key={stockId} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                              <span className="text-lg font-black text-white">{stockId}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-white">{stock.name}</p>
                              <p className="text-xs text-slate-400">{qty.toLocaleString()}주 보유</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-white font-display">{value.toLocaleString()}원</p>
                              {gameState.currentRound === 1 ? (
                                <p className="text-xs font-bold text-slate-500">- 0.0%</p>
                              ) : (
                                <p className={`text-xs font-bold ${change >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                  {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 라운드별 결과 */}
              {myTeam.roundResults.length > 0 && (
                <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-5 border border-slate-700/50">
                  <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    라운드별 수익률
                  </h3>

                  <div className="flex items-end gap-4 h-40 p-4 bg-slate-700/30 rounded-xl">
                    {myTeam.roundResults.map((result, idx) => {
                      const maxRate = Math.max(...myTeam.roundResults.map(r => Math.abs(r.profitRate)), 10);
                      const height = Math.min(100, (Math.abs(result.profitRate) / maxRate) * 100);

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                          <span className={`text-xs font-bold mb-2 ${result.profitRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.profitRate >= 0 ? '+' : ''}{result.profitRate.toFixed(1)}%
                          </span>
                          <div className="w-full flex flex-col justify-end h-24">
                            <div
                              className={`w-full rounded-t-lg transition-all ${
                                result.profitRate >= 0
                                  ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                  : 'bg-gradient-to-t from-rose-600 to-rose-400'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 mt-2 font-bold">R{result.round}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 누적 수익률 */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-700/30 text-center">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">누적 수익률</p>
                    <p className={`text-3xl font-black font-display ${
                      (myTeam.roundResults[myTeam.roundResults.length - 1]?.cumulativeProfitRate || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {(myTeam.roundResults[myTeam.roundResults.length - 1]?.cumulativeProfitRate || 0) >= 0 ? '+' : ''}
                      {(myTeam.roundResults[myTeam.roundResults.length - 1]?.cumulativeProfitRate || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 하단 탭 내비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 px-6 py-4 flex justify-around items-center z-50">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'info' ? 'text-indigo-400 scale-110' : 'text-slate-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span className="text-[10px] font-bold uppercase">Info</span>
        </button>

        <button
          onClick={() => setActiveTab('invest')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'invest' ? 'text-indigo-400 scale-110' : 'text-slate-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
          <span className="text-[10px] font-bold uppercase">Trade</span>
        </button>

        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'portfolio' ? 'text-indigo-400 scale-110' : 'text-slate-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <span className="text-[10px] font-bold uppercase">Portfolio</span>
        </button>
      </nav>

      {/* 정보 구매 확인 팝업 */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="iso-card bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl max-w-sm w-full border border-slate-700/50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-3xl font-black text-white">
                  {INFO_CARDS.find(c => c.id === showConfirmPopup)?.stockId}
                </span>
              </div>
              <h4 className="text-xl font-black text-white mb-2">정보 열람</h4>
              <p className="text-sm text-slate-400">
                <span className="text-indigo-300 font-bold">{showConfirmPopup}</span> 정보를 열람하시겠습니까?
              </p>
            </div>

            <div className="space-y-3">
              {myTeam.grantedInfoCount > 0 && (
                <button
                  onClick={() => useFreeInfo(showConfirmPopup)}
                  className="btn-3d w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl"
                >
                  🎫 무료권 사용 (잔여 {myTeam.grantedInfoCount}개)
                </button>
              )}

              <button
                onClick={() => purchaseInfo(showConfirmPopup)}
                disabled={currentRoundPurchased >= MAX_PURCHASED_INFO_PER_ROUND}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  currentRoundPurchased >= MAX_PURCHASED_INFO_PER_ROUND
                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-700/50 text-white border-2 border-slate-600/50 hover:border-amber-500/50'
                }`}
              >
                💰 현금 구매 ({(getInfoPrice(gameState.currentRound) / 10000).toLocaleString()}만원)
                {currentRoundPurchased >= MAX_PURCHASED_INFO_PER_ROUND && (
                  <span className="block text-xs text-rose-400 mt-1">라운드 구매 한도 초과</span>
                )}
              </button>

              <button
                onClick={() => setShowConfirmPopup(null)}
                className="w-full text-slate-500 hover:text-white text-sm py-3 font-semibold transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정보 카드 이미지 뷰어 */}
      {viewingCard && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingCard(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setViewingCard(null)}
              className="absolute -top-2 -right-2 z-20 w-10 h-10 rounded-full bg-slate-800 border border-slate-600/50 flex items-center justify-center text-white hover:bg-slate-700 transition-colors shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            {/* 카드 정보 헤더 */}
            <div className="mb-4 text-center">
              <span className="bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full text-sm font-bold border border-indigo-500/30">
                {viewingCard} - {INFO_CARDS.find(c => c.id === viewingCard)?.stockId}사 정보
              </span>
            </div>

            {/* 이미지 직접 표시 */}
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={INFO_CARDS.find(c => c.id === viewingCard)?.imageUrl || ''}
                alt={`${viewingCard} 정보 카드`}
                className="max-w-full max-h-[75vh] object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* 이미지 로드 실패 시 폴백 */}
              <div className="hidden p-8 text-center">
                <p className="text-slate-400 mb-4">이미지를 불러올 수 없습니다</p>
                <a
                  href={INFO_CARDS.find(c => c.id === viewingCard)?.imageUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500"
                >
                  새 탭에서 열기
                </a>
              </div>
            </div>

            {/* 하단 닫기 버튼 */}
            <button
              onClick={() => setViewingCard(null)}
              className="mt-4 text-slate-400 hover:text-white text-sm font-semibold transition-colors"
            >
              탭하여 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
