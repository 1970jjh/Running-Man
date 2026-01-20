
import { Stock, InfoCard } from './types';

export const ADMIN_PASSWORD = '6749467';
export const INITIAL_SEED_MONEY = 10000000; // 1000만원
export const MAX_INVESTMENT_RATIO = 0.3; // 한 종목당 30%까지
export const MAX_PURCHASED_INFO_PER_ROUND = 10; // 라운드당 최대 10개 구매

// 라운드별 정보 구매 가격 (만원 단위)
export const getInfoPrice = (round: number): number => {
  return round * 100000; // 1R: 10만원, 2R: 20만원, 3R: 30만원, 4R: 40만원
};

// 주가 데이터 (그림2 기반)
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

// 정보 카드 생성 (0-1 ~ 4-19, 총 76개)
// 카테고리 0~3 각 19개씩 = 76개
export const generateInfoCards = (): InfoCard[] => {
  const cards: InfoCard[] = [];
  for (let category = 0; category <= 3; category++) {
    for (let stockIdx = 1; stockIdx <= 19; stockIdx++) {
      cards.push({
        id: `${category}-${stockIdx}`,
        categoryIndex: category,
        stockIndex: stockIdx,
        stockId: String.fromCharCode(64 + stockIdx), // A=1, B=2, ...
        isRevealed: false
      });
    }
  }
  return cards;
};

export const INFO_CARDS = generateInfoCards();

// 라운드별 상태 배열
export const ROUND_STATUSES = ['ROUND_1', 'ROUND_2', 'ROUND_3', 'ROUND_4'];

// 게임 단계 순서
export const STEP_ORDER = ['MINI_GAME', 'INFO_PURCHASE', 'INFO_NEGOTIATION', 'INVESTMENT', 'RESULT'];

// 단계별 한글 이름
export const STEP_NAMES: { [key: string]: string } = {
  WAITING: '대기중',
  MINI_GAME: '미니게임',
  INFO_PURCHASE: '정보구매',
  INFO_NEGOTIATION: '정보협상',
  INVESTMENT: '투자',
  RESULT: '결과발표'
};
