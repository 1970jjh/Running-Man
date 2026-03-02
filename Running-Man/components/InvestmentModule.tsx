
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { GameState, Team, Stock, GameStep } from '../types';
import { getMaxInvestmentRatio, INFO_CARDS, INITIAL_SEED_MONEY } from '../constants';
import { TradeRequest } from '../firebase';
import { playTradeSound, resumeAudioContext } from '../utils/sounds';

interface InvestmentModuleProps {
  gameState: GameState;
  myTeam: Team;
  totalAssets: number;
  onTrade: (trade: Omit<TradeRequest, 'roomId' | 'teamIndex'>) => Promise<{ success: boolean; error?: string }>;
}

const InvestmentModule: React.FC<InvestmentModuleProps> = ({ gameState, myTeam, totalAssets, onTrade }) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [qty, setQty] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // 거래 처리 중 상태
  const [cancellingStockId, setCancellingStockId] = useState<string | null>(null); // 매수취소 처리 중인 종목
  const [showInvestmentTable, setShowInvestmentTable] = useState(false); // 투자현황 테이블 모달
  const [selectedTableRound, setSelectedTableRound] = useState<number>(1); // 선택된 라운드

  // 롱프레스 관련 ref
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressSpeedRef = useRef(200); // 초기 간격 (ms)

  // 롱프레스 정리 함수
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
    longPressSpeedRef.current = 200;
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  // 투자현황 테이블 열 때 현재 라운드로 초기화
  useEffect(() => {
    if (showInvestmentTable) {
      setSelectedTableRound(gameState.currentRound);
    }
  }, [showInvestmentTable, gameState.currentRound]);

  // 롱프레스 시작 (direction: 1 = 증가, -1 = 감소)
  const startLongPress = useCallback((direction: 1 | -1) => {
    clearLongPress();
    let speed = 200;
    let count = 0;

    longPressTimerRef.current = setTimeout(() => {
      const tick = () => {
        setQty(q => Math.max(0, q + direction));
        count++;
        // 점점 빨라짐: 10회마다 속도 증가
        if (count % 10 === 0 && speed > 30) {
          speed = Math.max(30, speed - 40);
          if (longPressIntervalRef.current) clearInterval(longPressIntervalRef.current);
          longPressIntervalRef.current = setInterval(tick, speed);
        }
      };
      longPressIntervalRef.current = setInterval(tick, speed);
    }, 300); // 300ms 후 롱프레스 시작
  }, [clearLongPress]);

  // 현재 라운드의 주가 인덱스 (prices[0]=2010=1R, prices[1]=1R결과=2R, ...)
  const currentRoundIdx = gameState.currentRound - 1;

  // 한 종목당 최대 투자 가능 금액 (라운드별 비율)
  const investmentRatio = getMaxInvestmentRatio(gameState.currentRound);
  const maxInvestablePerStock = totalAssets * investmentRatio;

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

  // 매수취소 가능 여부 (투자 확정 전까지만 가능 - 타이머 잠금과 무관)
  const isCancelAllowed = gameState.currentStep === GameStep.INVESTMENT &&
                          !gameState.isInvestmentConfirmed;

  // 매수
  const handleBuy = async () => {
    if (!selectedStock || isTradeDisabled || qty <= 0 || isProcessing) return;

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

    setIsProcessing(true);

    try {
      const result = await onTrade({
        type: 'BUY',
        stockId: selectedStock.id,
        stockName: selectedStock.name,
        quantity: qty,
        pricePerShare: price,
        round: gameState.currentRound,
        maxInvestablePerStock
      });

      if (!result.success) {
        alert(result.error || '거래 처리 중 오류가 발생했습니다.');
        return;
      }
      // 매수 성공 시 체결음 재생
      await resumeAudioContext();
      playTradeSound();
      setQty(0);
      setSelectedStock(null);
    } catch (error) {
      console.error('매수 처리 실패:', error);
      alert('거래 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  // 매도
  const handleSell = async () => {
    if (!selectedStock || isTradeDisabled || qty <= 0 || isProcessing) return;

    const price = selectedStock.prices[currentRoundIdx];
    const currentQty = myTeam.portfolio[selectedStock.id] || 0;

    if (qty > currentQty) {
      alert('보유 수량이 부족합니다.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await onTrade({
        type: 'SELL',
        stockId: selectedStock.id,
        stockName: selectedStock.name,
        quantity: qty,
        pricePerShare: price,
        round: gameState.currentRound,
        maxInvestablePerStock
      });

      if (!result.success) {
        alert(result.error || '거래 처리 중 오류가 발생했습니다.');
        return;
      }
      // 매도 성공 시 체결음 재생
      await resumeAudioContext();
      playTradeSound();
      setQty(0);
      setSelectedStock(null);
    } catch (error) {
      console.error('매도 처리 실패:', error);
      alert('거래 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  // 매수취소 (보유 주식 전량 매도로 원복)
  const handleCancelBuy = async (stock: Stock) => {
    const heldQty = myTeam.portfolio[stock.id] || 0;
    if (heldQty <= 0 || isProcessing) return;

    setCancellingStockId(stock.id);

    try {
      const price = stock.prices[currentRoundIdx];
      const result = await onTrade({
        type: 'SELL',
        stockId: stock.id,
        stockName: stock.name,
        quantity: heldQty,
        pricePerShare: price,
        round: gameState.currentRound,
        maxInvestablePerStock
      });

      if (!result.success) {
        alert(result.error || '매수취소 처리 중 오류가 발생했습니다.');
        return;
      }
      await resumeAudioContext();
      playTradeSound();
    } catch (error) {
      console.error('매수취소 처리 실패:', error);
      alert('매수취소 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setTimeout(() => setCancellingStockId(null), 500);
    }
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
          💡 한 종목당 총 자산의 <span className="text-amber-300 font-bold">{(investmentRatio * 100).toFixed(0)}%</span>까지 투자 가능
          <span className="ml-2 text-slate-500">(최대 {maxInvestablePerStock.toLocaleString()}원)</span>
        </p>

        {/* 전체 투자현황 보기 버튼 */}
        <button
          onClick={() => setShowInvestmentTable(true)}
          className="mt-3 w-full py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
          </svg>
          📊 전체 투자현황 테이블 보기
        </button>
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
            if (currentRoundIdx > 0) {
              const prevPrice = stock.prices[currentRoundIdx - 1];
              change = ((price - prevPrice) / prevPrice) * 100;
            }

            return (
              <div key={stock.id} className="stock-card rounded-2xl transition-all transform">
                <button
                  onClick={() => setSelectedStock(stock)}
                  className="w-full p-4 flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-transform"
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
                    {currentRoundIdx === 0 ? (
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

                {/* 매수취소 버튼 - 보유 중이고 투자 확정 전에만 표시 */}
                {heldQty > 0 && isCancelAllowed && (
                  <div className="px-4 pb-3 -mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelBuy(stock);
                      }}
                      disabled={cancellingStockId === stock.id}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        cancellingStockId === stock.id
                          ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-orange-300 hover:from-orange-500/30 hover:to-amber-500/30 active:scale-[0.98]'
                      }`}
                    >
                      {cancellingStockId === stock.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          취소 처리중...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          매수취소 ({heldQty}주 전량)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // 거래 패널
        <div className="iso-card bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-4 md:p-6 rounded-2xl border border-slate-700/50">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-4 md:mb-6">
            <div className="flex-1 min-w-0">
              <h4 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="font-black text-sm md:text-base">{selectedStock.id}</span>
                </div>
                <span className="truncate">{selectedStock.name}</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Trading Panel</p>
            </div>
            <button
              onClick={() => { setSelectedStock(null); setQty(0); }}
              className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* 현재가 */}
          <div className="p-3 md:p-4 rounded-lg bg-slate-700/30 mb-4 md:mb-6">
            <div className="flex justify-between items-end">
              <span className="text-xs text-slate-400 font-bold uppercase">현재가</span>
              <span className="text-2xl md:text-3xl font-black text-indigo-300 font-display">
                {selectedStock.prices[currentRoundIdx].toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 투자 현황 */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="p-3 md:p-4 rounded-lg bg-slate-700/30">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">투자 한도</p>
              <p className="text-sm md:text-lg font-black text-amber-300 font-display">{maxInvestablePerStock.toLocaleString()}원</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-slate-700/30">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">현재 투자액</p>
              <p className={`text-sm md:text-lg font-black font-display ${
                currentInvested > maxInvestablePerStock * 0.8 ? 'text-amber-300' : 'text-emerald-300'
              }`}>
                {currentInvested.toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 투자 비율 바 */}
          <div className="mb-4 md:mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>투자 비율</span>
              <span className={isOverLimit ? 'text-rose-400 font-bold' : ''}>
                {((currentInvested + estimatedInvestment) / maxInvestablePerStock * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 md:h-3 bg-slate-700 rounded-full overflow-hidden">
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
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                {(investmentRatio * 100).toFixed(0)}% 한도 초과!
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
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setQty(q => Math.max(0, q - 1))}
                onMouseDown={() => startLongPress(-1)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
                onTouchStart={() => startLongPress(-1)}
                onTouchEnd={clearLongPress}
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-700/50 text-white font-bold text-2xl hover:bg-slate-700 active:bg-slate-600 transition-colors flex items-center justify-center select-none"
              >
                -
              </button>
              <input
                type="number"
                value={qty || ''}
                onChange={e => {
                  const value = e.target.value;
                  // 빈 문자열이면 0으로 설정
                  if (value === '') {
                    setQty(0);
                    return;
                  }
                  // 숫자로 변환하여 앞의 0 자동 제거
                  const numValue = parseInt(value, 10);
                  setQty(Math.max(0, isNaN(numValue) ? 0 : numValue));
                }}
                onFocus={e => {
                  // 포커스 시 0이면 빈 문자열로 변경하여 쉽게 입력 가능
                  if (qty === 0) {
                    e.target.value = '';
                  }
                }}
                onBlur={() => {
                  // 포커스 해제 시 빈 값이면 0으로 복원
                  if (qty === 0) {
                    setQty(0);
                  }
                }}
                onWheel={e => {
                  // 마우스 휠로 수량 변경 방지
                  e.currentTarget.blur();
                }}
                className="flex-1 min-w-0 h-14 px-2 rounded-xl bg-slate-700/50 border-2 border-slate-600/50 text-white font-bold text-xl text-center outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => setQty(q => q + 1)}
                onMouseDown={() => startLongPress(1)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
                onTouchStart={() => startLongPress(1)}
                onTouchEnd={clearLongPress}
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-700/50 text-white font-bold text-2xl hover:bg-slate-700 active:bg-slate-600 transition-colors flex items-center justify-center select-none"
              >
                +
              </button>
            </div>
          </div>

          {/* 예상 금액 */}
          {qty > 0 && (
            <div className="p-3 md:p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 mb-4 md:mb-6">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-indigo-300">예상 거래 금액</span>
                <span className="text-lg md:text-xl font-black text-indigo-300 font-display">
                  {estimatedInvestment.toLocaleString()}원
                </span>
              </div>
            </div>
          )}

          {/* 거래 처리 중 표시 */}
          {isProcessing && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-amber-300 font-bold text-sm">거래 처리 중...</span>
            </div>
          )}

          {/* 매수/매도 버튼 */}
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <button
              disabled={isTradeDisabled || qty <= 0 || isOverLimit || isProcessing}
              onClick={handleBuy}
              className={`py-3 md:py-4 rounded-lg font-bold text-base md:text-lg transition-all ${
                isTradeDisabled || qty <= 0 || isOverLimit || isProcessing
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'btn-3d bg-gradient-to-r from-rose-500 to-rose-600 text-white'
              }`}
            >
              {isProcessing ? '처리중...' : '매수'}
            </button>
            <button
              disabled={isTradeDisabled || qty <= 0 || (myTeam.portfolio[selectedStock.id] || 0) < qty || isProcessing}
              onClick={handleSell}
              className={`py-3 md:py-4 rounded-lg font-bold text-base md:text-lg transition-all ${
                isTradeDisabled || qty <= 0 || (myTeam.portfolio[selectedStock.id] || 0) < qty || isProcessing
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'btn-3d bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              }`}
            >
              {isProcessing ? '처리중...' : '매도'}
            </button>
          </div>

          {/* 보유 현황 */}
          {(myTeam.portfolio[selectedStock.id] || 0) > 0 && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-lg bg-slate-700/30 text-center">
              <p className="text-xs text-slate-400">현재 보유</p>
              <p className="text-base md:text-lg font-black text-white">
                {(myTeam.portfolio[selectedStock.id] || 0).toLocaleString()}주
                <span className="text-xs md:text-sm text-slate-400 ml-2">
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
                한 종목당 총 자산의 <span className="text-rose-400 font-bold">{(investmentRatio * 100).toFixed(0)}%</span>까지만 투자할 수 있습니다.
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

      {/* 전체 투자현황 테이블 모달 */}
      {showInvestmentTable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-2 overflow-auto">
          <div className="iso-card bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-[95vw] w-full border border-slate-700/50 my-2">
            <div className="p-3 md:p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  📊 전체 투자현황
                </h2>
                <button
                  onClick={() => setShowInvestmentTable(false)}
                  className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* 라운드 탭 */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {Array.from({ length: gameState.currentRound }, (_, i) => i + 1).map(round => {
                  // 해당 라운드 결과가 공개되었는지 확인
                  // 현재 라운드는 revealedResults, 이전 라운드는 항상 공개됨
                  const isRevealed = round < gameState.currentRound || gameState.revealedResults;

                  return (
                    <button
                      key={round}
                      onClick={() => setSelectedTableRound(round)}
                      className={`px-4 py-2 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-1 ${
                        selectedTableRound === round
                          ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                          : 'bg-slate-700/50 text-slate-400 border-2 border-slate-600 hover:text-white hover:border-slate-500'
                      }`}
                    >
                      {round}R
                      {round === gameState.currentRound && ' (현재)'}
                      {isRevealed && round < gameState.currentRound && ' ✓'}
                    </button>
                  );
                })}
              </div>

              {/* 안내 메시지 */}
              {(() => {
                const isCurrentRound = selectedTableRound === gameState.currentRound;
                const isRevealed = !isCurrentRound || gameState.revealedResults;

                return (
                  <div className={`mb-3 p-3 rounded-lg border ${
                    isRevealed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}>
                    <p className={`text-sm font-medium text-center ${isRevealed ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {isRevealed
                        ? '✅ 결과가 공개되어 모든 팀의 투자 현황을 볼 수 있습니다.'
                        : '⏳ 결과 공개 전입니다. 주가 정보와 내 팀 투자만 확인 가능합니다.'}
                    </p>
                  </div>
                );
              })()}

              {/* 색상 범례 */}
              <div className="mb-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
                <p className="text-sm font-black text-white mb-2">색상 안내:</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-500/50 border-2 border-emerald-400"></span>
                    <span className="text-white font-medium">정보 구매 후 투자</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-500/50 border-2 border-amber-400"></span>
                    <span className="text-white font-medium">정보 없이 투자</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-red-500 font-black text-base">▲ 상승</span>
                    <span className="text-blue-600 font-black text-base">▼ 하락</span>
                  </span>
                </div>
              </div>

              {/* 투자 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-base">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-slate-800 px-4 py-3 text-left text-sm font-black text-white uppercase border-b-2 border-slate-500 z-10">
                        종목
                      </th>
                      <th className="bg-slate-800 px-4 py-3 text-right text-sm font-black text-white uppercase border-b-2 border-slate-500">
                        이전가
                      </th>
                      <th className="bg-slate-800 px-4 py-3 text-right text-sm font-black text-white uppercase border-b-2 border-slate-500">
                        현재가
                      </th>
                      <th className="bg-slate-800 px-4 py-3 text-center text-sm font-black text-white uppercase border-b-2 border-slate-500">
                        등락률
                      </th>
                      {/* 내 팀은 항상 표시 */}
                      <th className="bg-indigo-900/50 px-4 py-3 text-center text-sm font-black text-indigo-300 uppercase border-b-2 border-indigo-500/50">
                        {myTeam.teamName} (나)
                      </th>
                      {/* 다른 팀: 결과 공개된 라운드만 표시 */}
                      {(selectedTableRound < gameState.currentRound || gameState.revealedResults) &&
                        gameState.teams
                          .filter(team => team.id !== myTeam.id)
                          .map(team => (
                            <th key={team.id} className="bg-slate-800 px-4 py-3 text-center text-sm font-black text-slate-300 uppercase border-b-2 border-slate-500">
                              {team.teamName}
                            </th>
                          ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gameState.stocks.map((stock, idx) => {
                      const currentPrice = stock.prices[selectedTableRound - 1];
                      const prevPrice = selectedTableRound > 1 ? stock.prices[selectedTableRound - 2] : stock.prices[0];
                      const priceChange = selectedTableRound > 1 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;

                      // 내 팀의 보유 수량
                      let myQty = 0;
                      if (selectedTableRound === gameState.currentRound) {
                        myQty = myTeam.portfolio[stock.id] || 0;
                      } else {
                        myQty = myTeam.transactionHistory?.filter(tx =>
                          tx.round === selectedTableRound && tx.stockId === stock.id && tx.type === 'BUY'
                        ).reduce((sum, tx) => sum + tx.quantity, 0) || 0;
                      }

                      // 내 팀이 이 주식 정보를 가지고 있는지
                      const myTeamHasInfo = myTeam.unlockedCards?.some(cardId => {
                        const card = INFO_CARDS.find(c => c.id === cardId);
                        return card && card.stockId === stock.id;
                      }) || false;

                      const myValue = myQty * currentPrice;
                      let myCellBgClass = '';
                      if (myQty > 0) {
                        myCellBgClass = myTeamHasInfo
                          ? 'bg-emerald-500/30 border-l-4 border-emerald-400'
                          : 'bg-amber-500/30 border-l-4 border-amber-400';
                      }

                      const isRevealed = selectedTableRound < gameState.currentRound || gameState.revealedResults;

                      return (
                        <tr key={stock.id} className={idx % 2 === 0 ? 'bg-slate-700/20' : 'bg-slate-700/10'}>
                          <td className="sticky left-0 bg-slate-800 px-4 py-3 border-b border-slate-600/30 z-10">
                            <div className="flex items-center gap-2">
                              <span className="w-9 h-9 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base">
                                {stock.id}
                              </span>
                              <span className="text-white font-bold text-base">{stock.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border-b border-slate-600/30">
                            <span className="text-white font-semibold text-base">
                              {prevPrice.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right border-b border-slate-600/30">
                            <span className="text-white font-black text-base">
                              {currentPrice.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center border-b border-slate-600/30">
                            {selectedTableRound === 1 ? (
                              <span className="text-slate-500 font-bold text-base">-</span>
                            ) : (
                              <span className={`font-black text-base ${priceChange >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(1)}%
                              </span>
                            )}
                          </td>
                          {/* 내 팀 */}
                          <td className={`px-4 py-3 text-center border-b border-slate-600/30 ${myCellBgClass}`}>
                            {myQty > 0 ? (
                              <div>
                                <span className="text-white font-black text-base">{myQty}주</span>
                                <p className="text-sm text-white font-medium">{(myValue / 10000).toFixed(0)}만</p>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-base font-medium">-</span>
                            )}
                          </td>
                          {/* 다른 팀 (공개된 경우만) */}
                          {isRevealed &&
                            gameState.teams
                              .filter(team => team.id !== myTeam.id)
                              .map(team => {
                                let qty = 0;
                                if (selectedTableRound === gameState.currentRound) {
                                  qty = team.portfolio[stock.id] || 0;
                                } else {
                                  qty = team.transactionHistory?.filter(tx =>
                                    tx.round === selectedTableRound && tx.stockId === stock.id && tx.type === 'BUY'
                                  ).reduce((sum, tx) => sum + tx.quantity, 0) || 0;
                                }

                                const value = qty * currentPrice;

                                const teamHasInfo = team.unlockedCards?.some(cardId => {
                                  const card = INFO_CARDS.find(c => c.id === cardId);
                                  return card && card.stockId === stock.id;
                                }) || false;

                                let cellBgClass = '';
                                if (qty > 0) {
                                  cellBgClass = teamHasInfo
                                    ? 'bg-emerald-500/30 border-l-4 border-emerald-400'
                                    : 'bg-amber-500/30 border-l-4 border-amber-400';
                                }

                                return (
                                  <td key={team.id} className={`px-4 py-3 text-center border-b border-slate-600/30 ${cellBgClass}`}>
                                    {qty > 0 ? (
                                      <div>
                                        <span className="text-white font-black text-base">{qty}주</span>
                                        <p className="text-sm text-white font-medium">{(value / 10000).toFixed(0)}만</p>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500 text-base font-medium">-</span>
                                    )}
                                  </td>
                                );
                              })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setShowInvestmentTable(false)}
                className="btn-3d w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-base"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentModule;
