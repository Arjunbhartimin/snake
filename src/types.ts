export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export type GameMode = 'CLASSIC' | 'MODERN' | 'TIME_ATTACK' | 'SURVIVAL';
export type ControlMode = 'SWIPE_AREA' | 'SWIPE_ANYWHERE' | 'DPAD';

export type FoodType = 'NORMAL' | 'GOLDEN' | 'TIMED' | 'SPECIAL';

export interface Food {
  type: FoodType;
  position: Point;
  expiresAt?: number;
}

export type ObstacleType = 'WALL' | 'ROCK' | 'LASER' | 'BARRIER';

export interface Obstacle {
  type: ObstacleType;
  position: Point;
}

export interface Portal {
  entry: Point;
  exit: Point;
  color: string;
}

export interface Theme {
  id: string;
  name: string;
  background: string;
  grid: string;
  snakeHead: string;
  snakeBody: string;
  food: string;
  accent: string;
  text: string;
  glow?: string;
  coinCost?: number;
}

export interface Skin {
  id: string;
  name: string;
  description: string;
  headColor: string;
  bodyColor: string;
  effect?: 'fire' | 'neon' | 'metal' | 'scales' | 'water' | 'glitch' | 'rainbow';
  unlockType: 'score' | 'achievement' | 'challenge' | 'food' | 'survival' | 'default';
  unlockValue: number | string;
  coinCost?: number;
}

export type PowerUpType = 'SPEED_BOOST' | 'SLOW_MOTION' | 'DOUBLE_SCORE' | 'GHOST_MODE';

export interface PowerUp {
  type: PowerUpType;
  position: Point;
  expiresAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'score' | 'survival' | 'food' | 'theme';
  target: number;
  rewardSkinId?: string;
  rewardThemeId?: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  type: 'score' | 'food' | 'survival' | 'powerup';
  rewardSkinId?: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  themeId: string;
  skinId: string;
  controlMode: ControlMode;
  gameMode: GameMode;
  difficulty: number;
}

export interface PlayerProgress {
  playerId: string;
  highScore: number;
  coins: number;
  unlockedSkins: string[];
  unlockedThemes: string[];
  completedAchievements: string[];
  lastChallengeDate: string;
  challengeProgress: number;
  totalFoodEaten: number;
  totalSurvivalTime: number;
}

export interface GameState {
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Food;
  powerUp: PowerUp | null;
  obstacles: Obstacle[];
  portals: Portal[];
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPaused: boolean;
  level: number;
  activePowerUps: Partial<Record<PowerUpType, number>>;
  startTime: number;
  foodEatenInSession: number;
  lastGrowthTime: number;
  combo: number;
  lastEatTime: number;
  lastPauseTime?: number;
  timeLeft?: number;
}
