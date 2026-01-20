
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum GameStep {
  MINI_GAME = 'MINI_GAME',
  INFO_PURCHASE = 'INFO_PURCHASE',
  INFO_NEGOTIATION = 'INFO_NEGOTIATION',
  INVESTMENT = 'INVESTMENT',
  RESULT = 'RESULT'
}

export enum GameStatus {
  IDLE = 'IDLE',
  SETUP = 'SETUP',
  ROUND_1 = 'ROUND_1',
  ROUND_2 = 'ROUND_2',
  ROUND_3 = 'ROUND_3',
  ROUND_4 = 'ROUND_4',
  FINISHED = 'FINISHED'
}

export interface Stock {
  id: string; // A to S
  name: string;
  prices: number[]; // Index 0: 2010, 1: R1, 2: R2, 3: R3, 4: R4
}

export interface InfoCard {
  id: string; // e.g., "1-A" (Round 1, Stock A)
  round: number;
  stockId: string;
  title: string;
  content: string;
  isRevealed: boolean;
}

export interface Team {
  id: string;
  number: number;
  leaderName: string;
  currentCash: number;
  portfolio: { [stockId: string]: number };
  unlockedCards: string[]; // Card IDs
  grantedInfoCount: number; // Admin granted counts
  purchasedInfoCount: number; // Team bought counts (max 10 per round)
  roundResults: {
    totalValue: number;
    profitRate: number;
    cumulativeProfitRate: number;
  }[];
}

export interface GameState {
  roomName: string;
  totalTeams: number;
  currentStatus: GameStatus;
  currentStep: GameStep;
  timerSeconds: number;
  isTimerRunning: boolean;
  teams: Team[];
  stocks: Stock[];
}
