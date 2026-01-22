
import React, { useState, useMemo } from 'react';
import { GameState, Team, Stock, GameStep } from '../types';
import { MAX_INVESTMENT_RATIO } from '../constants';

interface InvestmentModuleProps {
  gameState: GameState;
  myTeam: Team;
  totalAssets: number;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const InvestmentModule: React.FC<InvestmentModuleProps> = ({ gameState, myTeam, totalAssets, setGameState }) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [qty, setQty] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // 현재 라운드의 주가 인덱스
  const currentRoundIdx = gameState.currentRound;

  // 한 종목당 최대 투자 가능 금액 (총 자산의 30%)
  const maxInvestablePerStock = totalAssets * MAX_INVESTMENT_RATIO;

  // 선택한 종목의 현재 투자 금액
  const currentInvested = useMemo(() => {
    if (!selectedStock) return 0;
    const currentQty = myTeam.portfolio[selectedStock.id] || 0;
    return currentQty * selectedStock.prices[currentRoundIdx];
  }, [selectedStock, myTeam.portfolio, currentRoundIdx]);

  // 구매 시 예상 투자 금액
  const estimatedInvestment = useMemo(() => {
    if (!selectedStock || qty <= 0) return 0;
    return qty * selectedStock.prices[currentRoundIdx];
  }, [selectedStock, qty, currentRoundIdx]);

  // 30% 초과 여부
  const isOverLimit = useMemo(() => {
    return (currentInvested + estimatedInvestment) > maxInvestablePerStock;
  }, [currentInvested, estimatedInvestment, maxInvestablePerStock]);

  // 투자 가능 여부 (타이머와 관계없이 isInvestmentLocked만 체크)
  const isTradeDisabled = gameState.currentStep !== GameStep.INVESTMENT ||
                          gameState.isInvestmentLocked;

  // 매수
  const handleBuy = () => {
    if (!selectedStock || isTradeDisabled || qty <= 0) return;

    const price = selectedStock.prices[currentRoundIdx];
    const totalCost = qty * price;
    const newTotalInvestment = currentInvested + totalCost;

    if (newTotalInvestment > maxInvestablePerStock) {
      setShowLimitWarning(true);
      return;
    }

    if (totalCost > myTeam.currentCash) {
      alert('현금이 부족합니다.');
      return;
    }

    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === myTeam.id ? {
        ...t,
        currentCash: t.currentCash - totalCost,
        portfolio: {
          ...t.portfolio,
          [selectedStock.id]: (t.portfolio[selectedStock.id] || 0) + qty
        }
      } : t)
    }));
    setQty(0);
    setSelectedStock(null);
  };

  // 매도
  const handleSell = () => {
    if (!selectedStock || isTradeDisabled || qty <= 0) return;

    const price = selectedStock.prices[currentRoundIdx];
    const currentQty = myTeam.portfolio[selectedStock.id] || 0;

    if (qty > currentQty) {
      alert('보유 수량이 부족합니다.');
      return;
    }

    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === myTeam.id ? {
        ...t,
        currentCash: t.currentCash + (qty * price),
        portfolio: {
          ...t.portfolio,
          [selectedStock.id]: currentQty - qty
        }
      } : t)
    }));
    setQty(0);
    setSelectedStock(null);
  };

  // 최대 매수 가능 수량 계산
  const maxBuyQty = useMemo(() => {
    if (!selectedStock) return 0;
    const price = selectedStock.prices[currentRoundIdx];
    const remainingLimit = maxInvestablePerStock - currentInvested;
    const byLimit = Math.floor(remainingLimit / price);
    const byCash = Math.floor(myTeam.currentCash / price);
    return Math.max(0, Math.min(byLimit, byCash));
  }, [selectedStock, currentRoundIdx, maxInvestablePerStock, currentInvested, myTeam.currentCash]);

  return (
    <div className="space-y-6">
      {/* 거래소 상태 표시 */}
      <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 rounded-2xl p-5 border border-slate-700/50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span className="text-2xl">📈</span>
            거래소
          </h3>
          {isTradeDisabled ? (
            <span className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-lg text-xs font-bold border border-rose-500/30 flex items-center gap-1">
              <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
              거래 불가
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              거래 가능
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          💡 한 종목당 총 자산의 <span className="text-amber-300 font-bold">30%</span>까지 투자 가능
          <span className="ml-2 text-slate-500">(최대 {maxInvestablePerStock.toLocaleString()}원)</span>
        </p>
      </div>

      {!selectedStock ? (
        // 종목 리스트
        <div className="space-y-3">
          {gameState.stocks.map(stock => {
            const price = stock.prices[currentRoundIdx];
            const heldQty = myTeam.portfolio[stock.id] || 0;
            const investedAmount = heldQty * price;
            const investRatio = (investedAmount / totalAssets) * 100;

            // 주가 변동률 계산: 1R은 0%, 2R부터는 이전 라운드 대비
            let change = 0;
            if (currentRoundIdx > 1) {
              const prevPrice = stock.prices[currentRoundIdx - 1];
              change = ((price - prevPrice) / prevPrice) * 100;
            }

            return (
              <button
                key={stock.id}
                onClick={() => setSelectedStock(stock)}
                className="w-full stock-card p-4 rounded-2xl flex items-center gap-4 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* 종목 아이콘 */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center border border-indigo-500/20">
                  <span className="text-lg font-black text-white">{stock.id}</span>
                </div>

                {/* 종목 정보 */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{stock.name}</p>
                    {heldQty > 0 && (
                      <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        {heldQty}주 보유
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{stock.id} Corp</p>
                </div>

                {/* 가격 & 변동 (이전 라운드 대비) */}
                <div className="text-right">
                  <p className="font-black text-white font-display">{price.toLocaleString()}원</p>
                  {currentRoundIdx === 1 ? (
                    <p className="text-xs font-bold text-slate-500">- 0.0%</p>
                  ) : (
                    <p className={`text-xs font-bold ${change >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                      {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                    </p>
                  )}
                </div>

                {/* 투자 비율 인디케이터 */}
                {heldQty > 0 && (
                  <div className="w-16">
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          investRatio >= 25 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (investRatio / 30) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 text-center mt-1">{investRatio.toFixed(1)}%</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // 거래 패널
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-6 rounded-2xl border border-slate-700/50">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-2xl font-black text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                  <span className="font-black">{selectedStock.id}</span>
                </div>
                {selectedStock.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1">Trading Panel</p>
            </div>
            <button
              onClick={() => { setSelectedStock(null); setQty(0); }}
              className="p-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* 현재가 */}
          <div className="p-4 rounded-xl bg-slate-700/30 mb-6">
            <div className="flex justify-between items-end">
              <span className="text-xs text-slate-400 font-bold uppercase">현재가</span>
              <span className="text-3xl font-black text-indigo-300 font-display">
                {selectedStock.prices[currentRoundIdx].toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 투자 현황 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-700/30">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">투자 한도 (30%)</p>
              <p className="text-lg font-black text-amber-300 font-display">{maxInvestablePerStock.toLocaleString()}원</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-700/30">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">현재 투자액</p>
              <p className={`text-lg font-black font-display ${
                currentInvested > maxInvestablePerStock * 0.8 ? 'text-amber-300' : 'text-emerald-300'
              }`}>
                {currentInvested.toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 투자 비율 바 */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>투자 비율</span>
              <span className={isOverLimit ? 'text-rose-400 font-bold' : ''}>
                {((currentInvested + estimatedInvestment) / maxInvestablePerStock * 100).toFixed(1)}% / 100%
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isOverLimit ? 'bg-gradient-to-r from-rose-500 to-rose-400' :
                  (currentInvested / maxInvestablePerStock) > 0.8 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  'bg-gradient-to-r from-emerald-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, ((currentInvested + estimatedInvestment) / maxInvestablePerStock) * 100)}%` }}
              />
            </div>
            {isOverLimit && (
              <p className="text-xs text-rose-400 mt-2 font-bold flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                30% 투자 한도를 초과합니다!
              </p>
            )}
          </div>

          {/* 수량 입력 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-slate-400 uppercase">거래 수량</label>
              <button
                onClick={() => setQty(maxBuyQty)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
              >
                최대 {maxBuyQty.toLocaleString()}주
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(0, q - 10))}
                className="w-14 h-14 rounded-xl bg-slate-700/50 text-white font-bold text-xl hover:bg-slate-700 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(Math.max(0, Number(e.target.value)))}
                className="flex-1 h-14 px-4 rounded-xl bg-slate-700/50 border-2 border-slate-600/50 text-white font-bold text-xl text-center outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => setQty(q => q + 10)}
                className="w-14 h-14 rounded-xl bg-slate-700/50 text-white font-bold text-xl hover:bg-slate-700 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* 예상 금액 */}
          {qty > 0 && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-indigo-300">예상 거래 금액</span>
                <span className="text-xl font-black text-indigo-300 font-display">
                  {estimatedInvestment.toLocaleString()}원
                </span>
              </div>
            </div>
          )}

          {/* 매수/매도 버튼 */}
          <div className="grid grid-cols-2 gap-4">
            <button
              disabled={isTradeDisabled || qty <= 0 || isOverLimit}
              onClick={handleBuy}
              className={`py-4 rounded-xl font-bold text-lg transition-all ${
                isTradeDisabled || qty <= 0 || isOverLimit
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'btn-3d bg-gradient-to-r from-rose-500 to-rose-600 text-white'
              }`}
            >
              매수
            </button>
            <button
              disabled={isTradeDisabled || qty <= 0 || (myTeam.portfolio[selectedStock.id] || 0) < qty}
              onClick={handleSell}
              className={`py-4 rounded-xl font-bold text-lg transition-all ${
                isTradeDisabled || qty <= 0 || (myTeam.portfolio[selectedStock.id] || 0) < qty
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'btn-3d bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              }`}
            >
              매도
            </button>
          </div>

          {/* 보유 현황 */}
          {(myTeam.portfolio[selectedStock.id] || 0) > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-slate-700/30 text-center">
              <p className="text-xs text-slate-400">현재 보유</p>
              <p className="text-lg font-black text-white">
                {(myTeam.portfolio[selectedStock.id] || 0).toLocaleString()}주
                <span className="text-sm text-slate-400 ml-2">
                  ({((myTeam.portfolio[selectedStock.id] || 0) * selectedStock.prices[currentRoundIdx]).toLocaleString()}원)
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* 30% 초과 경고 모달 */}
      {showLimitWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="iso-card bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl max-w-sm w-full border border-rose-500/50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h4 className="text-xl font-black text-white mb-2">투자 한도 초과!</h4>
              <p className="text-sm text-slate-400">
                한 종목당 총 자산의 <span className="text-rose-400 font-bold">30%</span>까지만 투자할 수 있습니다.
              </p>
            </div>
            <button
              onClick={() => setShowLimitWarning(false)}
              className="w-full py-4 rounded-xl bg-slate-700/50 text-white font-bold hover:bg-slate-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentModule;
