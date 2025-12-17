export type GameMode = 'CLASSIC' | 'PARTY' | 'TIMED' | 'CUSTOM';

export type PlayerStatus = 'ALIVE' | 'ELIMINATED' | 'WINNER';

export type ConnectionType = 'LOCAL' | 'ONLINE';

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  avatar: string;
  isHost?: boolean; // For online logic
}

export interface CardOption {
  id: string;
  text: string;
  isNuke: boolean;
  isRevealed: boolean;
  placedBy?: string; // Name of player or 'AI' who placed this trap
}

export interface RoundData {
  category: string;
  options: CardOption[];
}

export interface GameState {
  status: 'LOBBY' | 'MANUAL_ENTRY' | 'LOADING_ROUND' | 'SETUP_TRAPS' | 'PLAYING' | 'GAME_OVER';
  mode: GameMode;
  connection: ConnectionType;
  players: Player[];
  currentPlayerIndex: number;
  currentRound: number;
  deck: CardOption[];
  category: string;
  gameMasterLog: string;
  timeLeft: number; // For Timed mode
}

export const AVATARS = [
  '💀', '🤖', '👽', '🤡', '👹', '🤠', '👻', '🎃', 
  '👾', '👿', '🦄', '🐲', '🐹', '🐱', '🐼', '🦊',
  '🦁', '🐯', '🐙', '🦖', '🧛', '🧟', '🕵️', '🥷'
];