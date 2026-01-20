
import { GameStatus, Stock } from './types';

export const ADMIN_PASSWORD = '6749467';
export const INITIAL_SEED_MONEY = 10000000;

// 그림2 데이터를 기반으로 한 정확한 주가 정보
export const STOCK_DATA: Stock[] = [
  { id: 'A', name: 'A사', prices: [10000, 30000, 154000, 170000, 120000] },
  { id: 'B', name: 'B사', prices: [7200, 7800, 8500, 6800, 4300] },
  { id: 'C', name: 'C사', prices: [34000, 12000, 6000, 22000, 8000] },
  { id: 'D', name: 'D사', prices: [380000, 340000, 163000, 330000, 480000] },
  { id: 'E', name: 'E사', prices: [80000, 100000, 150000, 70000, 110000] },
  { id: 'F', name: 'F사', prices: [26000, 28000, 19000, 48000, 72000] },
  { id: 'G', name: 'G사', prices: [10000, 5600, 9200, 7800, 4000] },
  { id: 'H', name: 'H사', prices: [10500, 7200, 7000, 7600, 4300] },
  { id: 'I', name: 'I사', prices: [43000, 27000, 28000, 17000, 17000] },
  { id: 'J', name: 'J사', prices: [40000, 60000, 80000, 72000, 74000] },
  { id: 'K', name: 'K사', prices: [694000, 420000, 20000, 6000, 7600] },
  { id: 'L', name: 'L사', prices: [20000, 49000, 35000, 24000, 64000] },
  { id: 'M', name: 'M사', prices: [39000, 80000, 79000, 320000, 560000] },
  { id: 'N', name: 'N사', prices: [4000, 4000, 23000, 16000, 12000] },
  { id: 'O', name: 'O사', prices: [344500, 680000, 620000, 850000, 1100000] },
  { id: 'P', name: 'P사', prices: [35000, 10000, 6000, 330, 1] },
  { id: 'Q', name: 'Q사', prices: [230000, 290000, 270000, 150000, 300000] },
  { id: 'R', name: 'R사', prices: [48000, 24000, 23000, 11000, 15000] },
  { id: 'S', name: 'S사', prices: [220000, 130000, 180000, 290000, 690000] },
];

// 총 76개의 정보 카드 생성 (0-1 ~ 4-19 형식)
export const INFO_CARDS = Array.from({ length: 5 }).flatMap((_, r) => 
  Array.from({ length: 19 }).map((_, s) => ({
    id: `${r}-${s+1}`,
    round: r,
    stockId: String.fromCharCode(65 + s),
    title: `${String.fromCharCode(65 + s)}사 관련 특급 정보`,
    content: `${r}라운드 핵심 지표: 해당 시점의 시장 점유율 및 내부 감사 결과 반영 데이터입니다.`,
    isRevealed: false
  }))
);
