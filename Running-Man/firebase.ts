
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove,
  update,
  runTransaction,
  Database,
  DatabaseReference
} from 'firebase/database';
import { Room, RoomListItem, GameState, GameStatus, GameStep, Team, Transaction } from './types';
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

// ========== 서버 시간 & 타이머 ==========
// 타이머는 종료 시각(timerEndAt)만 저장하고 각 화면이 남은 시간을 계산함
// (1초마다 Firebase에 쓰지 않음). 기기별 시계 오차는 서버 시간 오프셋으로 보정.
let serverTimeOffset = 0;
if (database) {
  onValue(ref(database, '.info/serverTimeOffset'), (snapshot) => {
    serverTimeOffset = snapshot.val() || 0;
  });
}

export const getServerNow = (): number => Date.now() + serverTimeOffset;

// 현재 표시할 남은 시간(초)
export const getRemainingSeconds = (
  gameState: Pick<GameState, 'timerSeconds' | 'isTimerRunning' | 'timerEndAt'>,
  now: number = getServerNow()
): number => {
  if (gameState.isTimerRunning && gameState.timerEndAt) {
    return Math.max(0, Math.ceil((gameState.timerEndAt - now) / 1000));
  }
  return gameState.timerSeconds;
};

// 타이머 정지 시 저장할 필드 (남은 시간을 고정)
export const pausedTimerFields = (gameState: GameState) => ({
  isTimerRunning: false,
  timerSeconds: getRemainingSeconds(gameState),
  timerEndAt: null
});

// 타이머 시작/재개 시 저장할 필드
export const runningTimerFields = (seconds: number) => ({
  isTimerRunning: true,
  timerSeconds: seconds,
  timerEndAt: seconds > 0 ? getServerNow() + seconds * 1000 : null
});

// 타이머 만료 처리 (시간 종료 시 투자 잠금) - 같은 타이머에 대해 한 번만 적용됨
export const expireTimer = async (roomId: string, timerEndAt: number): Promise<void> => {
  if (!database) return;

  try {
    await runTransaction(ref(database, `rooms/${roomId}/gameState`), (currentData) => {
      if (!currentData) return currentData;
      if (!currentData.isTimerRunning || currentData.timerEndAt !== timerEndAt) return; // 이미 처리됨 → 중단
      return {
        ...currentData,
        timerSeconds: 0,
        timerEndAt: null,
        isTimerRunning: false,
        isInvestmentLocked: true
      };
    });
  } catch (error) {
    console.error('타이머 종료 처리 오류:', error);
  }
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
      teamName: team.teamName || `Team ${team.number}`,
      members: toArray(team.members),
      unlockedCards: toArray(team.unlockedCards),
      roundResults: toArray(team.roundResults),
      portfolio: team.portfolio || {},
      purchasedInfoCountPerRound: team.purchasedInfoCountPerRound || {},
      transactionHistory: toArray(team.transactionHistory)
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

// ========== 방 목록 인덱스 ==========
// 방 목록 화면은 roomIndex/{roomId}의 요약 정보만 구독함
// (rooms 전체를 구독하면 모든 방의 게임 데이터를 변경 때마다 다시 받게 됨)
const toRoomIndexEntry = (room: any, roomId: string) => ({
  id: roomId,
  name: room?.name || '',
  createdAt: room?.createdAt || 0,
  totalTeams: room?.totalTeams || 0,
  maxRounds: room?.maxRounds || 0,
  isActive: !!room?.isActive,
  currentStatus: room?.gameState?.currentStatus || GameStatus.READY
});

const fromRoomIndexEntry = (entry: any): RoomListItem => ({
  id: entry.id,
  name: entry.name,
  createdAt: entry.createdAt,
  totalTeams: entry.totalTeams,
  maxRounds: entry.maxRounds,
  isActive: !!entry.isActive,
  gameState: { currentStatus: entry.currentStatus }
});

const toRoomListItem = (room: Room): RoomListItem => fromRoomIndexEntry(toRoomIndexEntry(room, room.id));

// 인덱스가 없으면 기존 방들로 한 번만 생성. 사용할 수 없으면 false (기존 방식으로 동작)
let roomIndexReady: Promise<boolean> | null = null;
let roomIndexUnavailable = false; // 보안 규칙 등으로 거부되면 이후 인덱스 쓰기를 시도하지 않음
const ensureRoomIndex = (): Promise<boolean> => {
  if (!roomIndexReady) {
    roomIndexReady = (async () => {
      if (!database) return false;
      try {
        const meta = await get(ref(database, 'roomIndexMeta/version'));
        if (meta.exists()) return true;

        const roomsSnapshot = await get(ref(database, 'rooms'));
        const updates: { [path: string]: any } = {};
        if (roomsSnapshot.exists()) {
          Object.entries(roomsSnapshot.val()).forEach(([roomId, room]) => {
            updates[`roomIndex/${roomId}`] = toRoomIndexEntry(room, roomId);
          });
        }
        updates['roomIndexMeta/version'] = 1;
        updates['roomIndexMeta/builtAt'] = Date.now();
        await update(ref(database), updates);
        console.log('✅ 방 목록 인덱스 생성 완료');
        return true;
      } catch (error) {
        console.warn('방 목록 인덱스를 사용할 수 없어 기존 방식으로 동작합니다:', error);
        roomIndexUnavailable = true;
        return false;
      }
    })();
  }
  return roomIndexReady;
};

// 인덱스 갱신 (실패해도 게임 진행에는 영향 없음)
const updateRoomIndex = async (roomId: string, fields: { [key: string]: any } | null): Promise<void> => {
  if (!database || roomIndexUnavailable) return;
  try {
    const indexRef = ref(database, `roomIndex/${roomId}`);
    if (fields === null) {
      await remove(indexRef);
    } else {
      await update(indexRef, fields);
    }
  } catch (error) {
    console.warn('방 목록 인덱스 갱신 실패:', error);
    roomIndexUnavailable = true;
  }
};

// ========== 기본 GameState 생성 ==========
export const createDefaultGameState = (roomName: string, totalTeams: number, maxRounds: number): GameState => {
  const teams: Team[] = [];
  for (let i = 1; i <= totalTeams; i++) {
    teams.push({
      id: `team-${i}`,
      number: i,
      teamName: `Team ${i}`,
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
    isPortfolioLocked: false,
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
  await updateRoomIndex(roomId, toRoomIndexEntry(room, roomId));

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

// ========== 방 존재/활성 여부만 확인 (전체 데이터를 받지 않음) ==========
export const getRoomActiveState = async (roomId: string): Promise<'active' | 'inactive' | 'missing' | 'error'> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return 'error';
  }

  try {
    const snapshot = await get(ref(database, `rooms/${roomId}/isActive`));
    if (!snapshot.exists()) return 'missing';
    return snapshot.val() ? 'active' : 'inactive';
  } catch (error) {
    console.error('방 조회 오류:', error);
    return 'error';
  }
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
// 방 목록 인덱스(요약 정보)를 구독. 인덱스를 쓸 수 없으면 기존 방식(rooms 전체 구독)으로 동작
export const subscribeToRooms = (
  callback: (rooms: RoomListItem[]) => void,
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

  let cancelled = false;
  let unsubscribe: () => void = () => {};

  const useFullRooms = () => {
    if (cancelled) return;
    unsubscribe = subscribeToFullRooms(callback, onError);
  };

  ensureRoomIndex().then((ready) => {
    if (cancelled) return;
    if (!ready) {
      useFullRooms();
      return;
    }

    unsubscribe = onValue(
      ref(database!, 'roomIndex'),
      (snapshot) => {
        const rooms = snapshot.exists()
          ? Object.values(snapshot.val()).map(fromRoomIndexEntry)
          : [];
        callback(rooms.filter(room => room.isActive));
      },
      (error) => {
        console.warn('방 목록 인덱스 구독 실패, 기존 방식으로 전환:', error);
        useFullRooms();
      }
    );
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
};

// 기존 방식: rooms 전체 구독 (인덱스를 사용할 수 없을 때만)
const subscribeToFullRooms = (
  callback: (rooms: RoomListItem[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!database) {
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
            callback(rooms.filter(room => room.isActive).map(toRoomListItem));
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

// ========== 방 GameState 업데이트 (Transaction 기반) ==========
// updater 함수를 받아 Firebase의 최신 데이터를 읽고 변경사항을 적용
// 이렇게 하면 관리자 업데이트가 사용자 거래 데이터를 덮어쓰지 않음
export const updateRoomGameState = async (
  roomId: string,
  updater: (current: GameState) => GameState
): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    const gameStateRef = ref(database, `rooms/${roomId}/gameState`);
    let statusBefore: GameStatus | undefined;
    let statusAfter: GameStatus | undefined;

    const result = await runTransaction(gameStateRef, (currentData) => {
      if (!currentData) return currentData;
      const currentState = normalizeGameState(currentData);
      const nextState = updater(currentState);
      statusBefore = currentState.currentStatus;
      statusAfter = nextState.currentStatus;
      return nextState;
    });

    // 방 상태(대기중/진행중/종료됨)가 바뀌면 방 목록 인덱스에도 반영
    if (result.committed && statusAfter && statusBefore !== statusAfter) {
      await updateRoomIndex(roomId, { currentStatus: statusAfter });
    }

    return true;
  } catch (error) {
    console.error('게임 상태 업데이트 오류:', error);
    return false;
  }
};

// ========== 방 GameState 일부 필드만 업데이트 ==========
// 다른 값에 의존하지 않는 단순 변경(단계 전환, 결과 공개 등)은 바뀐 필드만 저장
// (전체 gameState를 트랜잭션으로 다시 쓰지 않아 팀 거래와 충돌하지 않음)
export const patchRoomGameState = async (
  roomId: string,
  fields: { [path: string]: any }
): Promise<boolean> => {
  if (!database) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return false;
  }

  try {
    // 빈 배열은 Firebase에서 null과 같음 (읽을 때 toArray로 []가 됨)
    const normalizedFields = Object.fromEntries(
      Object.entries(fields).map(([path, value]) => [path, Array.isArray(value) && value.length === 0 ? null : value])
    );
    await update(ref(database, `rooms/${roomId}/gameState`), normalizedFields);
    if (fields.currentStatus) {
      await updateRoomIndex(roomId, { currentStatus: fields.currentStatus });
    }
    return true;
  } catch (error) {
    console.error('게임 상태 업데이트 오류:', error);
    return false;
  }
};

// ========== 팀 정보 구매권 증감 (해당 팀 값만 트랜잭션) ==========
export const adjustGrantedInfoCount = async (
  roomId: string,
  teamIndex: number,
  delta: number
): Promise<boolean> => {
  if (!database) return false;

  try {
    await runTransaction(
      ref(database, `rooms/${roomId}/gameState/teams/${teamIndex}/grantedInfoCount`),
      (current) => Math.max(0, (current || 0) + delta)
    );
    return true;
  } catch (error) {
    console.error('정보 구매권 변경 오류:', error);
    return false;
  }
};

// ========== 정보 열람권 사용 (해당 팀만 트랜잭션) ==========
export const redeemInfoTicket = async (
  roomId: string,
  teamIndex: number,
  cardId: string
): Promise<boolean> => {
  if (!database) return false;

  try {
    const result = await runTransaction(
      ref(database, `rooms/${roomId}/gameState/teams/${teamIndex}`),
      (currentTeam) => {
        if (!currentTeam) return currentTeam;
        if ((currentTeam.grantedInfoCount || 0) <= 0) return; // 열람권 없음 → 중단
        return {
          ...currentTeam,
          grantedInfoCount: currentTeam.grantedInfoCount - 1,
          unlockedCards: [...toArray<string>(currentTeam.unlockedCards), cardId]
        };
      }
    );
    return result.committed;
  } catch (error) {
    console.error('정보 열람권 사용 오류:', error);
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
    await updateRoomIndex(roomId, { isActive: false });
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
    await updateRoomIndex(roomId, null);
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
    // 팀은 생성 순서대로 저장되므로 보통 teams/{팀번호-1}. 번호만 읽어 확인하고, 다르면 전체 조회로 찾음
    let teamIndex = teamNumber - 1;
    const numberSnapshot = await get(ref(database, `rooms/${roomId}/gameState/teams/${teamIndex}/number`));

    if (numberSnapshot.val() !== teamNumber) {
      const room = await getRoom(roomId);
      if (!room) {
        console.error('방을 찾을 수 없습니다:', roomId);
        return false;
      }
      teamIndex = room.gameState.teams.findIndex(t => t.number === teamNumber);
    }
    console.log(`팀 ${teamNumber} 찾기 결과: index=${teamIndex}`);

    if (teamIndex === -1) {
      console.error('팀을 찾을 수 없습니다:', teamNumber);
      return false;
    }

    // 해당 팀만 트랜잭션으로 갱신 (여러 명이 동시에 입장해도 서로 덮어쓰지 않음)
    const result = await runTransaction(
      ref(database, `rooms/${roomId}/gameState/teams/${teamIndex}`),
      (currentTeam) => {
        if (!currentTeam) return currentTeam;
        const members = toArray<string>(currentTeam.members);
        return {
          ...currentTeam,
          // 리더가 없으면 리더로 설정
          leaderName: currentTeam.leaderName || memberName,
          // 멤버 목록에 추가
          members: members.includes(memberName) ? members : [...members, memberName]
        };
      }
    );

    const success = result.committed && result.snapshot.exists();
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
    // 참고: 실제로 멤버를 제거하지는 않음 (게임 진행 중 데이터 유지)
    // 그래서 방 데이터를 다시 읽지 않음
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

// ========== 팀 거래 (Transaction 기반 원자적 업데이트) ==========
export interface TradeRequest {
  roomId: string;
  teamIndex: number; // teams 배열에서의 인덱스
  type: 'BUY' | 'SELL';
  stockId: string;
  stockName: string;
  quantity: number;
  pricePerShare: number;
  round: number;
  maxInvestablePerStock: number;
}

export interface TradeResult {
  success: boolean;
  error?: string;
}

export const executeTeamTrade = async (trade: TradeRequest): Promise<TradeResult> => {
  if (!database) {
    return { success: false, error: 'Firebase가 초기화되지 않았습니다.' };
  }

  const teamRef = ref(database, `rooms/${trade.roomId}/gameState/teams/${trade.teamIndex}`);

  try {
    let tradeError: string | null = null;

    await runTransaction(teamRef, (currentTeam) => {
      if (!currentTeam) return currentTeam;

      const totalCost = trade.quantity * trade.pricePerShare;

      if (trade.type === 'BUY') {
        // 현금 확인
        if (totalCost > currentTeam.currentCash) {
          tradeError = '현금이 부족합니다.';
          return; // abort transaction
        }

        // 라운드별 한도 확인
        const currentQty = (currentTeam.portfolio && currentTeam.portfolio[trade.stockId]) || 0;
        const currentInvested = currentQty * trade.pricePerShare;
        if (currentInvested + totalCost > trade.maxInvestablePerStock) {
          tradeError = '투자 한도를 초과합니다.';
          return; // abort transaction
        }

        // 매수 적용
        const newPortfolio = { ...(currentTeam.portfolio || {}) };
        newPortfolio[trade.stockId] = (newPortfolio[trade.stockId] || 0) + trade.quantity;

        const newTransaction: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          round: trade.round,
          stockId: trade.stockId,
          stockName: trade.stockName,
          type: 'BUY',
          quantity: trade.quantity,
          pricePerShare: trade.pricePerShare,
          totalAmount: totalCost,
          timestamp: Date.now()
        };

        const history = Array.isArray(currentTeam.transactionHistory)
          ? [...currentTeam.transactionHistory]
          : currentTeam.transactionHistory
            ? Object.values(currentTeam.transactionHistory)
            : [];

        return {
          ...currentTeam,
          currentCash: currentTeam.currentCash - totalCost,
          portfolio: newPortfolio,
          transactionHistory: [...history, newTransaction]
        };
      } else {
        // 매도
        const currentQty = (currentTeam.portfolio && currentTeam.portfolio[trade.stockId]) || 0;
        if (trade.quantity > currentQty) {
          tradeError = '보유 수량이 부족합니다.';
          return; // abort transaction
        }

        // 수익률 = 매도가 기준 (같은 라운드 내 매수/매도는 동일 가격이므로 수익 0)
        const totalSellAmount = trade.quantity * trade.pricePerShare;
        const costBasis = trade.quantity * trade.pricePerShare; // 같은 라운드 동일 가격
        const profitLoss = totalSellAmount - costBasis;
        const profitLossRate = 0; // 같은 라운드 내 매도 시 변동률 없음

        const newPortfolio = { ...(currentTeam.portfolio || {}) };
        newPortfolio[trade.stockId] = currentQty - trade.quantity;

        const newTransaction: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          round: trade.round,
          stockId: trade.stockId,
          stockName: trade.stockName,
          type: 'SELL',
          quantity: trade.quantity,
          pricePerShare: trade.pricePerShare,
          totalAmount: totalSellAmount,
          timestamp: Date.now(),
          profitLoss,
          profitLossRate
        };

        const history = Array.isArray(currentTeam.transactionHistory)
          ? [...currentTeam.transactionHistory]
          : currentTeam.transactionHistory
            ? Object.values(currentTeam.transactionHistory)
            : [];

        return {
          ...currentTeam,
          currentCash: currentTeam.currentCash + totalSellAmount,
          portfolio: newPortfolio,
          transactionHistory: [...history, newTransaction]
        };
      }
    });

    if (tradeError) {
      return { success: false, error: tradeError };
    }

    return { success: true };
  } catch (error: any) {
    console.error('거래 트랜잭션 오류:', error);
    return { success: false, error: error?.message || '거래 처리 중 오류가 발생했습니다.' };
  }
};

export { database, ref, onValue, set, get, update };
