
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum GameStep {
  WAITING = 'WAITING',
  MINI_GAME = 'MINI_GAME',
  INFO_PURCHASE = 'INFO_PURCHASE',
  INFO_NEGOTIATION = 'INFO_NEGOTIATION',
  INVESTMENT = 'INVESTMENT',
  RESULT = 'RESULT'
}

export enum GameStatus {
  IDLE = 'IDLE',
  READY = 'READY',
  ROUND_1 = 'ROUND_1',
  ROUND_2 = 'ROUND_2',
  ROUND_3 = 'ROUND_3',
  ROUND_4 = 'ROUND_4',
  FINISHED = 'FINISHED'
}

export interface Stock {
  id: string;
  name: string;
  prices: number[]; // Index 0: 초기(2010), 1: R1, 2: R2, 3: R3, 4: R4
}

export interface InfoCard {
  id: string; // "0-1" ~ "4-19" 형식
  categoryIndex: number; // 0~4 (정보 카테고리)
  stockIndex: number; // 1~19 (종목 번호)
  stockId: string; // A~S
  imageUrl: string; // 정보 카드 이미지 URL
  isRevealed: boolean;
}

// 거래 내역 인터페이스
export interface Transaction {
  id: string;
  round: number;
  stockId: string;
  stockName: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  timestamp: number;
  profitLoss?: number; // 매도 시 수익/손실
  profitLossRate?: number; // 매도 시 수익률
}

export interface Team {
  id: string;
  number: number;
  leaderName: string;
  members: string[];
  currentCash: number;
  portfolio: { [stockId: string]: number };
  unlockedCards: string[];
  grantedInfoCount: number;
  purchasedInfoCountPerRound: { [round: string]: number };
  transactionHistory: Transaction[]; // 거래 내역
  roundResults: {
    round: number;
    portfolioValue: number;
    totalValue: number;
    profitRate: number;
    cumulativeProfitRate: number;
  }[];
}

export interface GameState {
  roomName: string;
  totalTeams: number;
  maxRounds: number; // 1~4
  currentRound: number;
  currentStatus: GameStatus;
  currentStep: GameStep;
  completedSteps: GameStep[];
  timerSeconds: number;
  timerMaxSeconds: number;
  isTimerRunning: boolean;
  isInvestmentLocked: boolean;
  isInvestmentConfirmed: boolean; // 투자 확정 여부
  teams: Team[];
  stocks: Stock[];
  revealedResults: boolean;
}

// 방(Room) 인터페이스 - Firebase에 저장
export interface Room {
  id: string;
  name: string;
  createdAt: number;
  adminPassword: string;
  totalTeams: number;
  maxRounds: number;
  gameState: GameState;
  isActive: boolean;
}
