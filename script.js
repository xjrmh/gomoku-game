// Simplified Gomoku game implementation
const boardSize = 15;
let board = [];
let currentPlayer = 'black';
let gameActive = false;
let vsComputer = false;

const boardContainer = document.getElementById('board');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');
const pvpBtn = document.getElementById('pvp-btn');
const pvcBtn = document.getElementById('pvc-btn');

pvpBtn.addEventListener('click', () => startGame(false));
pvcBtn.addEventListener('click', () => startGame(true));
restartBtn.addEventListener('click', () => resetGame());

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
  boardContainer.style.gridTemplateColumns = 'repeat(' + boardSize + ', 1fr)';
  boardContainer.style.gridTemplateRows = 'repeat(' + boardSize + ', 1fr)';
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
}

function resetGame() {
  document.getElementById('mode-buttons').classList.remove('hidden');
  boardContainer.classList.add('hidden');
  restartBtn.classList.add('hidden');
  messageEl.textContent = '';
  gameActive = false;
}

function handleCellClick(event) {
  if (!gameActive) return;
  const row = parseInt(event.currentTarget.dataset.row);
  const col = parseInt(event.currentTarget.dataset.col);
  if (board[row][col] !== null) return;
  placeStone(row, col, currentPlayer);
  if (checkWin(row, col, currentPlayer)) {
    endGame(currentPlayer === 'black' ? 'Black wins!' : vsComputer ? 'You win!' : 'White wins!');
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
