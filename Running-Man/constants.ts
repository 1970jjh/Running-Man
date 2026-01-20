
import { Stock, InfoCard } from './types';

export const ADMIN_PASSWORD = '6749467';
export const INITIAL_SEED_MONEY = 10000000; // 1000만원
export const MAX_INVESTMENT_RATIO = 0.3; // 한 종목당 30%까지
export const MAX_PURCHASED_INFO_PER_ROUND = 10; // 라운드당 최대 10개 구매

// 메인 배경 이미지 URL
export const BACKGROUND_IMAGE_URL = 'https://ibb.co/XfRzKXD8';

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

// 정보 카드 이미지 URL 매핑 (0-1 ~ 4-19, 총 95개)
export const INFO_CARD_IMAGES: { [key: string]: string } = {
  // Category 0 (0-1 ~ 0-19)
  '0-1': 'https://ibb.co/fYhvNcFq',
  '0-2': 'https://ibb.co/0pyXgR8n',
  '0-3': 'https://ibb.co/bRRQTLL9',
  '0-4': 'https://ibb.co/5Xd5Gbvk',
  '0-5': 'https://ibb.co/qLrfZD2N',
  '0-6': 'https://ibb.co/jv8gqgDG',
  '0-7': 'https://ibb.co/ymLHXFXy',
  '0-8': 'https://ibb.co/Yr3pX4t',
  '0-9': 'https://ibb.co/84gXDsKD',
  '0-10': 'https://ibb.co/4ZH9d0jJ',
  '0-11': 'https://ibb.co/Ps2dMs2t',
  '0-12': 'https://ibb.co/zhcfr8CF',
  '0-13': 'https://ibb.co/XkWbr5Yh',
  '0-14': 'https://ibb.co/GvXpqb7R',
  '0-15': 'https://ibb.co/prPQWxqm',
  '0-16': 'https://ibb.co/b5TjtQKk',
  '0-17': 'https://ibb.co/kg4n02Fc',
  '0-18': 'https://ibb.co/fzwxcQSK',
  '0-19': 'https://ibb.co/qL0FX8q4',
  // Category 1 (1-1 ~ 1-19)
  '1-1': 'https://ibb.co/jdy7H5p',
  '1-2': 'https://ibb.co/PZzWs8w8',
  '1-3': 'https://ibb.co/v4XTvJB5',
  '1-4': 'https://ibb.co/35xtRgT9',
  '1-5': 'https://ibb.co/5hHCmjsS',
  '1-6': 'https://ibb.co/276CSjq9',
  '1-7': 'https://ibb.co/hFN33S2c',
  '1-8': 'https://ibb.co/5W6ZgX25',
  '1-9': 'https://ibb.co/j9mq5Sc7',
  '1-10': 'https://ibb.co/dwkhjw2m',
  '1-11': 'https://ibb.co/dJxSy6s2',
  '1-12': 'https://ibb.co/RpffB7J9',
  '1-13': 'https://ibb.co/xtb5Tgpp',
  '1-14': 'https://ibb.co/TMXtjPrH',
  '1-15': 'https://ibb.co/x8jFZCYK',
  '1-16': 'https://ibb.co/Z6f7qjcp',
  '1-17': 'https://ibb.co/qM4yLC36',
  '1-18': 'https://ibb.co/13WHtND',
  '1-19': 'https://ibb.co/GvVYyZ0h',
  // Category 2 (2-1 ~ 2-19)
  '2-1': 'https://ibb.co/RGcJvchy',
  '2-2': 'https://ibb.co/MkmFqvrd',
  '2-3': 'https://ibb.co/FbhLtjdR',
  '2-4': 'https://ibb.co/FLKsKknP',
  '2-5': 'https://ibb.co/n2pbcWm',
  '2-6': 'https://ibb.co/DP3NKR5K',
  '2-7': 'https://ibb.co/WpKGRz9H',
  '2-8': 'https://ibb.co/cSQXhFmN',
  '2-9': 'https://ibb.co/21JSGpZW',
  '2-10': 'https://ibb.co/cSVw9L8s',
  '2-11': 'https://ibb.co/ddcWkbm',
  '2-12': 'https://ibb.co/mr9V9B05',
  '2-13': 'https://ibb.co/Hp3Lcd9r',
  '2-14': 'https://ibb.co/ZRBxbNWv',
  '2-15': 'https://ibb.co/cKG0d636',
  '2-16': 'https://ibb.co/s9Jz97Q8',
  '2-17': 'https://ibb.co/bgz6W1pP',
  '2-18': 'https://ibb.co/jkt9rB6X',
  '2-19': 'https://ibb.co/nsQpyD4K',
  // Category 3 (3-1 ~ 3-19)
  '3-1': 'https://ibb.co/r2CCnbBT',
  '3-2': 'https://ibb.co/d08pRTyQ',
  '3-3': 'https://ibb.co/0RmCb3td',
  '3-4': 'https://ibb.co/spjnjHjk',
  '3-5': 'https://ibb.co/CpcDH7pG',
  '3-6': 'https://ibb.co/Gv39X7bd',
  '3-7': 'https://ibb.co/ZR3NtXS0',
  '3-8': 'https://ibb.co/RTzksND0',
  '3-9': 'https://ibb.co/d0Dgz7Gk',
  '3-10': 'https://ibb.co/sdxSSsFQ',
  '3-11': 'https://ibb.co/nsYZHFg9',
  '3-12': 'https://ibb.co/Z6Pd9hj3',
  '3-13': 'https://ibb.co/60gSjHn2',
  '3-14': 'https://ibb.co/mFJhHKkX',
  '3-15': 'https://ibb.co/svkjCGPL',
  '3-16': 'https://ibb.co/cSpcfnf6',
  '3-17': 'https://ibb.co/4RBB65TC',
  '3-18': 'https://ibb.co/4cx59XY',
  '3-19': 'https://ibb.co/gb54zmWD',
  // Category 4 (4-1 ~ 4-19)
  '4-1': 'https://ibb.co/zH7BT83f',
  '4-2': 'https://ibb.co/x8zmcrFv',
  '4-3': 'https://ibb.co/Rk9w4RLs',
  '4-4': 'https://ibb.co/PGXR6ks6',
  '4-5': 'https://ibb.co/1GwMRh3X',
  '4-6': 'https://ibb.co/8D5v6xVH',
  '4-7': 'https://ibb.co/bMFSxHtF',
  '4-8': 'https://ibb.co/gFRF41sc',
  '4-9': 'https://ibb.co/ds50xsb9',
  '4-10': 'https://ibb.co/Q7pFtCqP',
  '4-11': 'https://ibb.co/9kkCV2Hg',
  '4-12': 'https://ibb.co/C5wrrvQH',
  '4-13': 'https://ibb.co/Sw5Hs705',
  '4-14': 'https://ibb.co/LdCbCj4c',
  '4-15': 'https://ibb.co/TqYq4T1S',
  '4-16': 'https://ibb.co/wr88VBbM',
  '4-17': 'https://ibb.co/YTQsBQ1T',
  '4-18': 'https://ibb.co/T3T0PXq',
  '4-19': 'https://ibb.co/8LtcCNZD',
};

// 정보 카드 생성 (0-1 ~ 4-19, 총 95개)
export const generateInfoCards = (): InfoCard[] => {
  const cards: InfoCard[] = [];
  for (let category = 0; category <= 4; category++) {
    for (let stockIdx = 1; stockIdx <= 19; stockIdx++) {
      const id = `${category}-${stockIdx}`;
      cards.push({
        id,
        categoryIndex: category,
        stockIndex: stockIdx,
        stockId: String.fromCharCode(64 + stockIdx), // A=1, B=2, ...
        imageUrl: INFO_CARD_IMAGES[id] || '',
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
