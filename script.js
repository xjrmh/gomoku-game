// Landscape lock for mobile devices
function checkLandscapeLock() {
  const lock = document.getElementById('landscape-lock');
  const container = document.querySelector('.container');
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isLandscape = window.innerWidth > window.innerHeight;
  if (isMobile && isLandscape) {
    lock.classList.remove('hidden');
    lock.style.display = 'flex';
    // Only hide the game content, not the lock message
    Array.from(container.children).forEach(child => {
      if (child !== lock) child.style.display = 'none';
    });
  } else {
    lock.classList.add('hidden');
    lock.style.display = 'none';
    Array.from(container.children).forEach(child => {
      if (child !== lock) child.style.display = '';
    });
  }
}

window.addEventListener('resize', checkLandscapeLock);
window.addEventListener('orientationchange', checkLandscapeLock);
window.addEventListener('DOMContentLoaded', checkLandscapeLock);
// Simplified Gomoku game implementation
let boardSize = 15;
let board = [];
let currentPlayer = 'black';
let gameActive = false;
let vsComputer = false;
let aiVsAi = false; // Track AI vs AI mode
let aiVsAiPaused = false; // Track if AI vs AI is paused
let previousMode = false; // Track previous mode (false = PvP, true = vs Computer)
let moveHistory = []; // Track move history for undo

const boardContainer = document.getElementById('board');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');
const reverseBtn = document.getElementById('reverse-btn');
const helpBtn = document.getElementById('help-btn');
const pauseAiBtn = document.getElementById('pause-ai-btn');
const pvpBtn = document.getElementById('pvp-btn');
const pvcBtn = document.getElementById('pvc-btn');
const themeBtn = document.getElementById('theme-btn');
const sizeUpBtn = document.getElementById('size-up-btn');
const sizeDownBtn = document.getElementById('size-down-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const containerEl = document.querySelector('.container');
const titleEl = document.querySelector('h1');
const fireworksCanvas = document.getElementById('fireworks');
const fireworksCtx = fireworksCanvas.getContext('2d');
const victoryMessageEl = document.getElementById('victory-message');

let isMaximized = false;

// Theme colors: [background, light cell, dark cell]
const themes = [
  ['#8B4513', '#DEB887', '#D2A679'], // Classic Wood (Walnut)
  ['#D4A574', '#F5DEB3', '#E8C89F'], // Light Wood (Bamboo)
  ['#5D4037', '#A1887F', '#8D6E63'], // Dark Wood (Cherry)
  ['#2E7D32', '#81C784', '#66BB6A'], // Green Jade
  ['#1565C0', '#64B5F6', '#42A5F5'], // Blue Marble
  ['#424242', '#9E9E9E', '#757575'], // Slate Gray
  ['#4A148C', '#BA68C8', '#AB47BC'], // Amethyst
  ['#BF360C', '#FF8A65', '#FF7043'], // Terracotta
  ['#F48FB1', '#FCE4EC', '#F8BBD0'], // Light Pink
];

const themeNames = [
  'Classic Wood',
  'Light Bamboo',
  'Dark Cherry',
  'Green Jade',
  'Blue Marble',
  'Slate Gray',
  'Amethyst',
  'Terracotta',
  'Light Pink'
];

let currentThemeIndex = 0;

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

pvpBtn.addEventListener('click', () => startGame(false));

// Long press support for AI Mode button to enable AI vs AI
let longPressTimerAI;
let longPressTriggeredAI = false;
pvcBtn.addEventListener('mousedown', () => {
  longPressTriggeredAI = false;
  longPressTimerAI = setTimeout(() => {
    longPressTriggeredAI = true;
    startGame('ai-vs-ai');
    messageEl.textContent = 'AI vs AI mode activated';
    setTimeout(() => {
      if (aiVsAi && gameActive) {
        messageEl.textContent = 'AI vs AI';
      }
    }, 2000);
  }, 500);
});
pvcBtn.addEventListener('mouseup', () => clearTimeout(longPressTimerAI));
pvcBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimerAI));
pvcBtn.addEventListener('click', (e) => {
  if (longPressTriggeredAI) {
    e.preventDefault();
    return;
  }
  startGame(true);
});

// Touch support for mobile
pvcBtn.addEventListener('touchstart', () => {
  longPressTriggeredAI = false;
  longPressTimerAI = setTimeout(() => {
    longPressTriggeredAI = true;
    startGame('ai-vs-ai');
    messageEl.textContent = 'AI vs AI mode activated';
    setTimeout(() => {
      if (aiVsAi && gameActive) {
        messageEl.textContent = 'AI vs AI';
      }
    }, 2000);
  }, 500);
});
pvcBtn.addEventListener('touchend', () => clearTimeout(longPressTimerAI));
pvcBtn.addEventListener('touchcancel', () => clearTimeout(longPressTimerAI));

restartBtn.addEventListener('click', () => resetGame());
reverseBtn.addEventListener('click', () => reverseMove());

// Long press support for Help Me button
let longPressTimerHelp;
let longPressTriggeredHelp = false;
helpBtn.addEventListener('mousedown', () => {
  longPressTriggeredHelp = false;
  longPressTimerHelp = setTimeout(() => {
    longPressTriggeredHelp = true;
    // Long press: place stone at AI recommendation
    autoPlaceHint();
  }, 500);
});
helpBtn.addEventListener('mouseup', () => clearTimeout(longPressTimerHelp));
helpBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimerHelp));
helpBtn.addEventListener('click', (e) => {
  if (longPressTriggeredHelp) {
    e.preventDefault();
    return;
  }
  showHint();
});

// Touch support for mobile
helpBtn.addEventListener('touchstart', () => {
  longPressTriggeredHelp = false;
  longPressTimerHelp = setTimeout(() => {
    longPressTriggeredHelp = true;
    autoPlaceHint();
  }, 500);
});
helpBtn.addEventListener('touchend', () => clearTimeout(longPressTimerHelp));
helpBtn.addEventListener('touchcancel', () => clearTimeout(longPressTimerHelp));

pauseAiBtn.addEventListener('click', () => toggleAiVsAiPause());

// Long press support for theme button
let longPressTimerTheme;
let longPressTriggeredTheme = false;
themeBtn.addEventListener('mousedown', () => {
  longPressTriggeredTheme = false;
  longPressTimerTheme = setTimeout(() => {
    longPressTriggeredTheme = true;
    // Long press: reset to default theme (index 0)
    currentThemeIndex = 0;
    applyCurrentTheme();
    messageEl.textContent = 'Theme reset to default (Wood)';
    setTimeout(() => {
      if (!gameActive) {
        messageEl.textContent = '';
      }
    }, 2000);
  }, 500);
});
themeBtn.addEventListener('mouseup', () => clearTimeout(longPressTimerTheme));
themeBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimerTheme));
themeBtn.addEventListener('click', (e) => {
  if (longPressTriggeredTheme) {
    e.preventDefault();
    return;
  }
  changeTheme();
});

// Touch support for mobile
themeBtn.addEventListener('touchstart', () => {
  longPressTriggeredTheme = false;
  longPressTimerTheme = setTimeout(() => {
    longPressTriggeredTheme = true;
    currentThemeIndex = 0;
    applyCurrentTheme();
    messageEl.textContent = 'Theme reset to default (Wood)';
    setTimeout(() => {
      if (!gameActive) {
        messageEl.textContent = '';
      }
    }, 2000);
  }, 500);
});
themeBtn.addEventListener('touchend', () => clearTimeout(longPressTimerTheme));
themeBtn.addEventListener('touchcancel', () => clearTimeout(longPressTimerTheme));

// Long press support for size-up button
let longPressTimer;
let longPressTriggered = false;
sizeUpBtn.addEventListener('mousedown', () => {
  longPressTriggered = false;
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    // Long press: set to max size 25x25 and maximize
    boardSize = 25;
    resetBoard();
    if (!isMaximized) toggleMaximize();
    messageEl.textContent = 'Board size set to maximum (25x25) and maximized';
    setTimeout(() => {
      if (!gameActive) {
        messageEl.textContent = '';
      }
    }, 2000);
  }, 500); // 500ms to trigger long press
});
sizeUpBtn.addEventListener('mouseup', () => clearTimeout(longPressTimer));
sizeUpBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
sizeUpBtn.addEventListener('click', (e) => {
  if (longPressTriggered) {
    e.preventDefault();
    return;
  }
  changeBoardSize(1);
});

// Touch support for mobile
sizeUpBtn.addEventListener('touchstart', () => {
  longPressTriggered = false;
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    boardSize = 25;
    resetBoard();
    if (!isMaximized) toggleMaximize();
    messageEl.textContent = 'Board size set to maximum (25x25) and maximized';
    setTimeout(() => {
      if (!gameActive) {
        messageEl.textContent = '';
      }
    }, 2000);
  }, 500);
});
sizeUpBtn.addEventListener('touchend', () => clearTimeout(longPressTimer));
sizeUpBtn.addEventListener('touchcancel', () => clearTimeout(longPressTimer));

sizeDownBtn.addEventListener('click', (e) => {
  if (longPressTriggeredDown) {
    e.preventDefault();
    return;
  }
  changeBoardSize(-1);
});

// Long press support for size-down button
let longPressTimerDown;
let longPressTriggeredDown = false;
sizeDownBtn.addEventListener('mousedown', () => {
  longPressTriggeredDown = false;
  longPressTimerDown = setTimeout(() => {
    longPressTriggeredDown = true;
    // Long press: set to default size 15x15
    boardSize = 15;
    resetBoard();
    messageEl.textContent = 'Board size reset to default (15x15)';
    setTimeout(() => {
      if (!gameActive) {
        messageEl.textContent = '';
      }
    }, 2000);
  }, 500);
});
sizeDownBtn.addEventListener('mouseup', () => clearTimeout(longPressTimerDown));
sizeDownBtn.addEventListener('mouseleave', () => clearTimeout(longPressTimerDown));

// Touch support for mobile
sizeDownBtn.addEventListener('touchstart', () => {
  longPressTriggeredDown = false;
  longPressTimerDown = setTimeout(() => {
    longPressTriggeredDown = true;
    boardSize = 15;
    resetBoard();
    messageEl.textContent = 'Board size reset to default (15x15)';
    setTimeout(() => {
      if (!gameActive) {
        messageEl.textContent = '';
      }
    }, 2000);
  }, 500);
});
sizeDownBtn.addEventListener('touchend', () => clearTimeout(longPressTimerDown));
sizeDownBtn.addEventListener('touchcancel', () => clearTimeout(longPressTimerDown));

maximizeBtn.addEventListener('click', () => toggleMaximize());

// Keyboard shortcut: Press 'f' to toggle maximize mode
document.addEventListener('keydown', (event) => {
  // Press 'f' to toggle maximize
  if (event.key === 'f' || event.key === 'F') {
    toggleMaximize();
  }
  // Press 'h' to show hint (only when no modifier keys)
  if ((event.key === 'h' || event.key === 'H') && !event.ctrlKey && !event.metaKey) {
    showHint();
  }
  // Press Ctrl+H (Windows/Linux) or Command+H (Mac) to auto-place hint
  if ((event.ctrlKey || event.metaKey) && (event.key === 'h' || event.key === 'H')) {
    event.preventDefault(); // Prevent browser's default behavior (Command+H hides window on Mac)
    event.stopPropagation();
    autoPlaceHint();
  }
  // Press Ctrl+Z (Windows/Linux) or Command+Z (Mac) to undo
  if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
    event.preventDefault(); // Prevent browser's default undo behavior
    event.stopPropagation();
    reverseMove();
  }
});

function toggleMaximize() {
  isMaximized = !isMaximized;
  if (isMaximized) {
    containerEl.classList.add('maximized');
  } else {
    containerEl.classList.remove('maximized');
  }
  
  // Force complete board re-render immediately
  const currentBoard = board.map(row => [...row]); // Save current state
  boardContainer.innerHTML = ''; // Clear board
  
  // Recreate all cells
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if ((r + c) % 2 === 1) cell.classList.add('dark');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', handleCellClick);
      boardContainer.appendChild(cell);
      
      // Restore stone if it existed
      if (currentBoard[r][c]) {
        const stone = document.createElement('div');
        stone.classList.add('stone', currentBoard[r][c]);
        cell.appendChild(stone);
      }
    }
  }
  
  // Reapply theme
  applyCurrentTheme();
}

// Show initial page with empty board
resetBoard();

function startGame(computerMode) {
  // Handle AI vs AI mode
  if (computerMode === 'ai-vs-ai') {
    vsComputer = false;
    aiVsAi = true;
    previousMode = 'ai-vs-ai';
  } else {
    vsComputer = computerMode;
    aiVsAi = false;
    previousMode = computerMode;
  }
  
  document.getElementById('mode-buttons').classList.add('hidden');
  boardContainer.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
  reverseBtn.classList.remove('hidden');
  helpBtn.classList.remove('hidden');
  
  // Move maximize button to game-buttons (after Help Me)
  document.getElementById('game-buttons').appendChild(maximizeBtn);
  
  resetBoard();
  gameActive = true;
  currentPlayer = 'black';
  moveHistory = []; // Clear move history
  
  // Update title and page title based on mode
  if (aiVsAi) {
    messageEl.textContent = 'AI vs AI';
    titleEl.textContent = 'Gomoku 五子棋 - AI vs AI';
    document.title = 'Gomoku 五子棋 - AI vs AI';
    aiVsAiPaused = false;
    pauseAiBtn.classList.remove('hidden');
    pauseAiBtn.textContent = 'Pause AI';
    // Start AI vs AI game
    setTimeout(() => makeAiVsAiMove(), 500);
  } else if (vsComputer) {
    messageEl.textContent = 'Your turn';
    titleEl.textContent = 'Gomoku 五子棋 - AI Mode';
    document.title = 'Gomoku 五子棋 - AI Mode';
    pauseAiBtn.classList.add('hidden');
  } else {
    messageEl.textContent = 'Black starts';
    titleEl.textContent = 'Gomoku 五子棋 - PvP';
    document.title = 'Gomoku 五子棋 - PvP';
    pauseAiBtn.classList.add('hidden');
  }
}

function resetBoard() {
  board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  boardContainer.innerHTML = '';
  boardContainer.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
  boardContainer.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if ((r + c) % 2 === 1) cell.classList.add('dark');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', handleCellClick);
      boardContainer.appendChild(cell);
    }
  }
  // Apply current theme colors
  applyCurrentTheme();
}

function resetGame() {
  document.getElementById('mode-buttons').classList.remove('hidden');
  boardContainer.classList.remove('hidden');
  restartBtn.classList.add('hidden');
  reverseBtn.classList.add('hidden');
  helpBtn.classList.add('hidden');
  pauseAiBtn.classList.add('hidden');
  
  // Move maximize button back to mode-buttons (after Size +)
  document.getElementById('mode-buttons').appendChild(maximizeBtn);
  
  messageEl.textContent = '';
  gameActive = false;
  aiVsAi = false; // Reset AI vs AI mode
  aiVsAiPaused = false;
  moveHistory = []; // Clear move history
  // Clear and render an empty board
  resetBoard();
  
  // Reset title and page title to default
  titleEl.textContent = 'Gomoku 五子棋';
  document.title = 'Gomoku 五子棋';
}

function handleCellClick(event) {
  // In AI vs AI mode when paused, allow user to continue as AI mode
  if (aiVsAi && aiVsAiPaused) {
    // Switch to AI mode
    aiVsAi = false;
    vsComputer = true;
    aiVsAiPaused = false;
    previousMode = true;
    pauseAiBtn.classList.add('hidden');
    titleEl.textContent = 'Gomoku 五子棋 - AI Mode';
    document.title = 'Gomoku 五子棋 - AI Mode';
    
    // If it's AI's turn (white), make AI move, otherwise wait for user
    if (currentPlayer === 'white') {
      messageEl.textContent = 'AI thinking...';
      setTimeout(() => {
        const [aiRow, aiCol] = chooseAIMove();
        placeStone(aiRow, aiCol, 'white');
        if (checkWin(aiRow, aiCol, 'white')) {
          endGame('Computer wins!');
          return;
        }
        if (isBoardFull()) {
          endGame("It's a draw!");
          return;
        }
        currentPlayer = 'black';
        messageEl.textContent = 'Your turn';
      }, 200);
    } else {
      messageEl.textContent = 'Your turn';
    }
    return;
  }
  
  // Don't allow manual clicks in AI vs AI mode when not paused
  if (aiVsAi) return;
  
  const row = parseInt(event.currentTarget.dataset.row);
  const col = parseInt(event.currentTarget.dataset.col);
  
  // If game not active, start with previous mode (or PvP if first time)
  if (!gameActive) {
    startGame(previousMode);
  }
  
  // Check if cell is already occupied
  if (board[row][col] !== null) return;
  
  placeStone(row, col, currentPlayer);
  if (checkWin(row, col, currentPlayer)) {
    endGame(currentPlayer === 'black' ? 'Black wins!' : vsComputer ? 'You win!' : 'White wins!');
    return;
  }
  if (isBoardFull()) {
    endGame("It's a draw!");
    return;
  }
  currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
  if (vsComputer && currentPlayer === 'white') {
    messageEl.textContent = 'AI thinking...';
    setTimeout(() => {
      const [aiRow, aiCol] = chooseAIMove();
      placeStone(aiRow, aiCol, 'white');
      if (checkWin(aiRow, aiCol, 'white')) {
        endGame('Computer wins!');
        return;
      }
      if (isBoardFull()) {
        endGame("It's a draw!");
        return;
      }
      currentPlayer = 'black';
      messageEl.textContent = 'Your turn';
    }, 200);
  } else {
    messageEl.textContent = currentPlayer === 'black' ? "Black's turn" : "White's turn";
  }
}

// Function to handle AI vs AI gameplay
function makeAiVsAiMove() {
  if (!gameActive || !aiVsAi || aiVsAiPaused) return;
  
  messageEl.textContent = `${currentPlayer === 'black' ? 'Black' : 'White'} AI thinking...`;
  
  setTimeout(() => {
    // Check again in case paused during timeout
    if (!gameActive || !aiVsAi || aiVsAiPaused) return;
    
    const [aiRow, aiCol] = chooseAIMove();
    placeStone(aiRow, aiCol, currentPlayer);
    
    if (checkWin(aiRow, aiCol, currentPlayer)) {
      endGame(`${currentPlayer === 'black' ? 'Black' : 'White'} AI wins!`);
      return;
    }
    
    if (isBoardFull()) {
      endGame("It's a draw!");
      return;
    }
    
    // Switch player and continue
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    makeAiVsAiMove();
  }, 500);
}

function toggleAiVsAiPause() {
  if (!aiVsAi) return;
  
  aiVsAiPaused = !aiVsAiPaused;
  
  if (aiVsAiPaused) {
    pauseAiBtn.textContent = 'Continue';
    messageEl.textContent = 'AI vs AI paused - Click board to continue as AI Mode';
  } else {
    pauseAiBtn.textContent = 'Pause AI';
    messageEl.textContent = 'AI vs AI resumed';
    // Resume AI vs AI
    setTimeout(() => makeAiVsAiMove(), 500);
  }
}

function placeStone(row, col, player) {
  // Remove any existing hint
  const existingHint = document.querySelector('.hint-indicator');
  if (existingHint) {
    existingHint.remove();
  }
  
  board[row][col] = player;
  const cell = boardContainer.children[row * boardSize + col];
  const stone = document.createElement('div');
  stone.classList.add('stone', player);
  cell.appendChild(stone);
  
  // Add to move history
  moveHistory.push({ row, col, player });
  
  playClickSound();
}

function endGame(text) {
  gameActive = false;
  messageEl.textContent = text;
  showFireworks(text);
}

function checkWin(row, col, player) {
  return (
    countConsecutive(row, col, 0, 1, player) + countConsecutive(row, col, 0, -1, player) - 1 >= 5 ||
    countConsecutive(row, col, 1, 0, player) + countConsecutive(row, col, -1, 0, player) - 1 >= 5 ||
    countConsecutive(row, col, 1, 1, player) + countConsecutive(row, col, -1, -1, player) - 1 >= 5 ||
    countConsecutive(row, col, 1, -1, player) + countConsecutive(row, col, -1, 1, player) - 1 >= 5
  );
}

function countConsecutive(row, col, dRow, dCol, player) {
  let count = 0;
  let r = row;
  let c = col;
  while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
    count++;
    r += dRow;
    c += dCol;
  }
  return count;
}

function chooseAIMove() {
  // Check for immediate win
  let move = findWinningMove('white');
  if (move) return move;
  
  // Block opponent's winning move
  move = findWinningMove('black');
  if (move) return move;
  
  // Use Minimax with Alpha-Beta pruning for strategic moves
  return findBestMoveWithMinimax();
}

function findBestMoveWithMinimax() {
  const candidates = getCandidateMoves();
  
  // If board is empty or nearly empty, play near center
  if (candidates.length > boardSize * boardSize - 3) {
    const center = Math.floor(boardSize / 2);
    if (board[center][center] === null) return [center, center];
    // Try positions near center
    const nearCenter = [
      [center - 1, center], [center + 1, center],
      [center, center - 1], [center, center + 1],
      [center - 1, center - 1], [center + 1, center + 1],
      [center - 1, center + 1], [center + 1, center - 1]
    ];
    for (let [r, c] of nearCenter) {
      if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
        return [r, c];
      }
    }
  }
  
  // Determine search depth based on game state (early vs late game)
  const emptyCount = candidates.length;
  let depth;
  if (emptyCount > 200) {
    depth = 4; // Early game - deeper search
  } else if (emptyCount > 100) {
    depth = 5; // Mid game - even deeper
  } else {
    depth = 6; // Late game - deepest search
  }
  
  let bestScore = -Infinity;
  let bestMove = candidates[0];
  
  // Evaluate more candidates for better moves
  const topCandidates = candidates.slice(0, Math.min(20, candidates.length));
  
  // Show thinking message
  messageEl.textContent = 'Computer is thinking...';
  
  for (let [r, c] of topCandidates) {
    board[r][c] = 'white';
    const score = minimax(depth - 1, -Infinity, Infinity, false);
    board[r][c] = null;
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }
  
  return bestMove;
}

function minimax(depth, alpha, beta, isMaximizing) {
  // Check for terminal states
  const whiteWin = checkBoardWin('white');
  const blackWin = checkBoardWin('black');
  
  if (whiteWin) return 100000 + depth; // Prefer faster wins
  if (blackWin) return -100000 - depth; // Prefer slower losses
  if (depth === 0 || isBoardFull()) {
    return evaluateBoardState();
  }
  
  // Expand branching factor for deeper analysis
  const candidates = getCandidateMoves().slice(0, 15); // More candidates per level
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (let [r, c] of candidates) {
      board[r][c] = 'white';
      const score = minimax(depth - 1, alpha, beta, false);
      board[r][c] = null;
      
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (let [r, c] of candidates) {
      board[r][c] = 'black';
      const score = minimax(depth - 1, alpha, beta, true);
      board[r][c] = null;
      
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minScore;
  }
}

function checkBoardWin(player) {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === player && checkWin(r, c, player)) {
        return true;
      }
    }
  }
  return false;
}

function evaluateBoardState() {
  let score = 0;
  
  // Evaluate all positions on the board with pattern detection
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === 'white') {
        score += evaluatePositionScore(r, c, 'white');
      } else if (board[r][c] === 'black') {
        score -= evaluatePositionScore(r, c, 'black') * 1.05; // Slightly favor defense
      }
    }
  }
  
  // Add strategic bonuses
  score += evaluateStrategicPatterns('white') - evaluateStrategicPatterns('black') * 1.05;
  
  return score;
}

function evaluateStrategicPatterns(player) {
  let score = 0;
  const opponent = player === 'white' ? 'black' : 'white';
  
  // Detect multiple threats (forcing moves)
  let threeCount = 0;
  let openThreeCount = 0;
  
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let [dRow, dCol] of directions) {
          const count = countConsecutive(r, c, dRow, dCol, player) + 
                        countConsecutive(r, c, -dRow, -dCol, player) - 1;
          
          if (count === 3) {
            const open1 = isOpen(r, c, dRow, dCol, player);
            const open2 = isOpen(r, c, -dRow, -dCol, player);
            if (open1 && open2) {
              openThreeCount++;
            }
            threeCount++;
          }
        }
      }
    }
  }
  
  // Multiple open threes is very strong (double threat)
  if (openThreeCount >= 2) score += 3000;
  if (threeCount >= 3) score += 1000;
  
  return score;
}

function evaluatePositionScore(row, col, player) {
  let score = 0;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  
  for (let [dRow, dCol] of directions) {
    const count = countConsecutive(row, col, dRow, dCol, player) + 
                  countConsecutive(row, col, -dRow, -dCol, player) - 1;
    
    if (count >= 5) {
      score += 100000;
    } else if (count === 4) {
      const open1 = isOpen(row, col, dRow, dCol, player);
      const open2 = isOpen(row, col, -dRow, -dCol, player);
      // Heavily favor open four (guaranteed win)
      score += (open1 && open2) ? 10000 : (open1 || open2) ? 2000 : 150;
    } else if (count === 3) {
      const open1 = isOpen(row, col, dRow, dCol, player);
      const open2 = isOpen(row, col, -dRow, -dCol, player);
      // Open three on both sides is very strong
      score += (open1 && open2) ? 800 : (open1 || open2) ? 150 : 15;
    } else if (count === 2) {
      const open1 = isOpen(row, col, dRow, dCol, player);
      const open2 = isOpen(row, col, -dRow, -dCol, player);
      score += (open1 && open2) ? 50 : 5;
    } else {
      score += 1;
    }
  }
  
  return score;
}

function findBestMove() {
  let bestScore = -Infinity;
  let bestMove = null;
  const candidates = getCandidateMoves();
  
  // If board is empty or nearly empty, play near center
  if (candidates.length > boardSize * boardSize - 3) {
    const center = Math.floor(boardSize / 2);
    if (board[center][center] === null) return [center, center];
    // Try positions near center
    const nearCenter = [
      [center - 1, center], [center + 1, center],
      [center, center - 1], [center, center + 1],
      [center - 1, center - 1], [center + 1, center + 1],
      [center - 1, center + 1], [center + 1, center - 1]
    ];
    for (let [r, c] of nearCenter) {
      if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null) {
        return [r, c];
      }
    }
  }
  
  // Evaluate top candidates
  for (let [r, c] of candidates.slice(0, Math.min(10, candidates.length))) {
    const score = evaluatePosition(r, c, 'white') + evaluatePosition(r, c, 'black') * 1.1;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }
  
  return bestMove || candidates[0];
}

function getCandidateMoves() {
  const moves = [];
  const scored = [];
  
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null && hasNeighbor(r, c, 2)) {
        const score = evaluatePosition(r, c, 'white') + evaluatePosition(r, c, 'black');
        scored.push({ move: [r, c], score });
      }
    }
  }
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  if (scored.length > 0) {
    return scored.map(s => s.move);
  }
  
  // Fallback: return all empty positions
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null) moves.push([r, c]);
    }
  }
  return moves;
}

function evaluatePosition(row, col, player) {
  board[row][col] = player;
  let score = 0;
  
  // Check all directions
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  
  for (let [dRow, dCol] of directions) {
    const count = countConsecutive(row, col, dRow, dCol, player) + 
                  countConsecutive(row, col, -dRow, -dCol, player) - 1;
    
    if (count >= 5) {
      score += 100000; // Winning move
    } else if (count === 4) {
      // Check if open on both ends
      const open1 = isOpen(row, col, dRow, dCol, player);
      const open2 = isOpen(row, col, -dRow, -dCol, player);
      score += (open1 && open2) ? 10000 : 5000;
    } else if (count === 3) {
      const open1 = isOpen(row, col, dRow, dCol, player);
      const open2 = isOpen(row, col, -dRow, -dCol, player);
      score += (open1 && open2) ? 1000 : 500;
    } else if (count === 2) {
      const open1 = isOpen(row, col, dRow, dCol, player);
      const open2 = isOpen(row, col, -dRow, -dCol, player);
      score += (open1 && open2) ? 100 : 50;
    } else {
      score += 10;
    }
  }
  
  board[row][col] = null;
  return score;
}

function isOpen(row, col, dRow, dCol, player) {
  let r = row;
  let c = col;
  
  // Move to the end of consecutive stones
  while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
    r += dRow;
    c += dCol;
  }
  
  // Check if the next position is empty
  return r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === null;
}

function findWinningMove(player) {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null) {
        board[r][c] = player;
        if (checkWin(r, c, player)) {
          board[r][c] = null;
          return [r, c];
        }
        board[r][c] = null;
      }
    }
  }
  return null;
}

function hasNeighbor(r, c, distance) {
  for (let dr = -distance; dr <= distance; dr++) {
    for (let dc = -distance; dc <= distance; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && board[nr][nc] !== null) {
        return true;
      }
    }
  }
  return false;
}

function isBoardFull() {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

function changeTheme() {
  // Pick a random theme different from current
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * themes.length);
  } while (newIndex === currentThemeIndex && themes.length > 1);
  
  currentThemeIndex = newIndex;
  applyCurrentTheme();
  
  // Display theme name
  messageEl.textContent = `Theme: ${themeNames[currentThemeIndex]}`;
  setTimeout(() => {
    if (!gameActive) {
      messageEl.textContent = '';
    }
  }, 2000);
}

function applyCurrentTheme() {
  const [bg, light, dark] = themes[currentThemeIndex];
  
  // Update CSS custom properties
  boardContainer.style.backgroundColor = bg;
  
  // Update all cells while preserving stones
  const cells = boardContainer.querySelectorAll('.cell');
  cells.forEach((cell, index) => {
    const row = Math.floor(index / boardSize);
    const col = index % boardSize;
    if ((row + col) % 2 === 1) {
      cell.style.backgroundColor = dark;
    } else {
      cell.style.backgroundColor = light;
    }
  });
}

function changeBoardSize(delta) {
  const newSize = boardSize + delta;
  
  if (newSize < 5 || newSize > 25) {
    messageEl.textContent = `Board size must be between 5 and 25 (current: ${boardSize})`;
    setTimeout(() => {
      messageEl.textContent = '';
    }, 2000);
    return;
  }
  
  boardSize = newSize;
  resetBoard();
  messageEl.textContent = `Board size changed to ${boardSize}x${boardSize}`;
  setTimeout(() => {
    messageEl.textContent = '';
  }, 2000);
}

function reverseMove() {
  if (!gameActive || moveHistory.length === 0) {
    return;
  }
  
  // In AI mode, undo both AI and player moves
  const movesToUndo = vsComputer && currentPlayer === 'black' && moveHistory.length >= 2 ? 2 : 1;
  
  for (let i = 0; i < movesToUndo && moveHistory.length > 0; i++) {
    const lastMove = moveHistory.pop();
    
    // Remove stone from board
    board[lastMove.row][lastMove.col] = null;
    
    // Remove stone from UI
    const cell = boardContainer.children[lastMove.row * boardSize + lastMove.col];
    const stone = cell.querySelector('.stone');
    if (stone) {
      cell.removeChild(stone);
    }
    
    // Update current player
    currentPlayer = lastMove.player;
  }
  
  // Update message
  if (vsComputer) {
    messageEl.textContent = 'Your turn';
  } else {
    messageEl.textContent = currentPlayer === 'black' ? "Black's turn" : "White's turn";
  }
}

function showHint() {
  if (!gameActive) return;
  
  // Don't show hint during AI's turn
  if (vsComputer && currentPlayer === 'white') {
    messageEl.textContent = "Wait for computer's turn";
    setTimeout(() => {
      if (gameActive) {
        messageEl.textContent = 'Your turn';
      }
    }, 1000);
    return;
  }
  
  // Remove any existing hint
  const existingHint = document.querySelector('.hint-indicator');
  if (existingHint) {
    existingHint.remove();
  }

  // Show thinking message before AI calculation
  messageEl.textContent = 'AI is thinking...';

  // Use setTimeout to allow UI update before heavy calculation
  setTimeout(() => {
    // Get best move using advanced AI evaluation (same as AI mode)
    const bestMove = chooseAIMove();
    if (!bestMove) return;

    const [row, col] = bestMove;
    const cell = boardContainer.children[row * boardSize + col];

    // Add hint indicator
    const hint = document.createElement('div');
    hint.classList.add('hint-indicator');
    cell.appendChild(hint);

    // Remove hint after 3 seconds
    setTimeout(() => {
      hint.remove();
    }, 3000);

    messageEl.textContent = 'Hint shown for 3 seconds';
    setTimeout(() => {
      if (gameActive) {
        messageEl.textContent = vsComputer ? 'Your turn' : 
          (currentPlayer === 'black' ? "Black's turn" : "White's turn");
      }
    }, 3000);
  }, 10);
}

function autoPlaceHint() {
  if (!gameActive) return;
  
  // Don't allow during AI's turn
  if (vsComputer && currentPlayer === 'white') {
    messageEl.textContent = "Wait for computer's turn";
    setTimeout(() => {
      if (gameActive) {
        messageEl.textContent = 'Your turn';
      }
    }, 1000);
    return;
  }
  
  // Don't allow in AI vs AI mode
  if (aiVsAi) return;
  
  // Get best move using advanced AI evaluation (same as AI mode)
  const bestMove = chooseAIMove();
  if (!bestMove) return;
  
  const [row, col] = bestMove;
  
  // Check if cell is already occupied
  if (board[row][col] !== null) return;
  
  // Remove any existing hint
  const existingHint = document.querySelector('.hint-indicator');
  if (existingHint) {
    existingHint.remove();
  }
  
  // Place stone at recommended position
  placeStone(row, col, currentPlayer);
  messageEl.textContent = 'AI recommendation placed';
  
  if (checkWin(row, col, currentPlayer)) {
    endGame(currentPlayer === 'black' ? 'Black wins!' : vsComputer ? 'You win!' : 'White wins!');
    return;
  }
  if (isBoardFull()) {
    endGame("It's a draw!");
    return;
  }
  
  currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
  
  if (vsComputer && currentPlayer === 'white') {
    messageEl.textContent = 'AI is thinking...';
    setTimeout(() => {
      const [aiRow, aiCol] = chooseAIMove();
      placeStone(aiRow, aiCol, 'white');
      if (checkWin(aiRow, aiCol, 'white')) {
        endGame('Computer wins!');
        return;
      }
      if (isBoardFull()) {
        endGame("It's a draw!");
        return;
      }
      currentPlayer = 'black';
      messageEl.textContent = 'Your turn';
    }, 200);
  } else {
    setTimeout(() => {
      if (gameActive) {
        messageEl.textContent = currentPlayer === 'black' ? "Black's turn" : "White's turn";
      }
    }, 2000);
  }
}

// Fireworks animation
function showFireworks(victoryText) {
  // Show victory message
  victoryMessageEl.textContent = victoryText;
  victoryMessageEl.classList.add('active');
  
  fireworksCanvas.width = window.innerWidth;
  fireworksCanvas.height = window.innerHeight;
  fireworksCanvas.classList.add('active');
  
  const particles = [];
  const particleCount = 100;
  const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff', '#ff1493'];
  
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 10;
      this.vy = (Math.random() - 0.5) * 10;
      this.alpha = 1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.size = Math.random() * 3 + 2;
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.2; // gravity
      this.alpha -= 0.01;
    }
    
    draw() {
      fireworksCtx.save();
      fireworksCtx.globalAlpha = this.alpha;
      fireworksCtx.fillStyle = this.color;
      fireworksCtx.beginPath();
      fireworksCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      fireworksCtx.fill();
      fireworksCtx.restore();
    }
  }
  
  // Create multiple firework bursts
  function createBurst(x, y) {
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(x, y));
    }
  }
  
  // Create several bursts
  createBurst(window.innerWidth * 0.3, window.innerHeight * 0.3);
  setTimeout(() => createBurst(window.innerWidth * 0.7, window.innerHeight * 0.4), 300);
  setTimeout(() => createBurst(window.innerWidth * 0.5, window.innerHeight * 0.25), 600);
  setTimeout(() => createBurst(window.innerWidth * 0.4, window.innerHeight * 0.5), 900);
  setTimeout(() => createBurst(window.innerWidth * 0.6, window.innerHeight * 0.35), 1200);
  
  function animate() {
    fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      
      if (particles[i].alpha <= 0) {
        particles.splice(i, 1);
      }
    }
    
    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      fireworksCanvas.classList.remove('active');
    }
  }
  
  animate();
  
  // Hide after 3 seconds
  setTimeout(() => {
    fireworksCanvas.classList.remove('active');
    victoryMessageEl.classList.remove('active');
    particles.length = 0;
  }, 3000);
}
