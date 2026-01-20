
import React, { useState, useMemo } from 'react';
import { GameState, Team, Stock, GameStatus, GameStep } from '../types';

interface InvestmentModuleProps {
  gameState: GameState;
  myTeam: Team;
  totalAssets: number;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const InvestmentModule: React.FC<InvestmentModuleProps> = ({ gameState, myTeam, totalAssets, setGameState }) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [qty, setQty] = useState(0);

  const currentRoundIdx = useMemo(() => {
    return [GameStatus.IDLE, GameStatus.SETUP, GameStatus.ROUND_1, GameStatus.ROUND_2, GameStatus.ROUND_3, GameStatus.ROUND_4].indexOf(gameState.currentStatus);
  }, [gameState.currentStatus]);

  const maxInvestablePerStock = totalAssets * 0.3;
  const currentInvested = useMemo(() => {
    if (!selectedStock) return 0;
    const currentQty = myTeam.portfolio[selectedStock.id] || 0;
    return currentQty * selectedStock.prices[currentRoundIdx];
  }, [selectedStock, myTeam.portfolio, currentRoundIdx]);

  const handleBuy = () => {
    if (!selectedStock || gameState.currentStep !== GameStep.INVESTMENT || gameState.timerSeconds <= 0) return;
    const price = selectedStock.prices[currentRoundIdx];
    const newTotalInvestment = currentInvested + (qty * price);

    if (newTotalInvestment > maxInvestablePerStock) {
      alert(`투자 한도 초과! 한 종목당 총 자산의 30%(${maxInvestablePerStock.toLocaleString()}₩)까지만 투자 가능합니다.`);
      return;
    }

    if (qty * price > myTeam.currentCash) {
      alert('현금이 부족합니다.');
      return;
    }

    setGameState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === myTeam.id ? {
        ...t,
        currentCash: t.currentCash - (qty * price),
        portfolio: {
          ...t.portfolio,
          [selectedStock.id]: (t.portfolio[selectedStock.id] || 0) + qty
        }
      } : t)
    }));
    setQty(0);
    setSelectedStock(null);
  };

  const handleSell = () => {
    if (!selectedStock || gameState.currentStep !== GameStep.INVESTMENT || gameState.timerSeconds <= 0) return;
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

  const isTradeDisabled = gameState.currentStep !== GameStep.INVESTMENT || gameState.timerSeconds <= 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black tracking-tighter border-l-4 border-emerald-500 pl-3">거래소</h3>
        {isTradeDisabled && <span className="text-[8px] font-black text-rose-400 uppercase bg-rose-400/10 px-2 py-1 rounded-lg">Market Closed</span>}
      </div>

      {!selectedStock ? (
        <div className="grid grid-cols-1 gap-3">
          {gameState.stocks.map(stock => {
            const price = stock.prices[currentRoundIdx];
            const prevPrice = stock.prices[currentRoundIdx - 1] || price;
            const diff = ((price - prevPrice) / prevPrice) * 100;
            return (
              <button
                key={stock.id}
                onClick={() => setSelectedStock(stock)}
                className="bg-white/5 border border-white/5 p-5 rounded-3xl flex justify-between items-center active:scale-95 transition-all"
              >
                <div className="text-left">
                  <p className="font-black text-white">{stock.name}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase">{stock.id} CORP</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-400">{price.toLocaleString()}₩</p>
                  <p className={`text-[10px] font-bold ${diff >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[40px] text-slate-900 animate-in zoom-in-95 duration-200">
           <div className="flex justify-between items-start mb-8">
              <div>
                <h4 className="text-2xl font-black">{selectedStock.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedStock.id} TRADING PANEL</p>
              </div>
              <button onClick={() => setSelectedStock(null)} className="p-2 bg-slate-100 rounded-full">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
           </div>

           <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                 <span className="text-xs font-bold text-slate-400 uppercase">Current Price</span>
                 <span className="text-2xl font-black text-blue-600">{selectedStock.prices[currentRoundIdx].toLocaleString()}₩</span>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                 <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                    <span>Available Cash</span>
                    <span className="text-slate-900">{myTeam.currentCash.toLocaleString()}₩</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                    <span>Investment Limit (30%)</span>
                    <span className="text-rose-500">{maxInvestablePerStock.toLocaleString()}₩</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                    <span>Current Portfolio Value</span>
                    <span className="text-indigo-600">{currentInvested.toLocaleString()}₩</span>
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Quantity to Trade</label>
                <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
                  <button onClick={() => setQty(q => Math.max(0, q-10))} className="w-12 h-12 bg-white rounded-xl font-black shadow-sm">-</button>
                  <input 
                    type="number" 
                    value={qty} 
                    onChange={e => setQty(Number(e.target.value))}
                    className="flex-1 bg-transparent text-center font-black text-xl outline-none"
                  />
                  <button onClick={() => setQty(q => q+10)} className="w-12 h-12 bg-white rounded-xl font-black shadow-sm">+</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  disabled={isTradeDisabled}
                  onClick={handleBuy}
                  className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 text-white font-black py-5 rounded-3xl shadow-xl shadow-rose-100 transition-all active:scale-95"
                >
                  BUY
                </button>
                <button 
                  disabled={isTradeDisabled}
                  onClick={handleSell}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                  SELL
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentModule;
