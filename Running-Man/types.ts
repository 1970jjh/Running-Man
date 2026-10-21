
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
  teamName: string; // 관리자가 수정 가능한 팀 이름
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
  timerSeconds: number; // 정지 상태의 남은 시간 (진행 중에는 timerEndAt 기준으로 계산)
  timerMaxSeconds: number;
  isTimerRunning: boolean;
  timerEndAt?: number | null; // 타이머 종료 시각 (서버 시간 ms, 진행 중일 때만 존재)
  isInvestmentLocked: boolean;
  isInvestmentConfirmed: boolean; // 투자 확정 여부
  isPortfolioLocked: boolean; // 포트폴리오 잠금 (투자 확정 ~ 결과 발표 사이)
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

// 방 목록 화면용 요약 정보 (roomIndex에 저장, 전체 gameState를 받지 않기 위함)
export interface RoomListItem {
  id: string;
  name: string;
  createdAt: number;
  totalTeams: number;
  maxRounds: number;
  isActive: boolean;
  gameState: Pick<GameState, 'currentStatus'>;
}
