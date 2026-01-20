
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
  isRevealed: boolean;
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
  teams: Team[];
  stocks: Stock[];
  revealedResults: boolean;
}
