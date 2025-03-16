// Game configuration
const GRID_SIZE = 6;
const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;
const COLORS = ['blue', 'red', 'green', 'yellow', 'purple'];
const DIRECTIONS = [
    { row: -1, col: 0 }, // Up
    { row: 1, col: 0 },  // Down
    { row: 0, col: -1 }, // Left
    { row: 0, col: 1 }   // Right
];

// DOM Elements
const gameBoard = document.getElementById('game-board');
const resetButton = document.getElementById('reset-btn');
const startGameBtn = document.getElementById('start-game-btn');
const currentPlayerName = document.getElementById('current-player-name');
const playerNames = document.getElementById('player-names');
const gameMessage = document.getElementById('game-message');
const playerCountButtons = document.querySelectorAll('.player-count-btn');
const playerNameInputs = document.getElementById('player-name-inputs');

// Game state
let gameState = null;
let playersList = []; // To store the list of players in order
let cells = [];
let selectedPlayerCount = 2; // Default to 2 players
let playerNameFields = []; // To store references to name input fields
let currentPlayerIndex = 0; // Track the current player's index
let isProcessingExplosion = false; // Flag to prevent actions during explosions
let explosionQueue = []; // Queue to manage explosion chain reactions
let pendingAnimations = 0; // Counter for active animations

// Confetti animation functions
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let confettiAnimationId = null;
let particles = [];

// Initialize confetti canvas
function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

// Create confetti particles
function createConfettiParticles() {
    particles = [];
    const particleCount = 300; // Increased from 200 to 300
    // Brighter, more vivid neon colors
    const colors = ['#00f3ff', '#ff00ff', '#0dff00', '#ffff00', '#b700ff', '#ff9500', '#ffffff'];
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * confettiCanvas.width, // x-coordinate
            y: Math.random() * confettiCanvas.height - confettiCanvas.height, // start above canvas
            size: Math.random() * 20 + 15, // much bigger size (15-35 instead of 5-15)
            color: colors[Math.floor(Math.random() * colors.length)], // random color
            speed: Math.random() * 3 + 2, // falling speed
            rotation: Math.random() * 360, // initial rotation
            rotationSpeed: (Math.random() - 0.5) * 2, // rotation speed
            wobble: Math.random() * 10 // wobble amount
        });
    }
}

// Draw confetti
function drawConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    let stillActive = false;
    
    particles.forEach(particle => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation * Math.PI / 180);
        
        // Add shadow for glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 15;
        
        // Draw a rectangle for each particle - wider than before
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size / 1.5);
        
        // Update position for next frame
        particle.y += particle.speed;
        particle.x += Math.sin(particle.y / 30) * particle.wobble;
        particle.rotation += particle.rotationSpeed;
        
        // Check if particle is still on screen
        if (particle.y < confettiCanvas.height + particle.size) {
            stillActive = true;
        }
        
        ctx.restore();
    });
    
    // Continue animation if particles are still visible
    if (stillActive) {
        confettiAnimationId = requestAnimationFrame(drawConfetti);
    } else {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
    }
}

// Start confetti animation
function startConfetti() {
    // Resize canvas to match window
    resizeConfettiCanvas();
    
    // Create particles
    createConfettiParticles();
    
    // Start animation
    if (!confettiAnimationId) {
        confettiAnimationId = requestAnimationFrame(drawConfetti);
    }
}

// Stop confetti animation
function stopConfetti() {
    if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
    }
    // Clear the canvas
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// Show game over popup
function showGameOverPopup(message, winningColor) {
    const popup = document.getElementById('game-over-popup');
    const winnerMessage = document.getElementById('winner-message');
    const popupContent = document.querySelector('.popup-content');
    const popupResetBtn = document.getElementById('popup-reset-btn');
    
    // Set the winner message
    winnerMessage.textContent = message;
    
    // Update popup border color based on winning player's color
    if (winningColor) {
        const colorName = winningColor === 'red' ? 'pink' : winningColor;
        popupContent.style.borderColor = `var(--neon-${colorName})`;
        popupContent.style.boxShadow = `0 0 30px var(--neon-${colorName}), 0 0 50px var(--neon-${colorName})`;
    }
    
    // Display the popup
    popup.classList.remove('hidden');
    setTimeout(() => {
        popup.classList.add('show');
    }, 50);
    
    // Start confetti
    startConfetti();
    
    // Add event listener to the play again button
    popupResetBtn.addEventListener('click', () => {
        hideGameOverPopup();
        resetGame();
    });
}

// Hide game over popup
function hideGameOverPopup() {
    const popup = document.getElementById('game-over-popup');
    
    // Hide the popup
    popup.classList.remove('show');
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 300);
    
    // Stop confetti
    stopConfetti();
}

// Initialize the game board grid
function initializeBoard() {
    gameBoard.innerHTML = '';
    cells = [];
    
    // Create the grid lines first
    createGridLines();
    
    // Create the grid of cells
    for (let row = 0; row < GRID_SIZE; row++) {
        cells[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(row, col));
            gameBoard.appendChild(cell);
            cells[row][col] = cell;
        }
    }

    // Show welcome message
    showMessage("Welcome to Neon Connection! Select the number of players and enter your names to start.", "info");
}

// Create the neon grid lines
function createGridLines() {
    // Create horizontal grid lines
    for (let i = 1; i < GRID_SIZE; i++) {
        const horizontalLine = document.createElement('div');
        horizontalLine.className = 'grid-line horizontal-line';
        horizontalLine.style.top = `${(i * 100 / GRID_SIZE) + (8 / GRID_SIZE)}%`;
        gameBoard.appendChild(horizontalLine);
    }
    
    // Create vertical grid lines
    for (let i = 1; i < GRID_SIZE; i++) {
        const verticalLine = document.createElement('div');
        verticalLine.className = 'grid-line vertical-line';
        verticalLine.style.left = `${(i * 100 / GRID_SIZE) + (8 / GRID_SIZE)}%`;
        gameBoard.appendChild(verticalLine);
    }
}

// Initialize player count selection
function initPlayerCountSelection() {
    playerCountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove selected class from all buttons
            playerCountButtons.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked button
            btn.classList.add('selected');
            
            // Update selected player count
            selectedPlayerCount = parseInt(btn.dataset.count);
            
            // Update player name input fields
            createPlayerNameInputs(selectedPlayerCount);
            
            showMessage(`Game will start with ${selectedPlayerCount} players.`, "info");
        });
    });
    
    // Select the default (2 players) button
    playerCountButtons[0].classList.add('selected');
    
    // Initialize player name inputs for default selection
    createPlayerNameInputs(selectedPlayerCount);
}

// Create player name input fields based on selected count
function createPlayerNameInputs(count) {
    // Clear existing inputs
    playerNameInputs.innerHTML = '';
    playerNameFields = [];
    
    // Create input for each player
    for (let i = 0; i < count; i++) {
        const container = document.createElement('div');
        container.className = 'player-name-container';
        
        // Create color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = `player-color-indicator player-color-${COLORS[i]}`;
        container.appendChild(colorIndicator);
        
        // Create label
        const playerLabel = document.createElement('span');
        playerLabel.textContent = `Player ${i + 1}: `;
        container.appendChild(playerLabel);
        
        // Create input field
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = `Enter name for Player ${i + 1}`;
        inputField.className = 'player-name-input';
        inputField.dataset.playerIndex = i;
        
        // Add to container
        container.appendChild(inputField);
        playerNameInputs.appendChild(container);
        
        // Store reference to input field
        playerNameFields.push(inputField);
        
        // Handle enter key to focus next input or start game
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (i < count - 1) {
                    // Focus next input
                    playerNameFields[i + 1].focus();
                } else {
                    // Start game when enter is pressed on last input
                    startGame();
                }
            }
        });
    }
    
    // Focus the first input field
    if (playerNameFields.length > 0) {
        playerNameFields[0].focus();
    }
}

// Start game with selected number of players
function setupGameStart() {
    startGameBtn.addEventListener('click', startGame);
}

// Start a new game with the selected player count
function startGame() {
    // Clear any previous game state
    if (gameState) {
        // Clear player info in the top bar if there was a previous game
        currentPlayerName.innerHTML = 'Waiting...';
        playerNames.innerHTML = 'Waiting...';
        gameBoard.className = '';
        
        // Clear all cells and animations
        document.querySelectorAll('.cell').forEach(cell => {
            cell.innerHTML = '';
            cell.className = 'cell';
            cell.classList.remove('explode', 'move');
            cell.classList.remove('blue-turn', 'red-turn', 'green-turn', 'yellow-turn', 'purple-turn');
        });
    }
    
    // Validate all player names
    playersList = [];
    let allNamesValid = true;
    
    for (let i = 0; i < selectedPlayerCount; i++) {
        const name = playerNameFields[i].value.trim() || `Player ${i + 1}`;
        
        // Create player object
        const player = {
            id: `player-${i}`,
            name: name,
            color: COLORS[i],
            active: true,
            joinedAt: Date.now(),
            isHuman: true
        };
        
        playersList.push(player);
    }
    
    if (!allNamesValid) {
        return;
    }
    
    // Disable the start button while processing
    startGameBtn.disabled = true;
    
    // Initialize the game with these players
    initializeGame(playersList);
}

// Initialize the game with the provided players
function initializeGame(players) {
    // Create an empty game board
    const emptyBoard = createEmptyBoard();
    
    // Reset game state
    currentPlayerIndex = 0;
    isProcessingExplosion = false;
    explosionQueue = [];
    pendingAnimations = 0;
    
    // Create the initial game state
    gameState = {
        status: 'playing',
        currentPlayerIndex: currentPlayerIndex,
        players: players,
        board: emptyBoard,
        lastUpdated: Date.now(),
        recentlyExploded: new Set() // Track cells that have exploded recently
    };
    
    // Update the UI to hide setup and show game
    document.getElementById('game-setup').style.display = 'none';
    resetButton.disabled = false;
    
    // Update the UI with the initial game state
    updateGameUI();
    
    showMessage(`Game started with ${players.length} players. ${players[0].name}, it's your turn!`, 'success');
}

// Update the game UI based on the current state
function updateGameUI() {
    if (!gameState) return;
    
    // Get the current player
    const currentPlayer = gameState.players[currentPlayerIndex];
    
    // Update player list display
    const playerListHtml = gameState.players
        .map(player => {
            const colorName = player.color === 'red' ? 'pink' : player.color;
            return `<span style="color:var(--neon-${colorName})">${player.name}</span>`;
        })
        .join(', ');
    
    playerNames.innerHTML = playerListHtml;
    
    // Update current player display
    if (currentPlayer) {
        const colorName = currentPlayer.color === 'red' ? 'pink' : currentPlayer.color;
        currentPlayerName.innerHTML = `<span style="color:var(--neon-${colorName})">${currentPlayer.name}</span>`;
        
        // Update grid color
        gameBoard.className = '';
        gameBoard.classList.add(`${currentPlayer.color}-turn`);
        
        // Update cell colors
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('blue-turn', 'red-turn', 'green-turn', 'yellow-turn', 'purple-turn');
            cell.classList.add(`${currentPlayer.color}-turn`);
        });
    }
    
    // Update the board display
    requestAnimationFrame(() => updateBoardDisplay());
}

// Update the display of the game board
function updateBoardDisplay() {
    if (!gameState || !gameState.board) return;
    
    // Batch DOM updates for better performance
    const updates = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = gameState.board[row][col];
            const cellElement = cells[row][col];
            
            if (!cell || !cellElement) continue;
            
            updates.push(() => {
                // Clear existing content
                cellElement.innerHTML = '';
                
                // Add balls if needed
                if (cell.balls > 0 && cell.color) {
                    if (cell.balls === 1) {
                        const ball = document.createElement('div');
                        ball.className = `ball ball-1 ${cell.color}`;
                        cellElement.appendChild(ball);
                    } 
                    else if (cell.balls === 2) {
                        const ball1 = document.createElement('div');
                        const ball2 = document.createElement('div');
                        ball1.className = `ball ball-2-1 ${cell.color}`;
                        ball2.className = `ball ball-2-2 ${cell.color}`;
                        cellElement.appendChild(ball1);
                        cellElement.appendChild(ball2);
                    } 
                    else if (cell.balls >= 3) {
                        const ball1 = document.createElement('div');
                        const ball2 = document.createElement('div');
                        const ball3 = document.createElement('div');
                        ball1.className = `ball ball-3-1 ${cell.color}`;
                        ball2.className = `ball ball-3-2 ${cell.color}`;
                        ball3.className = `ball ball-3-3 ${cell.color}`;
                        cellElement.appendChild(ball1);
                        cellElement.appendChild(ball2);
                        cellElement.appendChild(ball3);
                    }
                }
            });
        }
    }
    
    // Execute updates in sequence for better performance
    for (const update of updates) {
        update();
    }
}

// Create an empty game board
function createEmptyBoard() {
    const board = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            board[row][col] = {
                balls: 0,
                color: null
            };
        }
    }
    return board;
}

// Handle a cell click
function handleCellClick(row, col) {
    // Only allow clicks if the game is in progress and not during explosions
    if (!gameState || gameState.status !== 'playing' || isProcessingExplosion) {
        return;
    }
    
    const currentPlayer = gameState.players[currentPlayerIndex];
    if (!currentPlayer) {
        console.error("Invalid current player");
        return;
    }
    
    const cell = gameState.board[row][col];
    
    // Handle the action based on the current cell state
    let actionTaken = false;
    
    if (cell.balls === 0) {
        // Empty cell: Add a ball of the player's color
        placeBall(row, col, currentPlayer.color);
        actionTaken = true;
    } else if (cell.color === currentPlayer.color) {
        // Cell with the player's color: Increment balls or explode
        if (cell.balls < 3) {
            addBallToCell(row, col);
            actionTaken = true;
        } else if (cell.balls === 3) {
            // 3 balls - add one more
            addBallToCell(row, col);
            actionTaken = true;
            
            // Now the cell has 4 balls, it should explode
            // Set the flag to prevent further actions during explosion
            isProcessingExplosion = true;
            explosionQueue = [];
            pendingAnimations = 0;
            
            // Start the explosion
            explodeCell(row, col, currentPlayer.color);

            // Process the explosion queue
            processExplosionQueue();
        }
    } else {
        // Cannot click on opponent's ball
        return;
    }
    
    // Only proceed if an action was taken and it's not an explosion (which is handled separately)
    if (actionTaken && !isProcessingExplosion) {
        // Check for win condition
        const gameWon = checkWinCondition();
        
        // Switch to the next player's turn if game is still in progress
        if (!gameWon && gameState.status === 'playing') {
            moveToNextPlayer();
        }
    }
}

// Move to the next player's turn
function moveToNextPlayer() {
    // Move to next player
    currentPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    // Update game state with new current player
    gameState.currentPlayerIndex = currentPlayerIndex;
    
    // Update the UI
    updateGameUI();
    
    // Show whose turn it is
    const nextPlayer = gameState.players[currentPlayerIndex];
    showMessage(`${nextPlayer.name}'s turn`, 'info');
}

// Place a ball in an empty cell
function placeBall(row, col, color) {
    gameState.board[row][col] = {
        balls: 1,
        color: color
    };
    
    // Update the display
    requestAnimationFrame(() => updateBoardDisplay());
}

// Add a ball to a cell that already has 1 or 2 balls
function addBallToCell(row, col) {
    const cell = gameState.board[row][col];
    cell.balls += 1;
    
    // Update the display
    requestAnimationFrame(() => updateBoardDisplay());
}

// Explode a cell, sending balls to adjacent cells
function explodeCell(row, col, color) {
    // Ensure the cell exists
    if (!gameState.board[row] || !gameState.board[row][col]) {
        return;
    }
    
    // Ensure the cell has more than 3 balls before exploding
    if (gameState.board[row][col].balls <= 3) {
        return;
    }
    
    // Mark this cell as exploded to prevent revisiting in the same chain
    const cellKey = `${row}-${col}`;
    if (gameState.recentlyExploded && gameState.recentlyExploded.has(cellKey)) {
        // This cell was already exploded recently, don't process it again
        return;
    }
    
    // Debug log
    console.log("Exploding cell at", row, col, "with color", color, "balls:", gameState.board[row][col].balls);
    
    // Track recently exploded cells to prevent infinite loops
    if (!gameState.recentlyExploded) {
        gameState.recentlyExploded = new Set();
    }
    gameState.recentlyExploded.add(cellKey);
    
    // Clear the current cell
    gameState.board[row][col].balls = 0;
    gameState.board[row][col].color = null;
    
    // Add animation class to cell
    const cellElement = cells[row][col];
    cellElement.classList.add('explode');
    pendingAnimations++;
    
    setTimeout(() => {
        cellElement.classList.remove('explode');
        pendingAnimations--;
        checkExplosionsComplete();
    }, 300);
    
    // Add balls to adjacent cells
    for (const direction of DIRECTIONS) {
        const newRow = row + direction.row;
        const newCol = col + direction.col;
        
        // Check if the new position is within the board
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const targetCell = gameState.board[newRow][newCol];
            
            // If the target cell is empty
            if (targetCell.balls === 0) {
                targetCell.balls = 1;
                targetCell.color = color;
            } 
            // If the target cell has balls already
            else {
                // Store the previous ball count to detect if we're reaching 3 balls
                const previousBallCount = targetCell.balls;
                
                // Increment ball count
                targetCell.balls += 1;
                targetCell.color = color; // Convert to this player's color
                
                // Add animation to show conversion
                const targetCellElement = cells[newRow][newCol];
                targetCellElement.classList.add('move');
                pendingAnimations++;
                
                setTimeout(() => {
                    targetCellElement.classList.remove('move');
                    pendingAnimations--;
                    checkExplosionsComplete();
                }, 300);
                
                // Cell should only explode if it has MORE THAN 3 balls
                if (targetCell.balls > 3) {
                    // Add to explosion queue instead of calling immediately
                    const newCellKey = `${newRow}-${newCol}`;
                    if (!gameState.recentlyExploded.has(newCellKey)) {
                        // Force cells that have more than 3 balls to explode
                        explosionQueue.push({row: newRow, col: newCol, color: color});
                        console.log("Adding cell to explosion queue:", newRow, newCol, color, "with ball count:", targetCell.balls);
                    }
                }
            }
        }
    }
    
    // Update the display
    requestAnimationFrame(() => updateBoardDisplay());
    
    // Check for win condition after all directions are processed
    // This ensures the game ends as soon as only one color remains
    setTimeout(() => {
        const gameWon = checkWinCondition();
        if (gameWon) {
            // Clear the explosion queue to stop further processing
            explosionQueue = [];
            isProcessingExplosion = false;
        }
    }, 50);
}

// Process the explosion queue
function processExplosionQueue() {
    // If there are explosions to process, do it with a delay
    if (explosionQueue.length > 0) {
        // Take the first explosion from the queue
        const explosion = explosionQueue.shift();
        
        // Check if this cell still has more than 3 balls before exploding
        if (gameState.board[explosion.row] && 
            gameState.board[explosion.row][explosion.col] && 
            gameState.board[explosion.row][explosion.col].balls > 3) {
            
            // Process it after a delay
            setTimeout(() => {
                // Use the current color of the cell, not the color when it was added to the queue
                const currentColor = gameState.board[explosion.row][explosion.col].color;
                const ballCount = gameState.board[explosion.row][explosion.col].balls;
                console.log("Exploding cell:", explosion.row, explosion.col, "Current color:", currentColor, "Balls:", ballCount);
                
                explodeCell(explosion.row, explosion.col, currentColor);
                
                // Check for win condition after each explosion
                // This ensures game ends immediately when only one color remains
                const gameWon = checkWinCondition();
                if (gameWon) {
                    // Clear the explosion queue if the game is won
                    explosionQueue = [];
                    isProcessingExplosion = false;
                    return;
                }
                
                // Continue processing the queue
                processExplosionQueue();
            }, 300);
        } else {
            // Skip this explosion and continue processing
            processExplosionQueue();
        }
    } else {
        // Check if all animations are complete
        checkExplosionsComplete();
    }
}

// Check if all explosions and animations are complete
function checkExplosionsComplete() {
    if (explosionQueue.length === 0 && pendingAnimations === 0 && isProcessingExplosion) {
        // All explosions are done, reset the flag
        isProcessingExplosion = false;
        
        // Clear the recently exploded cells set
        if (gameState.recentlyExploded) {
            gameState.recentlyExploded.clear();
        }
        
        // Check for win condition before moving to next player
        const gameWon = checkWinCondition();
        
        // Move to next player if game is still in progress
        if (!gameWon && gameState && gameState.status === 'playing') {
            // Delay the next turn slightly for better UX
            setTimeout(() => {
                moveToNextPlayer();
            }, 300);
        }
    }
}

// Check if any player has won
function checkWinCondition() {
    // Skip check if game is not in playing state
    if (!gameState || gameState.status !== 'playing') {
        return false;
    }

    // Get all active player colors
    const activePlayers = gameState.players;
    const totalPlayers = activePlayers.length;
    
    // Create a set of all colors that should be on the board
    const allPlayerColors = new Set(activePlayers.map(player => player.color));
    
    // Count how many cells each color has
    const colorCounts = {};
    const colorsPresent = new Set();
    
    // Initialize counts for each player's color to zero
    activePlayers.forEach(player => {
        colorCounts[player.color] = 0;
    });
    
    // Count total balls and cells for each color
    let totalBalls = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = gameState.board[row][col];
            if (cell && cell.balls > 0 && cell.color) {
                colorCounts[cell.color] = (colorCounts[cell.color] || 0) + 1;
                colorsPresent.add(cell.color);
                totalBalls++;
            }
        }
    }
    
    // Skip early game - ensure there are enough balls on the board
    // Allow at least 2 balls per player before checking for win
    if (totalBalls < totalPlayers * 2) {
        return false;
    }
    
    // Debug log to see colors in play
    console.log("Colors present:", Array.from(colorsPresent));
    console.log("Color counts:", colorCounts);
    
    // Check if there's only one color remaining on the board
    if (colorsPresent.size === 1 && totalBalls > 0) {
        // Last color standing is the winner
        const lastRemainingColor = Array.from(colorsPresent)[0];
        const winningPlayer = activePlayers.find(player => player.color === lastRemainingColor);
        
        console.log("WIN DETECTED - Last remaining color:", lastRemainingColor);
        console.log("Total balls:", totalBalls);
        
        if (winningPlayer) {
            // Get all eliminated players
            const eliminatedPlayers = activePlayers.filter(player => 
                player.color !== lastRemainingColor
            );
            
            // Set game status to finished
            gameState.status = 'finished';
            gameState.winner = winningPlayer.id;
            gameState.winningColor = lastRemainingColor;
            
            // Simplified game over message
            let message = `Game over, ${winningPlayer.name} wins!!`;
            
            // Show winning message as a popup with confetti
            showGameOverPopup(message, lastRemainingColor);
            
            // Make sure the UI updates to show the winner
            updateGameUI();
            
            // Enable reset button
            resetButton.disabled = false;
            return true;
        }
    }
    
    // Check if any colors are missing from the board but should be present
    const eliminatedColors = [];
    allPlayerColors.forEach(color => {
        if (!colorsPresent.has(color)) {
            eliminatedColors.push(color);
        }
    });
    
    // If we've eliminated all but one color, that should trigger the win
    if (eliminatedColors.length === allPlayerColors.size - 1 && allPlayerColors.size > 1) {
        console.log("WIN DETECTED - Colors eliminated:", eliminatedColors);
        
        // Find the remaining color
        const lastRemainingColor = Array.from(allPlayerColors).find(color => !eliminatedColors.includes(color));
        console.log("Last color:", lastRemainingColor);
        
        if (lastRemainingColor) {
            const winningPlayer = activePlayers.find(player => player.color === lastRemainingColor);
            
            if (winningPlayer) {
                // Get all eliminated players
                const eliminatedPlayers = activePlayers.filter(player => 
                    player.color !== lastRemainingColor
                );
                
                // Set game status to finished
                gameState.status = 'finished';
                gameState.winner = winningPlayer.id;
                gameState.winningColor = lastRemainingColor;
                
                // Simplified game over message
                let message = `Game over, ${winningPlayer.name} wins!!`;
                
                // Show winning message as a popup with confetti
                showGameOverPopup(message, lastRemainingColor);
                
                // Make sure the UI updates to show the winner
                updateGameUI();
                
                // Enable reset button
                resetButton.disabled = false;
                return true;
            }
        }
    }
    
    return false;
}

// Reset the game
function resetGame() {
    // Prevent resetting during processing
    if (isProcessingExplosion) {
        return;
    }
    
    resetButton.disabled = true;
    
    // Hide game over popup if it's showing
    hideGameOverPopup();
    
    // Reset game state and flags
    gameState = null;
    currentPlayerIndex = 0;
    isProcessingExplosion = false;
    explosionQueue = [];
    pendingAnimations = 0;
    
    // Clear all animations and classes
    document.querySelectorAll('.cell').forEach(cell => {
        cell.innerHTML = '';
        cell.className = 'cell';
        cell.classList.remove('explode', 'move');
        cell.classList.remove('blue-turn', 'red-turn', 'green-turn', 'yellow-turn', 'purple-turn');
    });
    
    // Clear player info in the top bar
    currentPlayerName.innerHTML = 'Waiting...';
    playerNames.innerHTML = 'Waiting...';
    gameBoard.className = '';
    
    // Show the setup UI again
    document.getElementById('game-setup').style.display = 'flex';
    
    // Reset and focus the first player name input
    if (playerNameFields.length > 0) {
        playerNameFields.forEach(input => {
            input.value = '';
        });
        playerNameFields[0].focus();
    }
    
    // Enable start button
    startGameBtn.disabled = false;
    
    showMessage('Game has been reset. Select the number of players to start a new game.', 'info');
}

// Display a message to the user
function showMessage(text, type = 'info') {
    gameMessage.textContent = text;
    gameMessage.className = '';
    gameMessage.classList.add(type);
    
    // Auto-clear info messages after a delay
    if (type === 'info') {
        setTimeout(() => {
            if (gameMessage.textContent === text) {
                gameMessage.textContent = '';
            }
        }, 5000);
    }
}

// Set up the Reset button
resetButton.addEventListener('click', resetGame);

// Initialize the game
window.onload = function() {
    initializeBoard();
    initPlayerCountSelection();
    setupGameStart();
    
    // Resize confetti canvas when window is resized
    window.addEventListener('resize', resizeConfettiCanvas);
    
    // Initialize confetti canvas
    resizeConfettiCanvas();
    
    showMessage("Select the number of players (2-5) and enter player names to start the game.", "info");
}; 