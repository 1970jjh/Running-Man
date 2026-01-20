
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove,
  update,
  Database,
  DatabaseReference
} from 'firebase/database';
import { Room, GameState, GameStatus, GameStep, Team } from './types';
import { STOCK_DATA, INITIAL_SEED_MONEY } from './constants';

// Firebase 설정 - 사용자가 직접 입력해야 함
// Firebase Console에서 프로젝트 생성 후 아래 값들을 채워주세요
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Firebase 초기화
let app: FirebaseApp;
let database: Database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.error('Firebase 초기화 오류:', error);
}

// 기본 GameState 생성
export const createDefaultGameState = (roomName: string, totalTeams: number, maxRounds: number): GameState => {
  const teams: Team[] = [];
  for (let i = 1; i <= totalTeams; i++) {
    teams.push({
      id: `team-${i}`,
      number: i,
      leaderName: '',
      members: [],
      currentCash: INITIAL_SEED_MONEY,
      portfolio: {},
      unlockedCards: [],
      grantedInfoCount: 0,
      purchasedInfoCountPerRound: {},
      roundResults: []
    });
  }

  return {
    roomName,
    totalTeams,
    maxRounds,
    currentRound: 1,
    currentStatus: GameStatus.READY,
    currentStep: GameStep.WAITING,
    completedSteps: [],
    timerSeconds: 300,
    timerMaxSeconds: 300,
    isTimerRunning: false,
    isInvestmentLocked: true,
    teams,
    stocks: STOCK_DATA,
    revealedResults: false
  };
};

// 방 생성
export const createRoom = async (
  name: string,
  adminPassword: string,
  totalTeams: number,
  maxRounds: number
): Promise<Room> => {
  const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const gameState = createDefaultGameState(name, totalTeams, maxRounds);

  const room: Room = {
    id: roomId,
    name,
    createdAt: Date.now(),
    adminPassword,
    totalTeams,
    maxRounds,
    gameState,
    isActive: true
  };

  const roomRef = ref(database, `rooms/${roomId}`);
  await set(roomRef, room);

  return room;
};

// 모든 활성 방 목록 가져오기
export const getRooms = async (): Promise<Room[]> => {
  const roomsRef = ref(database, 'rooms');
  const snapshot = await get(roomsRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    const rooms: Room[] = Object.values(data);
    return rooms.filter(room => room.isActive);
  }

  return [];
};

// 특정 방 가져오기
export const getRoom = async (roomId: string): Promise<Room | null> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (snapshot.exists()) {
    return snapshot.val() as Room;
  }

  return null;
};

// 방 실시간 구독
export const subscribeToRoom = (
  roomId: string,
  callback: (room: Room | null) => void
): (() => void) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Room);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

// 모든 방 실시간 구독
export const subscribeToRooms = (
  callback: (rooms: Room[]) => void
): (() => void) => {
  const roomsRef = ref(database, 'rooms');
  const unsubscribe = onValue(roomsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const rooms: Room[] = Object.values(data);
      callback(rooms.filter(room => room.isActive));
    } else {
      callback([]);
    }
  });

  return unsubscribe;
};

// 방 GameState 업데이트
export const updateRoomGameState = async (
  roomId: string,
  gameState: GameState
): Promise<void> => {
  const gameStateRef = ref(database, `rooms/${roomId}/gameState`);
  await set(gameStateRef, gameState);
};

// 방 삭제 (비활성화)
export const deleteRoom = async (roomId: string): Promise<void> => {
  const roomRef = ref(database, `rooms/${roomId}/isActive`);
  await set(roomRef, false);
};

// 방 완전 삭제
export const permanentlyDeleteRoom = async (roomId: string): Promise<void> => {
  const roomRef = ref(database, `rooms/${roomId}`);
  await remove(roomRef);
};

// 팀 참가 (이름 등록)
export const joinTeam = async (
  roomId: string,
  teamNumber: number,
  memberName: string
): Promise<boolean> => {
  try {
    const room = await getRoom(roomId);
    if (!room) return false;

    const teamIndex = room.gameState.teams.findIndex(t => t.number === teamNumber);
    if (teamIndex === -1) return false;

    const team = room.gameState.teams[teamIndex];

    // 리더가 없으면 리더로 설정
    if (!team.leaderName) {
      team.leaderName = memberName;
    }

    // 멤버 목록에 추가
    if (!team.members.includes(memberName)) {
      team.members.push(memberName);
    }

    room.gameState.teams[teamIndex] = team;
    await updateRoomGameState(roomId, room.gameState);

    return true;
  } catch (error) {
    console.error('팀 참가 오류:', error);
    return false;
  }
};

// 관리자 비밀번호 확인
export const verifyAdminPassword = async (
  roomId: string,
  password: string
): Promise<boolean> => {
  const room = await getRoom(roomId);
  if (!room) return false;
  return room.adminPassword === password;
};

export { database, ref, onValue, set, get, update };
