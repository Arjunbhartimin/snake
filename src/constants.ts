import { Theme, Skin, Achievement, DailyChallenge } from './types';

export const THEMES: Theme[] = [
  {
    id: 'retro',
    name: 'Retro Nokia',
    background: '#8fb31d',
    grid: '#87a91b',
    snakeHead: '#000000',
    snakeBody: '#1a1a1a',
    food: '#000000',
    accent: '#000000',
    text: '#000000',
    coinCost: 0
  },
  {
    id: 'neon',
    name: 'Dark Neon',
    background: '#0a0a0a',
    grid: '#1a1a1a',
    snakeHead: '#00ff88',
    snakeBody: '#00cc66',
    food: '#ff0055',
    accent: '#00ff88',
    text: '#ffffff',
    glow: 'rgba(0, 255, 136, 0.5)',
    coinCost: 0
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#000000',
    grid: '#050505',
    snakeHead: '#ffffff',
    snakeBody: '#333333',
    food: '#ffffff',
    accent: '#ffffff',
    text: '#ffffff',
    coinCost: 0
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    background: '#064e3b',
    grid: '#065f46',
    snakeHead: '#fbbf24',
    snakeBody: '#d97706',
    food: '#ef4444',
    accent: '#fbbf24',
    text: '#ffffff',
    coinCost: 500
  },
  {
    id: 'ocean',
    name: 'Ocean Deep',
    background: '#0c4a6e',
    grid: '#075985',
    snakeHead: '#38bdf8',
    snakeBody: '#0ea5e9',
    food: '#f0f9ff',
    accent: '#38bdf8',
    text: '#ffffff',
    coinCost: 500
  },
  {
    id: 'grid',
    name: 'Blueprint',
    background: '#1e293b',
    grid: '#334155',
    snakeHead: '#60a5fa',
    snakeBody: '#3b82f6',
    food: '#f472b6',
    accent: '#60a5fa',
    text: '#ffffff',
    coinCost: 1000
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    background: '#2b0a3d',
    grid: '#4a154b',
    snakeHead: '#fce205',
    snakeBody: '#ff007f',
    food: '#00ffff',
    accent: '#fce205',
    text: '#ffffff',
    glow: 'rgba(255, 0, 127, 0.5)',
    coinCost: 2000
  }
];

export const SKINS: Skin[] = [
  {
    id: 'classic',
    name: 'Classic Snake',
    description: 'The original pixel look.',
    headColor: '#000',
    bodyColor: '#1a1a1a',
    unlockType: 'default',
    unlockValue: 0,
    coinCost: 0
  },
  {
    id: 'neon-skin',
    name: 'Neon Glow',
    description: 'Cybernetic light trails.',
    headColor: '#00ff88',
    bodyColor: '#00cc66',
    effect: 'neon',
    unlockType: 'score',
    unlockValue: 100,
    coinCost: 200
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'Semi-transparent phantom.',
    headColor: 'rgba(255, 255, 255, 0.8)',
    bodyColor: 'rgba(255, 255, 255, 0.3)',
    effect: 'neon',
    unlockType: 'survival',
    unlockValue: 120,
    coinCost: 300
  },
  {
    id: 'dragon',
    name: 'Dragon',
    description: 'Ancient fire breather.',
    headColor: '#ef4444',
    bodyColor: '#b91c1c',
    effect: 'fire',
    unlockType: 'achievement',
    unlockValue: 'survive_5',
    coinCost: 500
  },
  {
    id: 'metallic',
    name: 'Chrome',
    description: 'Reflective sci-fi surface.',
    headColor: '#94a3b8',
    bodyColor: '#475569',
    effect: 'metal',
    unlockType: 'score',
    unlockValue: 500,
    coinCost: 600
  },
  {
    id: 'jungle',
    name: 'Jungle Viper',
    description: 'Natural scale patterns.',
    headColor: '#166534',
    bodyColor: '#14532d',
    effect: 'scales',
    unlockType: 'food',
    unlockValue: 100,
    coinCost: 400
  },
  {
    id: 'electric',
    name: 'Electric',
    description: 'Lightning effects when moving.',
    headColor: '#fbbf24',
    bodyColor: '#d97706',
    effect: 'neon',
    unlockType: 'challenge',
    unlockValue: 5,
    coinCost: 800
  },
  {
    id: 'electric-snake',
    name: 'Electric Snake',
    description: 'High voltage energy.',
    headColor: '#22c55e',
    bodyColor: '#eab308',
    effect: 'neon',
    unlockType: 'score',
    unlockValue: 750,
    coinCost: 1000
  },
  {
    id: 'jungle-snake',
    name: 'Jungle Snake',
    description: 'Master of the deep brush.',
    headColor: '#14532d',
    bodyColor: '#78350f',
    effect: 'scales',
    unlockType: 'achievement',
    unlockValue: 'score_500',
    coinCost: 1200
  },
  {
    id: 'water-serpent',
    name: 'Water Serpent',
    description: 'Fluid and elusive.',
    headColor: '#0ea5e9',
    bodyColor: '#38bdf8',
    effect: 'water',
    unlockType: 'score',
    unlockValue: 1500,
    coinCost: 1500
  },
  {
    id: 'glitch',
    name: 'Glitch',
    description: 'Reality is breaking.',
    headColor: '#ff00ff',
    bodyColor: '#00ffff',
    effect: 'glitch',
    unlockType: 'achievement',
    unlockValue: 'score_2000',
    coinCost: 2000
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'All the colors.',
    headColor: '#ff0000',
    bodyColor: '#00ff00',
    effect: 'rainbow',
    unlockType: 'food',
    unlockValue: 1000,
    coinCost: 3000
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'score_50', title: 'Beginner', description: 'Score 50 points', category: 'score', target: 50 },
  { id: 'score_100', title: 'Centurion', description: 'Reach a score of 100', category: 'score', target: 100, rewardSkinId: 'neon-skin' },
  { id: 'score_500', title: 'Master', description: 'Reach a score of 500', category: 'score', target: 500, rewardSkinId: 'metallic' },
  { id: 'score_1000', title: 'Legend', description: 'Score 1000 points', category: 'score', target: 1000 },
  { id: 'score_2000', title: 'Godlike', description: 'Score 2000 points', category: 'score', target: 2000, rewardSkinId: 'glitch' },
  
  { id: 'survive_2', title: 'Survivor', description: 'Survive for 2 minutes', category: 'survival', target: 120, rewardSkinId: 'ghost' },
  { id: 'survive_5', title: 'Immortal', description: 'Survive for 5 minutes', category: 'survival', target: 300, rewardSkinId: 'dragon' },
  { id: 'survive_10', title: 'Time Lord', description: 'Survive for 10 minutes', category: 'survival', target: 600 },

  { id: 'food_100', title: 'Hungry', description: 'Eat 100 food items total', category: 'food', target: 100, rewardSkinId: 'jungle' },
  { id: 'food_500', title: 'Glutton', description: 'Eat 500 food items', category: 'food', target: 500 },
  { id: 'food_1000', title: 'Devourer', description: 'Eat 1000 food items', category: 'food', target: 1000, rewardSkinId: 'rainbow' },

  { id: 'unlock_themes_all', title: 'Connoisseur', description: 'Unlock all themes', category: 'theme', target: 7 }
];

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'dc_1', title: 'Speed Runner', description: 'Score 50 points in one session', target: 50, type: 'score' },
  { id: 'dc_2', title: 'Glutton', description: 'Eat 20 food items in one session', target: 20, type: 'food' },
  { id: 'dc_3', title: 'Endurance', description: 'Survive for 2 minutes', target: 120, type: 'survival' },
  { id: 'dc_4', title: 'Power User', description: 'Collect 5 power-ups', target: 5, type: 'powerup' }
];

export const INITIAL_SETTINGS = {
  soundEnabled: true,
  musicEnabled: true,
  themeId: 'neon',
  skinId: 'classic',
  controlMode: 'SWIPE_AREA' as const,
  gameMode: 'CLASSIC' as const,
  difficulty: 1,
};

export const GRID_SIZE = 20;
export const INITIAL_SPEED = 150;
export const SPEED_INCREMENT = 2;
export const MIN_SPEED = 50;
