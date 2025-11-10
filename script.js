// Simplified Gomoku game implementation
let boardSize = 15;
let board = [];
let currentPlayer = 'black';
let gameActive = false;
let vsComputer = false;
let previousMode = false; // Track previous mode (false = PvP, true = vs Computer)
let moveHistory = []; // Track move history for undo

const boardContainer = document.getElementById('board');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');
const reverseBtn = document.getElementById('reverse-btn');
const helpBtn = document.getElementById('help-btn');
const pvpBtn = document.getElementById('pvp-btn');
const pvcBtn = document.getElementById('pvc-btn');
const themeBtn = document.getElementById('theme-btn');
const sizeUpBtn = document.getElementById('size-up-btn');
const sizeDownBtn = document.getElementById('size-down-btn');
const titleEl = document.querySelector('h1');
const fireworksCanvas = document.getElementById('fireworks');
const fireworksCtx = fireworksCanvas.getContext('2d');
const victoryMessageEl = document.getElementById('victory-message');

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
pvcBtn.addEventListener('click', () => startGame(true));
restartBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to restart the game?')) {
    resetGame();
  }
});
reverseBtn.addEventListener('click', () => reverseMove());
helpBtn.addEventListener('click', () => showHint());
themeBtn.addEventListener('click', () => changeTheme());
sizeUpBtn.addEventListener('click', () => changeBoardSize(1));
sizeDownBtn.addEventListener('click', () => changeBoardSize(-1));

// Show initial page with empty board
resetBoard();

function startGame(computerMode) {
  vsComputer = computerMode;
  previousMode = computerMode; // Save the mode
  document.getElementById('mode-buttons').classList.add('hidden');
  boardContainer.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
  reverseBtn.classList.remove('hidden');
  helpBtn.classList.remove('hidden');
  resetBoard();
  gameActive = true;
  currentPlayer = 'black';
  moveHistory = []; // Clear move history
  messageEl.textContent = vsComputer ? 'Your turn' : 'Black starts';
  
  // Keep title consistent - don't change it
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
  messageEl.textContent = '';
  gameActive = false;
  moveHistory = []; // Clear move history
  // Clear and render an empty board
  resetBoard();
  
  // Keep title consistent - don't change it
}

function handleCellClick(event) {
  // If game not active, start with previous mode (or PvP if first time)
  if (!gameActive) {
    startGame(previousMode);
  }
  
  if (!gameActive) return;
  const row = parseInt(event.currentTarget.dataset.row);
  const col = parseInt(event.currentTarget.dataset.col);
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
  
  // Use advanced evaluation for strategic moves
  return findBestMove();
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
      // Update hover color
      cell.dataset.hoverColor = getHoverColor(dark);
    } else {
      cell.style.backgroundColor = light;
      // Update hover color
      cell.dataset.hoverColor = getHoverColor(light);
    }
  });
}

function getHoverColor(color) {
  // Darken the color slightly for hover effect
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
  
  // Remove any existing hint
  const existingHint = document.querySelector('.hint-indicator');
  if (existingHint) {
    existingHint.remove();
  }
  
  // Get best move using AI evaluation
  const bestMove = findBestMove();
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
