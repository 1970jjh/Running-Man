
import { Stock, InfoCard } from './types';

export const ADMIN_PASSWORD = '6749467';
export const INITIAL_SEED_MONEY = 10000000; // 1000만원
export const MAX_INVESTMENT_RATIO = 0.3; // 한 종목당 30%까지
export const MAX_PURCHASED_INFO_PER_ROUND = 10; // 라운드당 최대 10개 구매

// 메인 배경 이미지 URL (직접 이미지 링크)
export const BACKGROUND_IMAGE_URL = 'https://i.ibb.co/nqJDYrBC/1.jpg';

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

// 정보 카드 이미지 URL 매핑 (직접 이미지 링크 - i.ibb.co)
// 카드 ID 형식: "{카테고리}-{종목번호}" (예: "0-1" = 카테고리 0, A사)
export const INFO_CARD_IMAGES: { [key: string]: string } = {
  // 카테고리 0 (0-1 ~ 0-19, A~S사)
  '0-1': 'https://i.ibb.co/jkYnnS3z/0-A.jpg',   // 0-A
  '0-2': 'https://i.ibb.co/8D0kLnXj/0-B.jpg',   // 0-B
  '0-3': 'https://i.ibb.co/TD6JTsVz/0-C.jpg',   // 0-C
  '0-4': 'https://i.ibb.co/mVhxbVqN/0-D.jpg',   // 0-D
  '0-5': 'https://i.ibb.co/x8dyQGKj/0-E.jpg',   // 0-E
  '0-6': 'https://i.ibb.co/C5ggMWSz/0-F.jpg',   // 0-F
  '0-7': 'https://i.ibb.co/67SsCt33/0-G.jpg',   // 0-G
  '0-8': 'https://i.ibb.co/whH4GpYK/0-H.jpg',   // 0-H
  '0-9': 'https://i.ibb.co/wrWct07Z/0-I.jpg',   // 0-I
  '0-10': 'https://i.ibb.co/rGQNDj5R/0-J.jpg',  // 0-J
  '0-11': 'https://i.ibb.co/JRbBWqwZ/0-K.jpg',  // 0-K
  '0-12': 'https://i.ibb.co/shYLd40/0-L.jpg',   // 0-L
  '0-13': 'https://i.ibb.co/XZz01nbw/0-M.jpg',  // 0-M
  '0-14': 'https://i.ibb.co/20dpnd8N/0-N.jpg',  // 0-N
  '0-15': 'https://i.ibb.co/hFS3p6b0/0-O.jpg',  // 0-O
  '0-16': 'https://i.ibb.co/VWLc8Pkf/0-P.jpg',  // 0-P
  '0-17': 'https://i.ibb.co/rRmbmKvW/0-Q.jpg',  // 0-Q
  '0-18': 'https://i.ibb.co/rP9m6W0/0-R.jpg',   // 0-R
  '0-19': 'https://i.ibb.co/KcCYyrFy/0-S.jpg',  // 0-S
  // 카테고리 1 (1-1 ~ 1-19, A~S사)
  '1-1': 'https://i.ibb.co/rfyFXpPQ/1-A.jpg',   // 1-A
  '1-2': 'https://i.ibb.co/gLJFZTnD/1-B.jpg',   // 1-B
  '1-3': 'https://i.ibb.co/C3L6RSPm/1-C.jpg',   // 1-C
  '1-4': 'https://i.ibb.co/5gwk3FjJ/1-D.jpg',   // 1-D
  '1-5': 'https://i.ibb.co/DxbVwGr/1-E.jpg',    // 1-E
  '1-6': 'https://i.ibb.co/dsPwPct4/1-F.jpg',   // 1-F
  '1-7': 'https://i.ibb.co/cXVKWLsN/1-G.jpg',   // 1-G
  '1-8': 'https://i.ibb.co/hxBVTCDr/1-H.jpg',   // 1-H
  '1-9': 'https://i.ibb.co/HLW6Qt4t/1-I.jpg',   // 1-I
  '1-10': 'https://i.ibb.co/d4Jx4Z68/1-J.jpg',  // 1-J
  '1-11': 'https://i.ibb.co/hRDg7spy/1-K.jpg',  // 1-K
  '1-12': 'https://i.ibb.co/9HPmrz85/1-L.jpg',  // 1-L
  '1-13': 'https://i.ibb.co/TBPyGHJN/1-M.jpg',  // 1-M
  '1-14': 'https://i.ibb.co/WvbbSDrq/1-N.jpg',  // 1-N
  '1-15': 'https://i.ibb.co/99Q47Djq/1-O.jpg',  // 1-O
  '1-16': 'https://i.ibb.co/tTQqr5XW/1-P.jpg',  // 1-P
  '1-17': 'https://i.ibb.co/Q79L9d9z/1-Q.jpg',  // 1-Q
  '1-18': 'https://i.ibb.co/0p7vGMpb/1-R.jpg',  // 1-R
  '1-19': 'https://i.ibb.co/qMFCzBPD/1-S.jpg',  // 1-S
  // 카테고리 2 (2-1 ~ 2-19, A~S사)
  '2-1': 'https://i.ibb.co/ymDVGPpr/2-A.jpg',   // 2-A
  '2-2': 'https://i.ibb.co/23g1CSkt/2-B.jpg',   // 2-B
  '2-3': 'https://i.ibb.co/pvdy9nJ4/2-C.jpg',   // 2-C
  '2-4': 'https://i.ibb.co/396XXS0W/2-D.jpg',   // 2-D
  '2-5': 'https://i.ibb.co/VWzr7sjR/2-E.jpg',   // 2-E
  '2-6': 'https://i.ibb.co/6RxYQ4M2/2-F.jpg',   // 2-F
  '2-7': 'https://i.ibb.co/Jj5TDvBN/2-G.jpg',   // 2-G
  '2-8': 'https://i.ibb.co/sJjsF4n6/2-H.jpg',   // 2-H
  '2-9': 'https://i.ibb.co/pvG2Q8PC/2-I.jpg',   // 2-I
  '2-10': 'https://i.ibb.co/4nDZvrv8/2-J.jpg',  // 2-J
  '2-11': 'https://i.ibb.co/RTLLxV0t/2-K.jpg',  // 2-K
  '2-12': 'https://i.ibb.co/5dVftSn/2-L.jpg',   // 2-L
  '2-13': 'https://i.ibb.co/mrLN6byH/2-M.jpg',  // 2-M
  '2-14': 'https://i.ibb.co/NnmJd10Y/2-N.jpg',  // 2-N
  '2-15': 'https://i.ibb.co/G3Cs1rHw/2-O.jpg',  // 2-O
  '2-16': 'https://i.ibb.co/YF3sTHv1/2-P.jpg',  // 2-P
  '2-17': 'https://i.ibb.co/yFvDQ2mQ/2-Q.jpg',  // 2-Q
  '2-18': 'https://i.ibb.co/ch7w2MP8/2-R.jpg',  // 2-R
  '2-19': 'https://i.ibb.co/ccFfD8dj/2-S.jpg',  // 2-S
  // 카테고리 3 (3-1 ~ 3-19, A~S사)
  '3-1': 'https://i.ibb.co/fz9hb8J9/3-A.jpg',   // 3-A
  '3-2': 'https://i.ibb.co/R4D4jnLJ/3-B.jpg',   // 3-B
  '3-3': 'https://i.ibb.co/DPRDTPGX/3-C.jpg',   // 3-C
  '3-4': 'https://i.ibb.co/nq6stnV7/3-D.jpg',   // 3-D
  '3-5': 'https://i.ibb.co/dwwzL64M/3-E.jpg',   // 3-E
  '3-6': 'https://i.ibb.co/MDgXXp7C/3-F.jpg',   // 3-F
  '3-7': 'https://i.ibb.co/pjbN0rZb/3-G.jpg',   // 3-G
  '3-8': 'https://i.ibb.co/VYvrvnXz/3-H.jpg',   // 3-H
  '3-9': 'https://i.ibb.co/0VmVCXKS/3-I.jpg',   // 3-I
  '3-10': 'https://i.ibb.co/HpRR6BMn/3-J.jpg',  // 3-J
  '3-11': 'https://i.ibb.co/cX3nh3ZX/3-K.jpg',  // 3-K
  '3-12': 'https://i.ibb.co/rrtp5Pf/3-L.jpg',   // 3-L
  '3-13': 'https://i.ibb.co/xtdHkXTS/3-M.jpg',  // 3-M
  '3-14': 'https://i.ibb.co/N68SN4Ct/3-N.jpg',  // 3-N
  '3-15': 'https://i.ibb.co/LDdPLXb0/3-O.jpg',  // 3-O
  '3-16': 'https://i.ibb.co/tPPQgccr/3-P.jpg',  // 3-P
  '3-17': 'https://i.ibb.co/hxkKL3Hc/3-Q.jpg',  // 3-Q
  '3-18': 'https://i.ibb.co/RGDm5gJ3/3-R.jpg',  // 3-R
  '3-19': 'https://i.ibb.co/Z6fWvWxK/3-S.jpg',  // 3-S
  // 카테고리 4 (4-1 ~ 4-19, A~S사)
  '4-1': 'https://i.ibb.co/twyV4p4s/4-A.jpg',   // 4-A
  '4-2': 'https://i.ibb.co/hqyDcxK/4-B.jpg',    // 4-B
  '4-3': 'https://i.ibb.co/fGdQYF1Y/4-C.jpg',   // 4-C
  '4-4': 'https://i.ibb.co/5WPtFJ52/4-D.jpg',   // 4-D
  '4-5': 'https://i.ibb.co/xKnNYKn3/4-E.jpg',   // 4-E
  '4-6': 'https://i.ibb.co/HDvgVNRC/4-F.jpg',   // 4-F
  '4-7': 'https://i.ibb.co/fGX2zNDh/4-G.jpg',   // 4-G
  '4-8': 'https://i.ibb.co/wNTgfxy4/4-H.jpg',   // 4-H
  '4-9': 'https://i.ibb.co/6JZ8vmQd/4-I.jpg',   // 4-I
  '4-10': 'https://i.ibb.co/0yTp5mGx/4-J.jpg',  // 4-J
  '4-11': 'https://i.ibb.co/ns72fMSk/4-K.jpg',  // 4-K
  '4-12': 'https://i.ibb.co/B5MC1wP7/4-L.jpg',  // 4-L
  '4-13': 'https://i.ibb.co/Y4DTYSnK/4-M.jpg',  // 4-M
  '4-14': 'https://i.ibb.co/7Hn7bz9/4-N.jpg',   // 4-N
  '4-15': 'https://i.ibb.co/ynBkmJWJ/4-O.jpg',  // 4-O
  '4-16': 'https://i.ibb.co/F4HyqBWv/4-P.jpg',  // 4-P
  '4-17': 'https://i.ibb.co/RGXLjRgk/4-Q.jpg',  // 4-Q
  '4-18': 'https://i.ibb.co/HT8R6PGb/4-R.jpg',  // 4-R
  '4-19': 'https://i.ibb.co/XZ4KDzXQ/4-S.jpg',  // 4-S
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
