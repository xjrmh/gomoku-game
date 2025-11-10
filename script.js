// Simplified Gomoku game implementation
let boardSize = 15;
let board = [];
let currentPlayer = 'black';
let gameActive = false;
let vsComputer = false;

const boardContainer = document.getElementById('board');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');
const pvpBtn = document.getElementById('pvp-btn');
const pvcBtn = document.getElementById('pvc-btn');
const themeBtn = document.getElementById('theme-btn');
const sizeUpBtn = document.getElementById('size-up-btn');
const sizeDownBtn = document.getElementById('size-down-btn');

// Theme colors: [background, light cell, dark cell]
const themes = [
  ['#8B4513', '#DEB887', '#D2A679'], // Traditional wood
  ['#2C5F2D', '#97BC62', '#85A956'], // Green
  ['#1E3A8A', '#60A5FA', '#3B82F6'], // Blue
  ['#7C2D12', '#FCA5A5', '#F87171'], // Red
  ['#4C1D95', '#C4B5FD', '#A78BFA'], // Purple
  ['#064E3B', '#6EE7B7', '#34D399'], // Teal
  ['#78350F', '#FCD34D', '#FBBF24'], // Amber
  ['#1F2937', '#9CA3AF', '#6B7280'], // Gray
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
themeBtn.addEventListener('click', () => changeTheme());
sizeUpBtn.addEventListener('click', () => changeBoardSize(1));
sizeDownBtn.addEventListener('click', () => changeBoardSize(-1));

// Show initial page with empty board
resetBoard();

function startGame(computerMode) {
  vsComputer = computerMode;
  document.getElementById('mode-buttons').classList.add('hidden');
  boardContainer.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
  resetBoard();
  gameActive = true;
  currentPlayer = 'black';
  messageEl.textContent = vsComputer ? 'Your turn' : 'Black starts';
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
  messageEl.textContent = '';
  gameActive = false;
  // Clear and render an empty board
  resetBoard();
}

function handleCellClick(event) {
  // If game not active, start in PvP mode automatically
  if (!gameActive) {
    startGame(false);
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
  board[row][col] = player;
  const cell = boardContainer.children[row * boardSize + col];
  const stone = document.createElement('div');
  stone.classList.add('stone', player);
  cell.appendChild(stone);
  playClickSound();
}

function endGame(text) {
  gameActive = false;
  messageEl.textContent = text;
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
  let move = findWinningMove('white');
  if (move) return move;
  move = findWinningMove('black');
  if (move) return move;
  const candidates = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null && hasNeighbor(r, c, 2)) candidates.push([r, c]);
    }
  }
  if (candidates.length) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  const empties = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === null) empties.push([r, c]);
    }
  }
  return empties[Math.floor(Math.random() * empties.length)];
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
