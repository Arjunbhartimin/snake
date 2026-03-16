import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Settings, Trophy, Info, Pause, RotateCcw, Home, Volume2, VolumeX, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Palette, Calendar, Star, Lock, CheckCircle2 } from 'lucide-react';
import { Direction, Point, GameState, GameSettings, Theme, PowerUpType, PowerUp, Skin, Achievement, DailyChallenge, PlayerProgress, Food, FoodType, Obstacle, Portal } from '../types';
import { THEMES, SKINS, ACHIEVEMENTS, DAILY_CHALLENGES, INITIAL_SETTINGS, GRID_SIZE, INITIAL_SPEED, SPEED_INCREMENT, MIN_SPEED } from '../constants';
import { useAudio } from '../hooks/useAudio';

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Progress & Persistence
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    const saved = localStorage.getItem('snake-progress');
    const generateId = () => `player_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.playerId) {
        parsed.playerId = generateId();
        localStorage.setItem('snake-progress', JSON.stringify(parsed));
      }
      return parsed;
    }
    
    const newProgress: PlayerProgress = {
      playerId: generateId(),
      highScore: 0,
      coins: 0,
      unlockedSkins: ['classic'],
      unlockedThemes: ['retro', 'neon', 'midnight'],
      completedAchievements: [],
      lastChallengeDate: '',
      challengeProgress: 0,
      totalFoodEaten: 0,
      totalSurvivalTime: 0,
    };
    localStorage.setItem('snake-progress', JSON.stringify(newProgress));
    return newProgress;
  });

  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    direction: 'UP',
    nextDirection: 'UP',
    food: { x: 5, y: 5 },
    powerUp: null,
    score: 0,
    highScore: progress.highScore,
    isGameOver: false,
    isPaused: false,
    level: 1,
    activePowerUps: {},
    startTime: Date.now(),
    foodEatenInSession: 0,
    lastGrowthTime: 0,
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('snake-settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [screen, setScreen] = useState<'MENU' | 'GAME' | 'SETTINGS' | 'HIGHSCORES' | 'ABOUT' | 'SKINS' | 'ACHIEVEMENTS' | 'CHALLENGE'>('MENU');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { playEatSound, playGameOverSound, playLevelUpSound, playClickSound } = useAudio();
  
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const currentTheme = useMemo(() => THEMES.find(t => t.id === settings.themeId) || THEMES[1], [settings.themeId]);
  const currentSkin = useMemo(() => SKINS.find(s => s.id === settings.skinId) || SKINS[0], [settings.skinId]);

  const dailyChallenge = useMemo(() => {
    const today = new Date().toDateString();
    const index = Math.abs(today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % DAILY_CHALLENGES.length;
    return DAILY_CHALLENGES[index];
  }, []);

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      localStorage.setItem('snake-progress', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAllProgress = useCallback(() => {
    const newProgress: PlayerProgress = {
      playerId: `player_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
      highScore: 0,
      coins: 0,
      unlockedSkins: ['classic'],
      unlockedThemes: ['retro', 'neon', 'midnight'],
      completedAchievements: [],
      lastChallengeDate: '',
      challengeProgress: 0,
      totalFoodEaten: 0,
      totalSurvivalTime: 0,
    };
    setProgress(newProgress);
    localStorage.setItem('snake-progress', JSON.stringify(newProgress));
    setGameState(prev => ({ ...prev, highScore: 0 }));
    setShowResetConfirm(false);
    playClickSound();
  }, [playClickSound]);

  const checkAchievements = useCallback((finalState: GameState) => {
    updateProgress(prev => {
      const newCompleted: string[] = [...prev.completedAchievements];
      let changed = false;

      ACHIEVEMENTS.forEach(ach => {
        if (newCompleted.includes(ach.id)) return;

        let achieved = false;
        if (ach.category === 'score' && finalState.score >= ach.target) achieved = true;
        if (ach.category === 'food' && prev.totalFoodEaten + finalState.foodEatenInSession >= ach.target) achieved = true;
        if (ach.category === 'survival' && (Date.now() - finalState.startTime) / 1000 >= ach.target) achieved = true;
        if (ach.category === 'theme' && prev.unlockedThemes.length >= ach.target) achieved = true;

        if (achieved) {
          newCompleted.push(ach.id);
          changed = true;
        }
      });

      if (changed || finalState.score > prev.highScore) {
        return {
          ...prev,
          highScore: Math.max(prev.highScore, finalState.score),
          completedAchievements: newCompleted,
          totalFoodEaten: prev.totalFoodEaten + finalState.foodEatenInSession,
          totalSurvivalTime: prev.totalSurvivalTime + (Date.now() - finalState.startTime) / 1000,
        };
      }
      return prev;
    });
  }, [updateProgress]);

  const generateFood = useCallback((snake: Point[], obstacles: Obstacle[] = []): Food => {
    let pos: Point;
    while (true) {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some(s => s.x === pos.x && s.y === pos.y);
      const onObstacle = obstacles.some(o => o.position.x === pos.x && o.position.y === pos.y);
      if (!onSnake && !onObstacle) break;
    }

    const rand = Math.random();
    let type: FoodType = 'NORMAL';
    let expiresAt: number | undefined;

    if (rand > 0.95) {
      type = 'SPECIAL';
    } else if (rand > 0.85) {
      type = 'GOLDEN';
    } else if (rand > 0.75) {
      type = 'TIMED';
      expiresAt = Date.now() + 5000;
    }

    return { type, position: pos, expiresAt };
  }, []);

  const generateObstacles = useCallback((level: number, snake: Point[]): Obstacle[] => {
    const obstacles: Obstacle[] = [];
    const count = Math.min(10, Math.floor(level / 2));
    
    for (let i = 0; i < count; i++) {
      let pos: Point;
      while (true) {
        pos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        // Don't spawn near head or on other obstacles
        const dist = Math.abs(pos.x - snake[0].x) + Math.abs(pos.y - snake[0].y);
        const onSnake = snake.some(s => s.x === pos.x && s.y === pos.y);
        const onObstacle = obstacles.some(o => o.position.x === pos.x && o.position.y === pos.y);
        if (dist > 5 && !onSnake && !onObstacle) break;
      }
      obstacles.push({ type: 'ROCK', position: pos });
    }
    return obstacles;
  }, []);

  const generatePortals = useCallback((level: number, snake: Point[], obstacles: Obstacle[]): Portal[] => {
    if (level < 5) return [];
    const portals: Portal[] = [];
    
    const findPos = () => {
      while (true) {
        const p = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
        if (!snake.some(s => s.x === p.x && s.y === p.y) && !obstacles.some(o => o.position.x === p.x && o.position.y === p.y)) return p;
      }
    };

    portals.push({
      entry: findPos(),
      exit: findPos(),
      color: '#a855f7'
    });

    return portals;
  }, []);

  const generatePowerUp = useCallback((snake: Point[], food: Point, obstacles: Obstacle[] = []): PowerUp | null => {
    if (Math.random() > 0.15) return null;
    
    const types: PowerUpType[] = ['SPEED_BOOST', 'SLOW_MOTION', 'DOUBLE_SCORE', 'GHOST_MODE'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let pos: Point;
    while (true) {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some(s => s.x === pos.x && s.y === pos.y);
      const onFood = pos.x === food.x && pos.y === food.y;
      const onObstacle = obstacles.some(o => o.position.x === pos.x && o.position.y === pos.y);
      if (!onSnake && !onFood && !onObstacle) break;
    }
    
    return {
      type,
      position: pos,
      expiresAt: Date.now() + 6000,
    };
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    const obstacles = settings.gameMode === 'TIME_ATTACK' ? [] : generateObstacles(1, initialSnake);
    setGameState({
      snake: initialSnake,
      direction: 'UP',
      nextDirection: 'UP',
      food: generateFood(initialSnake, obstacles),
      powerUp: null,
      obstacles,
      portals: [],
      score: 0,
      highScore: progress.highScore,
      isGameOver: false,
      isPaused: false,
      level: 1,
      activePowerUps: {},
      startTime: Date.now(),
      lastPauseTime: undefined,
      foodEatenInSession: 0,
      lastGrowthTime: 0,
      combo: 0,
      lastEatTime: 0,
      timeLeft: settings.gameMode === 'TIME_ATTACK' ? 60 : undefined,
    });
  }, [generateFood, generateObstacles, progress.highScore, settings.gameMode]);

  const updateGame = useCallback(() => {
    setGameState(prev => {
      if (prev.isGameOver || prev.isPaused) return prev;

      const newDirection = prev.nextDirection;
      const head = prev.snake[0];
      let newHead = { ...head };

      switch (newDirection) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Wall collision
      if (settings.gameMode === 'CLASSIC') {
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          if (settings.soundEnabled) playGameOverSound();
          if (navigator.vibrate) navigator.vibrate(200);
          checkAchievements({ ...prev, isGameOver: true });
          return { ...prev, isGameOver: true };
        }
      } else {
        // Modern, Time Attack, Survival wrap around
        newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
        newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
      }

      // Portal teleportation
      const portal = prev.portals.find(p => (p.entry.x === newHead.x && p.entry.y === newHead.y) || (p.exit.x === newHead.x && p.exit.y === newHead.y));
      if (portal) {
        if (newHead.x === portal.entry.x && newHead.y === portal.entry.y) {
          newHead = { ...portal.exit };
        } else {
          newHead = { ...portal.entry };
        }
        if (navigator.vibrate) navigator.vibrate(50);
      }

      // Obstacle collision
      const isGhost = (prev.activePowerUps['GHOST_MODE'] || 0) > Date.now();
      const hitObstacle = prev.obstacles.some(o => o.position.x === newHead.x && o.position.y === newHead.y);
      if (!isGhost && hitObstacle && settings.gameMode !== 'TIME_ATTACK') {
        if (settings.soundEnabled) playGameOverSound();
        if (navigator.vibrate) navigator.vibrate(200);
        checkAchievements({ ...prev, isGameOver: true });
        return { ...prev, isGameOver: true };
      }

      // Self collision
      if (!isGhost && prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        if (settings.soundEnabled) playGameOverSound();
        if (navigator.vibrate) navigator.vibrate(200);
        checkAchievements({ ...prev, isGameOver: true });
        return { ...prev, isGameOver: true };
      }

      const newSnake = [newHead, ...prev.snake];
      let newFood = { ...prev.food };
      let newScore = prev.score;
      let newLevel = prev.level;
      let newFoodEaten = prev.foodEatenInSession;
      let newPowerUp = prev.powerUp;
      let newGrowthTime = prev.lastGrowthTime;
      let newCombo = prev.combo;
      let newLastEatTime = prev.lastEatTime;
      let newTimeLeft = prev.timeLeft;
      let newObstacles = [...prev.obstacles];
      let newPortals = [...prev.portals];
      const newActivePowerUps = { ...prev.activePowerUps };

      // Time Attack timer
      // Handled by separate useEffect

      // Food logic
      if (newFood.expiresAt && newFood.expiresAt < Date.now()) {
        newFood = generateFood(newSnake, newObstacles);
      }

      if (newPowerUp && newPowerUp.expiresAt < Date.now()) newPowerUp = null;

      // Eat food
      if (newHead.x === newFood.position.x && newHead.y === newFood.position.y) {
        if (settings.soundEnabled) playEatSound();
        if (navigator.vibrate) navigator.vibrate(50);
        
        // Combo logic
        const now = Date.now();
        if (now - newLastEatTime < 2000) {
          newCombo = Math.min(5, newCombo + 1);
        } else {
          newCombo = 1;
        }
        newLastEatTime = now;

        let points = 10;
        if (newFood.type === 'GOLDEN') points = 30;
        if (newFood.type === 'SPECIAL') {
          points = 20;
          // Random power-up or bonus
          if (Math.random() > 0.5) {
            const types: PowerUpType[] = ['SPEED_BOOST', 'SLOW_MOTION', 'DOUBLE_SCORE', 'GHOST_MODE'];
            newActivePowerUps[types[Math.floor(Math.random() * types.length)]] = Date.now() + 5000;
          }
        }

        const isDouble = (prev.activePowerUps['DOUBLE_SCORE'] || 0) > Date.now();
        const pointsEarned = (points * newCombo) * (isDouble ? 2 : 1);
        newScore += pointsEarned;
        
        // Add coins based on score (score / 2)
        updateProgress(p => ({ ...p, coins: (p.coins || 0) + Math.floor(pointsEarned / 2) }));
        
        newFood = generateFood(newSnake, newObstacles);
        newFoodEaten += 1;
        newGrowthTime = Date.now();

        // Update challenge progress
        if (dailyChallenge.type === 'food') {
          updateProgress(p => ({ ...p, challengeProgress: Math.min(dailyChallenge.target, p.challengeProgress + 1) }));
        }

        if (newFoodEaten % 5 === 0) {
          newLevel += 1;
          if (settings.soundEnabled) playLevelUpSound();
          if (settings.gameMode !== 'TIME_ATTACK') {
            newObstacles = generateObstacles(newLevel, newSnake);
          }
          newPortals = generatePortals(newLevel, newSnake, newObstacles);
        }

        if (!newPowerUp) newPowerUp = generatePowerUp(newSnake, newFood.position, newObstacles);
      } else {
        newSnake.pop();
      }

      // Collect power-up
      if (newPowerUp && newHead.x === newPowerUp.position.x && newHead.y === newPowerUp.position.y) {
        if (settings.soundEnabled) playLevelUpSound();
        if (navigator.vibrate) navigator.vibrate(100);
        newActivePowerUps[newPowerUp.type] = Date.now() + 7000;
        newPowerUp = null;
        
        if (dailyChallenge.type === 'powerup') {
          updateProgress(p => ({ ...p, challengeProgress: Math.min(dailyChallenge.target, p.challengeProgress + 1) }));
        }
      }

      if (newScore > prev.highScore) {
        updateProgress(p => ({ ...p, highScore: Math.max(p.highScore, newScore) }));
      }
      
      if (dailyChallenge.type === 'score' && newScore > progress.challengeProgress) {
        updateProgress(p => ({ ...p, challengeProgress: Math.min(dailyChallenge.target, newScore) }));
      }

      if (dailyChallenge.type === 'survival') {
        const survivalTime = (Date.now() - prev.startTime) / 1000;
        if (survivalTime > progress.challengeProgress) {
          updateProgress(p => ({ ...p, challengeProgress: Math.min(dailyChallenge.target, Math.floor(survivalTime)) }));
        }
      }

      return {
        ...prev,
        snake: newSnake,
        direction: newDirection,
        food: newFood,
        powerUp: newPowerUp,
        obstacles: newObstacles,
        portals: newPortals,
        score: newScore,
        highScore: Math.max(newScore, prev.highScore),
        level: newLevel,
        foodEatenInSession: newFoodEaten,
        activePowerUps: newActivePowerUps,
        lastGrowthTime: newGrowthTime,
        combo: newCombo,
        lastEatTime: newLastEatTime,
        timeLeft: newTimeLeft,
      };
    });
  }, [settings, generateFood, generatePowerUp, generateObstacles, generatePortals, playEatSound, playGameOverSound, playLevelUpSound, checkAchievements, progress.challengeProgress, updateProgress, dailyChallenge]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setGameState(prev => {
        let nextDir = prev.nextDirection;
        switch (e.key) {
          case 'ArrowUp': if (prev.nextDirection !== 'DOWN') nextDir = 'UP'; break;
          case 'ArrowDown': if (prev.nextDirection !== 'UP') nextDir = 'DOWN'; break;
          case 'ArrowLeft': if (prev.nextDirection !== 'RIGHT') nextDir = 'LEFT'; break;
          case 'ArrowRight': if (prev.nextDirection !== 'LEFT') nextDir = 'RIGHT'; break;
          case 'p': 
            const isPausing = !prev.isPaused;
            return { 
              ...prev, 
              isPaused: isPausing,
              startTime: !isPausing ? prev.startTime + (Date.now() - (prev.lastPauseTime || Date.now())) : prev.startTime,
              lastPauseTime: isPausing ? Date.now() : undefined
            };
        }
        return { ...prev, nextDirection: nextDir };
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (screen !== 'GAME' || settings.gameMode !== 'TIME_ATTACK' || gameState.isPaused || gameState.isGameOver) return;
    
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft === undefined || prev.timeLeft <= 0) {
          clearInterval(timer);
          if (prev.timeLeft === 0 && !prev.isGameOver) {
            if (settings.soundEnabled) playGameOverSound();
            return { ...prev, isGameOver: true };
          }
          return prev;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [screen, settings.gameMode, gameState.isPaused, gameState.isGameOver, settings.soundEnabled, playGameOverSound]);

  useEffect(() => {
    if (screen !== 'GAME') return;
    const loop = (time: number) => {
      const delta = time - lastUpdateTimeRef.current;
      
      let speed = Math.max(MIN_SPEED, INITIAL_SPEED - (gameState.level - 1) * SPEED_INCREMENT);
      if (settings.gameMode === 'SURVIVAL') {
        const survivalBonus = Math.floor((Date.now() - gameState.startTime) / 10000) * 5;
        speed = Math.max(MIN_SPEED, speed - survivalBonus);
      }
      
      if ((gameState.activePowerUps['SPEED_BOOST'] || 0) > Date.now()) speed *= 0.5;
      if ((gameState.activePowerUps['SLOW_MOTION'] || 0) > Date.now()) speed *= 2.0;

      if (delta > speed) {
        updateGame();
        lastUpdateTimeRef.current = time;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [screen, gameState.level, gameState.activePowerUps, updateGame, settings.gameMode, gameState.startTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width / GRID_SIZE;
    const isSlowMo = (gameState.activePowerUps['SLOW_MOTION'] || 0) > Date.now();
    const isGhost = (gameState.activePowerUps['GHOST_MODE'] || 0) > Date.now();
    const isSpeed = (gameState.activePowerUps['SPEED_BOOST'] || 0) > Date.now();

    // Clear background
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated background grid
    const time = Date.now();
    ctx.strokeStyle = isSlowMo ? '#00ccff' : currentTheme.grid;
    ctx.lineWidth = 0.5;
    
    // Ripple effect for Slow Motion
    if (isSlowMo) {
      const rippleRadius = (time / 10) % (canvas.width * 1.5);
      const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, rippleRadius);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, 'rgba(0, 204, 255, 0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.globalAlpha = isSlowMo ? 0.3 + Math.sin(time / 200) * 0.1 : 0.5;

    for (let i = -1; i <= GRID_SIZE + 1; i++) {
      ctx.beginPath();
      for (let j = -1; j <= GRID_SIZE + 1; j++) {
        const wave = Math.sin((i + j) * 0.5 - time * 0.003) * 5;
        if (j === -1) {
          ctx.moveTo(i * size + wave, j * size);
        } else {
          ctx.lineTo(i * size + wave, j * size);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      for (let j = -1; j <= GRID_SIZE + 1; j++) {
        const wave = Math.sin((i + j) * 0.5 - time * 0.003) * 5;
        if (j === -1) {
          ctx.moveTo(j * size, i * size + wave);
        } else {
          ctx.lineTo(j * size, i * size + wave);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw Portals
    gameState.portals.forEach(p => {
      [p.entry, p.exit].forEach(pos => {
        const grad = ctx.createRadialGradient(pos.x * size + size/2, pos.y * size + size/2, 0, pos.x * size + size/2, pos.y * size + size/2, size);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x * size + size/2, pos.y * size + size/2, size/2 + Math.sin(Date.now()/100)*2, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw Obstacles
    gameState.obstacles.forEach(o => {
      ctx.fillStyle = '#4b5563';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'black';
      ctx.beginPath();
      ctx.roundRect(o.position.x * size + 2, o.position.y * size + 2, size - 4, size - 4, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Food
    const f = gameState.food;
    let foodColor = currentTheme.food;
    let foodSize = size/2;

    if (f.type === 'GOLDEN') {
      foodColor = '#fbbf24';
      foodSize = size/1.8;
    } else if (f.type === 'TIMED') {
      foodColor = '#ef4444';
      const timeLeft = (f.expiresAt! - Date.now()) / 5000;
      foodSize = (size/2) * timeLeft;
    } else if (f.type === 'SPECIAL') {
      foodColor = '#a855f7';
    }

    const foodGlow = ctx.createRadialGradient(
      f.position.x * size + size/2, f.position.y * size + size/2, 0,
      f.position.x * size + size/2, f.position.y * size + size/2, size
    );
    foodGlow.addColorStop(0, foodColor);
    foodGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = foodGlow;
    ctx.beginPath();
    ctx.arc(f.position.x * size + size/2, f.position.y * size + size/2, foodSize * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(f.position.x * size + size/2, f.position.y * size + size/2, foodSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw Power-up
    if (gameState.powerUp) {
      const p = gameState.powerUp;
      ctx.fillStyle = p.type === 'SLOW_MOTION' ? '#00ccff' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(p.position.x * size + size/2, p.position.y * size + size/2, size/3, 0, Math.PI * 2);
      ctx.fill();
      // Pulsing effect
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.position.x * size + size/2, p.position.y * size + size/2, (size/3) + Math.sin(Date.now()/100) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Snake
    gameState.snake.forEach((segment, i) => {
      const isHead = i === 0;
      const isTail = i === gameState.snake.length - 1;
      const color = isHead ? currentSkin.headColor : currentSkin.bodyColor;
      
      // Growth animation for tail
      let segmentScale = 1;
      const growthDuration = 300;
      const timeSinceGrowth = Date.now() - gameState.lastGrowthTime;
      
      if (isTail && timeSinceGrowth < growthDuration) {
        // Scale from 0.4 to 1.0
        const progress = timeSinceGrowth / growthDuration;
        segmentScale = 0.4 + (0.6 * progress);
      }

      ctx.save();
      ctx.translate(segment.x * size + size/2, segment.y * size + size/2);
      ctx.scale(segmentScale, segmentScale);
      
      // Shadow
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowOffsetY = 4;

      // Skin effects
      if (currentSkin.effect === 'fire') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        // Add "flicker"
        if (Math.random() > 0.8) ctx.globalAlpha = 0.8;
      } else if (currentSkin.effect === 'neon') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
      } else if (currentSkin.effect === 'metal') {
        const metalGrad = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
        metalGrad.addColorStop(0, '#ffffff');
        metalGrad.addColorStop(0.5, color);
        metalGrad.addColorStop(1, '#000000');
        ctx.fillStyle = metalGrad;
      } else if (currentSkin.effect === 'scales') {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        // Draw a small "V" pattern
        ctx.beginPath();
        ctx.moveTo(-size/4, -size/4);
        ctx.lineTo(0, 0);
        ctx.lineTo(size/4, -size/4);
        ctx.stroke();
      }

      // Glow effect overrides
      if (isSlowMo) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ccff';
      } else if (isSpeed) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
      } else if (isGhost) {
        ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
      }

      // 3D-like segment
      const gradient = ctx.createRadialGradient(-size/4, -size/4, 0, 0, 0, size/2);
      gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
      gradient.addColorStop(1, color);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (isHead) {
        ctx.roundRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4, 8);
      } else {
        ctx.roundRect(-size/2 + 4, -size/2 + 4, size - 8, size - 8, 4);
      }
      ctx.fill();

      // Eyes for head
      if (isHead) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-size/4, -size/4, 2, 0, Math.PI * 2);
        ctx.arc(size/4, -size/4, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

  }, [gameState, currentTheme, currentSkin]);

  const handleSwipe = (dir: Direction) => {
    setGameState(prev => {
      let nextDir = prev.nextDirection;
      if (dir === 'UP' && prev.nextDirection !== 'DOWN') nextDir = 'UP';
      if (dir === 'DOWN' && prev.nextDirection !== 'UP') nextDir = 'DOWN';
      if (dir === 'LEFT' && prev.nextDirection !== 'RIGHT') nextDir = 'LEFT';
      if (dir === 'RIGHT' && prev.nextDirection !== 'LEFT') nextDir = 'RIGHT';
      return { ...prev, nextDirection: nextDir };
    });
  };

  const touchStart = useRef<Point | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) handleSwipe(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      if (Math.abs(dy) > 30) handleSwipe(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStart.current = null;
  };

  const saveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    localStorage.setItem('snake-settings', JSON.stringify(newSettings));
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white font-sans overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {screen === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-8 w-full max-w-md md:max-w-2xl px-8"
          >
            <div className="text-center">
              <h1 className="text-5xl font-light tracking-tight text-white mb-2">SNAKE</h1>
              <p className="text-zinc-500 uppercase tracking-[0.3em] text-[8px] font-medium">Minimal Edition</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => { playClickSound(); resetGame(); setScreen('GAME'); }}
                className="group relative flex items-center justify-center bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-2xl font-semibold text-lg transition-all active:scale-95"
              >
                <span>PLAY</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { playClickSound(); setScreen('CHALLENGE'); }} className="flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 p-4 rounded-2xl border border-white/5 transition-all active:scale-95">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-medium text-zinc-400">CHALLENGE</span>
                </button>
                <button onClick={() => { playClickSound(); setScreen('ACHIEVEMENTS'); }} className="flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 p-4 rounded-2xl border border-white/5 transition-all active:scale-95">
                  <Star className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-medium text-zinc-400">AWARDS</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { playClickSound(); setScreen('SKINS'); }} className="flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 p-4 rounded-2xl border border-white/5 transition-all active:scale-95">
                  <Palette className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-medium text-zinc-400">SKINS</span>
                </button>
                <button onClick={() => { playClickSound(); setScreen('SETTINGS'); }} className="flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 p-4 rounded-2xl border border-white/5 transition-all active:scale-95">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-medium text-zinc-400">SETTINGS</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-zinc-600 text-[9px] font-medium uppercase tracking-widest">
              <span>Best: {progress.highScore}</span>
              <div className="w-1 h-1 rounded-full bg-zinc-800" />
              <span>Coins: {progress.coins || 0}</span>
              <div className="w-1 h-1 rounded-full bg-zinc-800" />
              <span>{settings.gameMode}</span>
            </div>
          </motion.div>
        )}

        {screen === 'GAME' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 w-full h-full max-w-md md:max-w-2xl p-4"
          >
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black italic text-emerald-500 leading-none">{gameState.score}</span>
                  {gameState.combo > 1 && (
                    <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xs font-bold text-yellow-500">x{gameState.combo}</motion.span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {gameState.timeLeft !== undefined && (
                  <div className="flex flex-col items-center mr-2">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Time</span>
                    <span className={`text-xl font-black italic leading-none ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{Math.ceil(gameState.timeLeft)}s</span>
                  </div>
                )}
                <button onClick={() => setGameState(prev => {
                  const isPausing = !prev.isPaused;
                  return {
                    ...prev,
                    isPaused: isPausing,
                    startTime: !isPausing ? prev.startTime + (Date.now() - (prev.lastPauseTime || Date.now())) : prev.startTime,
                    lastPauseTime: isPausing ? Date.now() : undefined
                  };
                })} className="p-3 bg-zinc-900 rounded-2xl active:scale-90 transition-transform">
                  {gameState.isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                </button>
                <button onClick={() => { playClickSound(); setScreen('MENU'); }} className="p-3 bg-zinc-900 rounded-2xl active:scale-90 transition-transform">
                  <Home className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Level</span>
                <span className="text-2xl font-black italic text-emerald-500 leading-none">{gameState.level}</span>
              </div>
            </div>

            <motion.div 
              className="relative aspect-square w-full max-w-[min(100%,600px,65vh)] rounded-[40px] overflow-hidden border-4 border-zinc-900 shadow-2xl touch-none"
              animate={gameState.combo > 1 ? { x: [0, -2, 2, -2, 2, 0] } : {}}
              transition={{ duration: 0.2 }}
              onTouchStart={settings.controlMode === 'SWIPE_ANYWHERE' ? handleTouchStart : undefined}
              onTouchEnd={settings.controlMode === 'SWIPE_ANYWHERE' ? handleTouchEnd : undefined}
            >
              <canvas ref={canvasRef} width={800} height={800} className="w-full h-full" />
              
              {/* Power-up Timers */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {Object.entries(gameState.activePowerUps).map(([type, expiry]) => {
                  const timeLeft = Math.max(0, Math.ceil(((expiry as number) - Date.now()) / 1000));
                  if (timeLeft === 0) return null;
                  return (
                    <motion.div key={type} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                      <div className={`w-2 h-2 rounded-full ${type === 'SLOW_MOTION' ? 'bg-sky-400' : 'bg-yellow-400'}`} />
                      <span className="text-[10px] font-bold">{type.replace('_', ' ')}: {timeLeft}s</span>
                    </motion.div>
                  );
                })}
              </div>

              <AnimatePresence>
                {(gameState.isPaused || gameState.isGameOver) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                    {gameState.isGameOver ? (
                      <>
                        <h2 className="text-4xl font-light tracking-tight text-white mb-2">GAME OVER</h2>
                        <div className="flex flex-col items-center gap-1 mb-10">
                          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em]">Score: {gameState.score}</p>
                          <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">+{Math.floor(gameState.score / 2)} Coins Earned</span>
                          </div>
                          <p className="text-zinc-500 text-[9px] mt-2 uppercase tracking-[0.2em]">Total Coins: {progress.coins || 0}</p>
                        </div>
                        <div className="flex flex-col gap-4 w-full max-w-[200px]">
                          <button onClick={() => { playClickSound(); resetGame(); }} className="bg-white text-black py-4 rounded-2xl font-semibold active:scale-95 transition-transform">
                            TRY AGAIN
                          </button>
                          <button onClick={() => { playClickSound(); setScreen('MENU'); }} className="text-zinc-400 text-[10px] font-medium uppercase tracking-widest hover:text-white transition-colors">
                            BACK TO MENU
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-4xl font-light tracking-tight text-white mb-10">PAUSED</h2>
                        <button onClick={() => setGameState(prev => ({ 
                          ...prev, 
                          isPaused: false,
                          startTime: prev.startTime + (Date.now() - (prev.lastPauseTime || Date.now())),
                          lastPauseTime: undefined
                        }))} className="bg-white text-black w-full max-w-[200px] py-4 rounded-2xl font-semibold active:scale-95 transition-transform">
                          RESUME
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {settings.controlMode === 'DPAD' && (
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div />
                <button onClick={() => handleSwipe('UP')} className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 active:bg-white active:text-black transition-all"><ArrowUp className="w-5 h-5" /></button>
                <div />
                <button onClick={() => handleSwipe('LEFT')} className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 active:bg-white active:text-black transition-all"><ArrowLeft className="w-5 h-5" /></button>
                <button onClick={() => handleSwipe('DOWN')} className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 active:bg-white active:text-black transition-all"><ArrowDown className="w-5 h-5" /></button>
                <button onClick={() => handleSwipe('RIGHT')} className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 active:bg-white active:text-black transition-all"><ArrowRight className="w-5 h-5" /></button>
              </div>
            )}

            {settings.controlMode === 'SWIPE_AREA' && (
              <div 
                className="mt-auto w-full flex flex-col items-center gap-4 py-20 px-4 bg-zinc-900/20 rounded-[40px] border border-white/5 relative overflow-hidden touch-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex flex-col items-center gap-2 z-10 opacity-30">
                  <ArrowUp className="w-4 h-4" />
                  <div className="flex items-center gap-8">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-[8px] font-medium text-zinc-500 uppercase tracking-[0.3em]">Swipe Area</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {screen === 'SKINS' && (
          <motion.div key="skins" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col w-full max-w-md md:max-w-2xl h-full p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <button onClick={() => { playClickSound(); setScreen('MENU'); }} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-light tracking-tight">SKINS</h2>
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs font-bold text-yellow-500">{progress.coins || 0}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pb-8 pr-2 custom-scrollbar">
              {SKINS.map(skin => {
                const isUnlocked = progress.unlockedSkins.includes(skin.id);
                const isSelected = settings.skinId === skin.id;
                
                let requirementMet = false;
                if (skin.unlockType === 'default') requirementMet = true;
                else if (skin.unlockType === 'score') requirementMet = progress.highScore >= (skin.unlockValue as number);
                else if (skin.unlockType === 'survival') requirementMet = progress.totalSurvivalTime >= (skin.unlockValue as number);
                else if (skin.unlockType === 'food') requirementMet = progress.totalFoodEaten >= (skin.unlockValue as number);
                else if (skin.unlockType === 'achievement') requirementMet = progress.completedAchievements.includes(skin.unlockValue as string);
                else if (skin.unlockType === 'challenge') requirementMet = progress.challengeProgress >= (skin.unlockValue as number);

                const canAfford = (progress.coins || 0) >= (skin.coinCost || 0);
                const canUnlock = !isUnlocked && requirementMet && canAfford;

                return (
                  <button
                    key={skin.id}
                    disabled={!isUnlocked && !canUnlock}
                    onClick={() => {
                      playClickSound();
                      if (isUnlocked) {
                        saveSettings({ ...settings, skinId: skin.id });
                      } else if (canUnlock) {
                        updateProgress(p => ({
                          ...p,
                          coins: (p.coins || 0) - (skin.coinCost || 0),
                          unlockedSkins: [...p.unlockedSkins, skin.id]
                        }));
                      }
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isSelected ? 'bg-white text-black border-white' : 'bg-zinc-900/50 border-white/5 text-white'} ${!isUnlocked && !canUnlock ? 'opacity-40' : ''} ${canUnlock ? 'border-yellow-500/50 hover:bg-zinc-800' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-950" style={{ backgroundColor: skin.headColor }} />
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-950" style={{ backgroundColor: skin.bodyColor }} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-xs">{skin.name}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-black/60' : 'text-zinc-500'}`}>
                          {isUnlocked ? skin.description : (
                            <span className="flex items-center gap-2">
                              <span>Req: {skin.unlockType} {skin.unlockValue}</span>
                              {skin.coinCost ? (
                                <span className={`flex items-center gap-1 ${canAfford ? 'text-yellow-500' : 'text-red-500'}`}>
                                  <div className="w-2 h-2 rounded-full bg-current" /> {skin.coinCost}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    {!isUnlocked && (
                      canUnlock ? (
                        <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg">UNLOCK</span>
                      ) : (
                        <Lock className="w-3 h-3 text-zinc-600" />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'ACHIEVEMENTS' && (
          <motion.div key="achievements" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col w-full max-w-md md:max-w-2xl h-full p-8">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={() => { playClickSound(); setScreen('MENU'); }} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <h2 className="text-xl font-light tracking-tight">AWARDS</h2>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pb-8 pr-2 custom-scrollbar">
              {ACHIEVEMENTS.map(ach => {
                const isDone = progress.completedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${isDone ? 'bg-zinc-900/80 border-white/10' : 'bg-zinc-900/30 border-white/5 opacity-60'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDone ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-600'}`}>
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs">{ach.title}</span>
                      <span className="text-[9px] text-zinc-500">{ach.description}</span>
                      {(ach.rewardSkinId || ach.rewardThemeId) && (
                        <span className="text-[8px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">
                          Unlocks: {ach.rewardSkinId ? SKINS.find(s => s.id === ach.rewardSkinId)?.name : THEMES.find(t => t.id === ach.rewardThemeId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'CHALLENGE' && (
          <motion.div key="challenge" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col w-full max-w-md md:max-w-2xl h-full p-8">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={() => { playClickSound(); setScreen('MENU'); }} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <h2 className="text-xl font-light tracking-tight">DAILY QUEST</h2>
            </div>
            <div className="flex flex-col items-center justify-center flex-1 gap-10 text-center">
              <div className="relative">
                <Calendar className="w-20 h-20 text-white/20" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-2xl font-light tracking-tight">{dailyChallenge.title}</h3>
                <p className="text-zinc-500 text-xs max-w-[200px]">{dailyChallenge.description}</p>
              </div>
              <div className="w-full max-w-[240px] bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${(progress.challengeProgress / dailyChallenge.target) * 100}%` }} 
                  className="h-full bg-white" 
                />
              </div>
              <div className="flex flex-col gap-6 w-full">
                <button onClick={() => { playClickSound(); resetGame(); setScreen('GAME'); }} className="w-full bg-white text-black py-4 rounded-2xl font-semibold active:scale-95 transition-transform">
                  START
                </button>
                <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-[0.3em]">Resets Daily</p>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'SETTINGS' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col w-full max-w-md md:max-w-2xl h-full p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <button onClick={() => { playClickSound(); setScreen('MENU'); }} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-light tracking-tight">SETTINGS</h2>
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs font-bold text-yellow-500">{progress.coins || 0}</span>
              </div>
            </div>
            <div className="flex flex-col gap-8 overflow-y-auto pb-8 pr-2 custom-scrollbar">
              <section className="flex flex-col gap-4">
                <h3 className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em]">Audio</h3>
                <div className="flex gap-2">
                  <button onClick={() => saveSettings({ ...settings, soundEnabled: !settings.soundEnabled })} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-[10px] transition-all ${settings.soundEnabled ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'}`}>
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} SOUND
                  </button>
                  <button onClick={() => saveSettings({ ...settings, musicEnabled: !settings.musicEnabled })} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-[10px] transition-all ${settings.musicEnabled ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'}`}>
                    {settings.musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} MUSIC
                  </button>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em]">Game Mode</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['CLASSIC', 'MODERN', 'TIME_ATTACK', 'SURVIVAL'].map(mode => (
                    <button 
                      key={mode}
                      onClick={() => saveSettings({ ...settings, gameMode: mode as any })} 
                      className={`p-4 rounded-2xl font-semibold text-[9px] transition-all ${settings.gameMode === mode ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'}`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em]">Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button onClick={() => saveSettings({ ...settings, controlMode: 'SWIPE_AREA' })} className={`p-4 rounded-2xl font-semibold text-[9px] transition-all ${settings.controlMode === 'SWIPE_AREA' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'}`}>DEDICATED SWIPE AREA</button>
                  <button onClick={() => saveSettings({ ...settings, controlMode: 'SWIPE_ANYWHERE' })} className={`p-4 rounded-2xl font-semibold text-[9px] transition-all ${settings.controlMode === 'SWIPE_ANYWHERE' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'}`}>FULL SCREEN SWIPE</button>
                  <button onClick={() => saveSettings({ ...settings, controlMode: 'DPAD' })} className={`p-4 rounded-2xl font-semibold text-[9px] transition-all ${settings.controlMode === 'DPAD' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'}`}>D-PAD BUTTONS</button>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em]">Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {THEMES.map(t => {
                    const isUnlocked = progress.unlockedThemes.includes(t.id);
                    const isSelected = settings.themeId === t.id;
                    
                    const canAfford = (progress.coins || 0) >= (t.coinCost || 0);
                    const canUnlock = !isUnlocked && canAfford;

                    return (
                      <button 
                        key={t.id} 
                        disabled={!isUnlocked && !canUnlock}
                        onClick={() => {
                          playClickSound();
                          if (isUnlocked) {
                            saveSettings({ ...settings, themeId: t.id });
                          } else if (canUnlock) {
                            updateProgress(p => ({
                              ...p,
                              coins: (p.coins || 0) - (t.coinCost || 0),
                              unlockedThemes: [...p.unlockedThemes, t.id]
                            }));
                          }
                        }} 
                        className={`flex flex-col gap-2 p-4 rounded-2xl font-semibold transition-all ${isSelected ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-white/5'} ${!isUnlocked && !canUnlock ? 'opacity-30' : ''} ${canUnlock ? 'border-yellow-500/50 hover:bg-zinc-800' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: t.snakeHead }} />
                            <span className="text-[10px]">{t.name}</span>
                          </div>
                          {!isUnlocked && (
                            canUnlock ? (
                              <span className="text-[8px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">UNLOCK</span>
                            ) : (
                              <Lock className="w-3 h-3" />
                            )
                          )}
                        </div>
                        {!isUnlocked && (
                          <div className="flex flex-col items-start text-[8px] mt-1 opacity-80">
                            {t.coinCost ? (
                              <span className={`flex items-center gap-1 ${canAfford ? 'text-yellow-500' : 'text-red-500'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-current" /> {t.coinCost} Coins
                              </span>
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="flex flex-col gap-4 mt-4">
                <h3 className="text-[9px] font-medium text-red-500 uppercase tracking-[0.2em]">Danger Zone</h3>
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> RESET ALL GAME DATA
                </button>
                <p className="text-[8px] text-zinc-600 text-center italic">ID: {progress.playerId}</p>
              </section>
            </div>
          </motion.div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-[40px] p-8 flex flex-col items-center text-center gap-6"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <RotateCcw className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black italic">RESET ALL DATA?</h3>
                <p className="text-sm text-zinc-400">This will permanently delete your high score, achievements, and unlocked skins. This cannot be undone.</p>
              </div>
              <div className="flex flex-col w-full gap-2">
                <button 
                  onClick={resetAllProgress}
                  className="w-full p-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                >
                  YES, RESET EVERYTHING
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full p-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SnakeGame;
