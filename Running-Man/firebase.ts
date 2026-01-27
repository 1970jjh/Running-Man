
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

// Firebase 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Firebase 초기화 상태
let app: FirebaseApp | null = null;
let database: Database | null = null;
let initError: string | null = null;

// Firebase 설정 검증
const isConfigValid = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.databaseURL !== "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
  );
};

// Firebase 초기화
try {
  if (isConfigValid()) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log('✅ Firebase 연결 성공');
  } else {
    initError = 'Firebase 설정이 올바르지 않습니다. 환경변수를 확인해주세요.';
    console.error('❌ Firebase 설정 오류:', initError);
  }
} catch (error) {
  initError = `Firebase 초기화 실패: ${error}`;
  console.error('❌ Firebase 초기화 오류:', error);
}

// Firebase 연결 상태 확인
export const isFirebaseReady = (): boolean => {
  return database !== null;
};

// Firebase 에러 메시지 가져오기
export const getFirebaseError = (): string | null => {
  return initError;
};

// ========== 데이터 정규화 함수들 ==========
// Firebase는 배열을 객체로 저장하므로, 읽을 때 다시 배열로 변환해야 함

// 객체를 배열로 변환 (Firebase가 배열을 객체로 저장하는 문제 해결)
const toArray = <T>(data: T[] | Record<string, T> | undefined | null): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Object.values(data);
};

// GameState 정규화
const normalizeGameState = (gameState: any): GameState => {
  if (!gameState) {
    throw new Error('gameState가 없습니다');
  }

  return {
    ...gameState,
    teams: toArray(gameState.teams).map((team: any) => ({
      ...team,
      members: toArray(team.members),
      unlockedCards: toArray(team.unlockedCards),
      roundResults: toArray(team.roundResults),
      portfolio: team.portfolio || {},
      purchasedInfoCountPerRound: team.purchasedInfoCountPerRound || {}
    })),
    stocks: toArray(gameState.stocks).map((stock: any) => ({
      ...stock,
      prices: toArray(stock.prices)
    })),
    completedSteps: toArray(gameState.completedSteps)
  };
};

// Room 정규화
const normalizeRoom = (room: any): Room => {
  if (!room) {
    throw new Error('room이 없습니다');
  }

  return {
    ...room,
    gameState: normalizeGameState(room.gameState)
  };
};

// ========== 기본 GameState 생성 ==========
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
      transactionHistory: [], // 거래 내역 초기화
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
    isInvestmentConfirmed: false,
    teams,
    stocks: STOCK_DATA,
    revealedResults: false
  };
};

// ========== 방 생성 ==========
export const createRoom = async (
  name: string,
  adminPassword: string,
  totalTeams: number,
  maxRounds: number
): Promise<Room> => {
  if (!database) {
    throw new Error('Firebase가 초기화되지 않았습니다. 환경변수를 확인해주세요.');
  }

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

// ========== 모든 활성 방 목록 가져오기 ==========
export const getRooms = async (): Promise<Room[]> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return [];
  }

  try {
    const roomsRef = ref(database, 'rooms');
    const snapshot = await get(roomsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const rooms: Room[] = Object.values(data).map((room: any) => normalizeRoom(room));
      return rooms.filter(room => room.isActive);
    }
  } catch (error) {
    console.error('방 목록 조회 오류:', error);
  }

  return [];
};

// ========== 특정 방 가져오기 ==========
export const getRoom = async (roomId: string): Promise<Room | null> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return null;
  }

  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const room = normalizeRoom(snapshot.val());
      console.log('✅ 방 조회 성공:', roomId);
      return room;
    } else {
      console.error('방이 존재하지 않습니다:', roomId);
    }
  } catch (error) {
    console.error('방 조회 오류:', error);
  }

  return null;
};

// ========== 방 실시간 구독 ==========
export const subscribeToRoom = (
  roomId: string,
  callback: (room: Room | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    if (onError) {
      onError(new Error('Firebase가 초기화되지 않았습니다.'));
    }
    return () => {};
  }

  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          try {
            const room = normalizeRoom(snapshot.val());
            callback(room);
          } catch (err) {
            console.error('방 데이터 정규화 오류:', err);
            if (onError) {
              onError(err as Error);
            }
          }
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('방 구독 오류:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('방 구독 설정 오류:', error);
    if (onError) {
      onError(error as Error);
    }
    return () => {};
  }
};

// ========== 모든 방 실시간 구독 ==========
export const subscribeToRooms = (
  callback: (rooms: Room[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    if (onError) {
      onError(new Error('Firebase가 초기화되지 않았습니다.'));
    }
    callback([]);
    return () => {};
  }

  try {
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(
      roomsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          try {
            const data = snapshot.val();
            const rooms: Room[] = Object.values(data).map((room: any) => normalizeRoom(room));
            callback(rooms.filter(room => room.isActive));
          } catch (err) {
            console.error('방 목록 정규화 오류:', err);
            callback([]);
          }
        } else {
          callback([]);
        }
      },
      (error) => {
        console.error('방 목록 구독 오류:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('방 목록 구독 설정 오류:', error);
    if (onError) {
      onError(error as Error);
    }
    return () => {};
  }
};

// ========== 방 GameState 업데이트 ==========
export const updateRoomGameState = async (
  roomId: string,
  gameState: GameState
): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    const gameStateRef = ref(database, `rooms/${roomId}/gameState`);
    await set(gameStateRef, gameState);
    return true;
  } catch (error) {
    console.error('게임 상태 업데이트 오류:', error);
    return false;
  }
};

// ========== 방 삭제 (비활성화) ==========
export const deleteRoom = async (roomId: string): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    const roomRef = ref(database, `rooms/${roomId}/isActive`);
    await set(roomRef, false);
    return true;
  } catch (error) {
    console.error('방 삭제 오류:', error);
    return false;
  }
};

// ========== 방 완전 삭제 ==========
export const permanentlyDeleteRoom = async (roomId: string): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    await remove(roomRef);
    return true;
  } catch (error) {
    console.error('방 완전 삭제 오류:', error);
    return false;
  }
};

// ========== 팀 참가 (이름 등록) ==========
export const joinTeam = async (
  roomId: string,
  teamNumber: number,
  memberName: string
): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    const room = await getRoom(roomId);
    if (!room) {
      console.error('방을 찾을 수 없습니다:', roomId);
      return false;
    }

    // teams 배열에서 해당 팀 찾기
    const teams = room.gameState.teams;
    console.log('팀 목록:', teams.map(t => ({ id: t.id, number: t.number })));

    const teamIndex = teams.findIndex(t => t.number === teamNumber);
    console.log(`팀 ${teamNumber} 찾기 결과: index=${teamIndex}`);

    if (teamIndex === -1) {
      console.error('팀을 찾을 수 없습니다:', teamNumber);
      return false;
    }

    const team = { ...teams[teamIndex] };

    // 리더가 없으면 리더로 설정
    if (!team.leaderName) {
      team.leaderName = memberName;
    }

    // 멤버 목록에 추가
    const members = [...(team.members || [])];
    if (!members.includes(memberName)) {
      members.push(memberName);
    }
    team.members = members;

    // 팀 배열 업데이트
    const newTeams = [...teams];
    newTeams[teamIndex] = team;

    const newGameState = {
      ...room.gameState,
      teams: newTeams
    };

    const success = await updateRoomGameState(roomId, newGameState);

    if (success) {
      console.log(`✅ ${memberName}님이 Team ${teamNumber}에 입장했습니다.`);
    }

    return success;
  } catch (error) {
    console.error('팀 참가 오류:', error);
    return false;
  }
};

// ========== 팀 나가기 ==========
export const leaveTeam = async (
  roomId: string,
  teamNumber: number
): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    const room = await getRoom(roomId);
    if (!room) {
      console.error('방을 찾을 수 없습니다:', roomId);
      return false;
    }

    // teams 배열에서 해당 팀 찾기
    const teams = room.gameState.teams;
    const teamIndex = teams.findIndex(t => t.number === teamNumber);

    if (teamIndex === -1) {
      console.error('팀을 찾을 수 없습니다:', teamNumber);
      return false;
    }

    // 참고: 실제로 멤버를 제거하지는 않음 (게임 진행 중 데이터 유지)
    // 필요시 여기서 멤버 제거 로직 추가 가능
    console.log(`사용자가 Team ${teamNumber}에서 퇴장했습니다.`);

    return true;
  } catch (error) {
    console.error('팀 나가기 오류:', error);
    return false;
  }
};

// ========== 관리자 비밀번호 확인 ==========
export const verifyAdminPassword = async (
  roomId: string,
  password: string
): Promise<boolean> => {
  const room = await getRoom(roomId);
  if (!room) return false;
  return room.adminPassword === password;
};

export { database, ref, onValue, set, get, update };
