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
const aiModeToggle = document.getElementById('ai-mode-toggle');
const aiDifficultyContainer = document.getElementById('ai-difficulty');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

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
let aiMode = false; // Flag to indicate if AI mode is enabled
let aiPlayer = null; // Reference to the AI player object
let isAiThinking = false; // Flag to prevent multiple AI moves
let aiDifficulty = 'medium'; // Default AI difficulty
let lastExplosionTime = 0; // Track when the last explosion occurred

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
    
    // Initialize difficulty buttons
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove selected class from all buttons
            difficultyButtons.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked button
            btn.classList.add('selected');
            
            // Update selected difficulty
            aiDifficulty = btn.dataset.level;
            
            showMessage(`AI difficulty set to ${aiDifficulty}.`, "info");
        });
    });
    
    // Add event listener for AI mode toggle
    aiModeToggle.addEventListener('change', function() {
        aiMode = this.checked;
        
        // Force 2 players when AI mode is enabled
        if (aiMode) {
            selectedPlayerCount = 2;
            // Select 2 player button
            playerCountButtons.forEach(b => b.classList.remove('selected'));
            playerCountButtons[0].classList.add('selected');
            
            // Disable other player count buttons
            for (let i = 1; i < playerCountButtons.length; i++) {
                playerCountButtons[i].disabled = aiMode;
            }
            
            // Show difficulty selector
            aiDifficultyContainer.classList.remove('hidden');
            aiDifficultyContainer.classList.add('show');
            
            showMessage("AI mode enabled! You will play against an AI opponent.", "info");
        } else {
            // Enable all player count buttons
            playerCountButtons.forEach(btn => btn.disabled = false);
            
            // Hide difficulty selector
            aiDifficultyContainer.classList.remove('show');
            aiDifficultyContainer.classList.add('hidden');
            
            showMessage("AI mode disabled. Select the number of players.", "info");
        }
        
        // Update player name inputs
        createPlayerNameInputs(selectedPlayerCount);
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
    
    // AI mode modifications
    const actualCount = aiMode ? 1 : count;
    
    // Create input for each player
    for (let i = 0; i < actualCount; i++) {
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
                if (i < actualCount - 1) {
                    // Focus next input
                    playerNameFields[i + 1].focus();
                } else {
                    // Start game when enter is pressed on last input
                    startGame();
                }
            }
        });
    }
    
    // If AI mode is enabled, add AI player info
    if (aiMode) {
        const aiContainer = document.createElement('div');
        aiContainer.className = 'player-name-container ai-player';
        
        // Create color indicator for AI
        const aiColorIndicator = document.createElement('div');
        aiColorIndicator.className = `player-color-indicator player-color-${COLORS[1]}`; // AI is always second player (red)
        aiContainer.appendChild(aiColorIndicator);
        
        // Create AI label
        const aiLabel = document.createElement('span');
        aiLabel.textContent = `AI Player: `;
        aiContainer.appendChild(aiLabel);
        
        // Create fixed AI name field
        const aiNameField = document.createElement('span');
        aiNameField.className = 'ai-name';
        aiNameField.textContent = 'NeonBot';
        aiContainer.appendChild(aiNameField);
        
        // Add to container
        playerNameInputs.appendChild(aiContainer);
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
    
    // In AI mode, we only need to create the human player and AI player
    if (aiMode) {
        // Create human player (always blue, index 0)
        const humanName = playerNameFields[0].value.trim() || 'Player 1';
        const humanPlayer = {
            id: 'player-0',
            name: humanName,
            color: COLORS[0], // Blue
            active: true,
            joinedAt: Date.now(),
            isHuman: true
        };
        playersList.push(humanPlayer);
        
        // Create AI player (always red, index 1)
        aiPlayer = {
            id: 'player-1',
            name: 'NeonBot',
            color: COLORS[1], // Red
            active: true,
            joinedAt: Date.now(),
            isHuman: false,
            isAi: true
        };
        playersList.push(aiPlayer);
    } else {
        // Normal mode - create all human players
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
        console.log("Click blocked - Game state:", gameState?.status, "Processing explosion:", isProcessingExplosion);
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
            // Set the flag to prevent further actions during explosion BEFORE adding the ball
            isProcessingExplosion = true;
            lastExplosionTime = Date.now();
            
            // 3 balls - add one more
            addBallToCell(row, col);
            actionTaken = true;
            
            // Reset explosion tracking
            explosionQueue = [];
            pendingAnimations = 0;
            gameState.recentlyExploded = new Set();
            
            // Start the explosion
            setTimeout(() => {
                explodeCell(row, col, currentPlayer.color);
                processExplosionQueue();
            }, 50);
            
            return; // Exit early as explosion will handle turn change
        }
    } else {
        // Cannot click on opponent's ball
        return;
    }
    
    // Only proceed if an action was taken and it's not an explosion
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
    // Ensure no explosion processing is happening
    if (isProcessingExplosion) {
        console.log("Cannot move to next player during explosion processing");
        return;
    }
    
    // Move to next player
    currentPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    // Update game state with new current player
    gameState.currentPlayerIndex = currentPlayerIndex;
    
    // Update the UI
    updateGameUI();
    
    // Get the next player
    const nextPlayer = gameState.players[currentPlayerIndex];
    
    // Show whose turn it is
    showMessage(`${nextPlayer.name}'s turn`, 'info');
    
    // If it's AI's turn, make a move
    if (aiMode && nextPlayer.isAi && !isAiThinking && gameState.status === 'playing') {
        // Set AI thinking flag to prevent multiple moves
        isAiThinking = true;
        
        // Add a slightly longer delay to make it feel more natural
        // and ensure all animations have completed
        setTimeout(() => {
            // Double check that explosions are still complete before AI moves
            if (!isProcessingExplosion && gameState.status === 'playing') {
                makeAiMove();
            } else {
                // Reset AI thinking flag if explosion processing restarts
                isAiThinking = false;
            }
        }, 1000);
    }
}

// AI makes a move
function makeAiMove() {
    // Double check that no explosions are in progress
    if (!gameState || gameState.status !== 'playing' || isProcessingExplosion) {
        console.log("AI move blocked - Game state:", gameState?.status, "Processing explosion:", isProcessingExplosion);
        isAiThinking = false;
        return;
    }
    
    console.log("AI making move...");
    
    // Find best move
    const move = findBestAiMove();
    
    // Execute the move
    if (move) {
        handleCellClick(move.row, move.col);
    } else {
        console.error("AI couldn't find a valid move");
    }
    
    // Reset AI thinking flag
    isAiThinking = false;
}

// AI decides which move to make based on the current board state
function findBestAiMove() {
    const aiColor = aiPlayer.color;
    const playerColor = gameState.players[0].color; // Human player's color
    const board = gameState.board;
    const possibleMoves = [];
    
    // Analyze the board state to inform strategy
    const boardAnalysis = analyzeBoard();
    const gameStage = determineGameStage(boardAnalysis);
    
    // Apply difficulty settings
    // Easy: Makes random or suboptimal moves
    // Medium: Makes balanced strategic moves (default AI)
    // Hard: Makes highly strategic moves with increased aggression
    
    // On easy, occasionally make a fully random move
    if (aiDifficulty === 'easy' && Math.random() < 0.4) {
        console.log("AI making random move (easy difficulty)");
        return makeRandomMove();
    }
    
    // Check if AI is in a vulnerable position (few remaining balls)
    const isVulnerable = isAiVulnerable(boardAnalysis);
    console.log(`AI analysis - Game stage: ${gameStage}, AI balls: ${boardAnalysis.colorCount[aiColor]}, Player balls: ${boardAnalysis.colorCount[playerColor]}, Vulnerable: ${isVulnerable}, Difficulty: ${aiDifficulty}`);
    
    // EMERGENCY STRATEGY: If AI has very few balls, focus on survival
    // Hard AI is better at recognizing & responding to vulnerability
    // Easy AI is less likely to use survival strategies
    const vulnerabilitySensitivity = getVulnerabilitySensitivity();
    
    if (isVulnerable && Math.random() < vulnerabilitySensitivity) {
        console.log("AI is vulnerable - activating survival strategy");
        const survivalMove = findSurvivalMove(board, aiColor, playerColor, boardAnalysis);
        if (survivalMove) {
            console.log("AI found survival move:", survivalMove);
            return survivalMove;
        }
    }
    
    // 1. HIGHEST PRIORITY: Check for winning moves that can eliminate the last opponent cells
    // Hard AI always checks for winning moves, easy AI sometimes misses them
    const winCheckProbability = aiDifficulty === 'easy' ? 0.6 : 1.0;
    
    if (gameStage === 'endgame' && Math.random() < winCheckProbability) {
        const winningMove = findWinningMove(board, aiColor, playerColor);
        if (winningMove) {
            console.log("AI found winning move:", winningMove);
            return winningMove;
        }
    }
    
    // 2. Look for cells with 3 balls ready to explode (chain reactions)
    const explosionMoves = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = board[row][col];
            if (cell.color === aiColor && cell.balls === 3) {
                // Evaluate explosion with deeper analysis including risk assessment
                const explosionScore = evaluateExplosionWithRiskAssessment(row, col, aiColor, playerColor, isVulnerable);
                
                // Apply difficulty modifier to explosion evaluation
                const modifiedScore = applyDifficultyToScore(explosionScore, 'explosion');
                
                explosionMoves.push({ 
                    row, 
                    col, 
                    priority: 4, 
                    score: modifiedScore
                });
            }
        }
    }
    
    if (explosionMoves.length > 0) {
        // Sort by explosion score (highest first)
        explosionMoves.sort((a, b) => b.score - a.score);
        
        // If we're vulnerable and the best explosion has a low or negative score, don't explode
        // Hard AI is more willing to take risks when appropriate
        const explosionThreshold = getExplosionThreshold(isVulnerable);
        
        if (isVulnerable && explosionMoves[0].score < explosionThreshold) {
            console.log("AI avoiding risky explosion while vulnerable");
        } else {
            // Always select the best explosion move
            return explosionMoves[0];
        }
    }
    
    // 3. Identify strategic cell building - look for cells with 2 balls
    const twoBallMoves = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = board[row][col];
            if (cell.color === aiColor && cell.balls === 2) {
                // Calculate strategic value with deeper analysis
                const strategicValue = evaluateAdvancedStrategicValue(row, col, boardAnalysis, gameStage, isVulnerable);
                
                // Apply difficulty modifier to strategic evaluation
                const modifiedValue = applyDifficultyToScore(strategicValue, 'strategic');
                
                twoBallMoves.push({ 
                    row, 
                    col, 
                    priority: 3, 
                    score: modifiedValue
                });
            }
        }
    }
    
    // 4. Look for cells with 1 ball - more selective based on game stage
    const oneBallMoves = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = board[row][col];
            if (cell.color === aiColor && cell.balls === 1) {
                // Check if this cell is at risk of capture
                const captureRisk = assessCaptureRisk(row, col, playerColor);
                
                // Adjust risk perception based on difficulty
                const modifiedRisk = adjustRiskPerception(captureRisk);
                
                // If vulnerable and high risk of capture, assign a very low score
                const buildValue = isVulnerable && modifiedRisk > 0.7 
                    ? -5 // Heavily penalize moves that risk capture when vulnerable
                    : evaluateBuildingValue(row, col, boardAnalysis, gameStage);
                
                // Apply difficulty modifier to building value
                const modifiedValue = applyDifficultyToScore(buildValue, 'building');
                
                oneBallMoves.push({ 
                    row, 
                    col, 
                    priority: 2, 
                    score: modifiedValue,
                    isRisky: modifiedRisk > 0.7
                });
            }
        }
    }
    
    // 5. Find strategic empty cells
    const evaluatedEmptyCells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = board[row][col];
            if (cell.balls === 0) {
                // Include safety assessment in the evaluation
                const captureRisk = assessCaptureRisk(row, col, playerColor);
                const modifiedRisk = adjustRiskPerception(captureRisk);
                
                const placementValue = evaluateEmptyCell(row, col, boardAnalysis, gameStage, isVulnerable);
                
                // Apply difficulty modifier to placement evaluation
                const modifiedValue = applyDifficultyToScore(placementValue, 'placement');
                
                // Apply safety multiplier based on vulnerability
                const safetyMultiplier = isVulnerable ? (1 - modifiedRisk) : 1;
                const adjustedScore = modifiedValue * safetyMultiplier;
                
                evaluatedEmptyCells.push({ 
                    row, 
                    col, 
                    priority: 1, 
                    score: adjustedScore,
                    isRisky: modifiedRisk > 0.7
                });
            }
        }
    }
    
    // Add moves to possible moves based on game stage and strategy
    if (gameStage === 'opening') {
        // In opening, focus on strategic positioning
        const safetyThreshold = getSafetyThreshold();
        
        const safeTwoBallMoves = twoBallMoves.filter(move => !move.isRisky || Math.random() > safetyThreshold);
        possibleMoves.push(...safeTwoBallMoves);
        
        const safeOneBallMoves = oneBallMoves.filter(move => !move.isRisky || Math.random() > safetyThreshold);
        possibleMoves.push(...safeOneBallMoves);
        
        // Sort empty cells by score and take the top ones
        evaluatedEmptyCells.sort((a, b) => b.score - a.score);
        
        // If vulnerable, prefer safer empty cells
        if (isVulnerable && Math.random() < vulnerabilitySensitivity) {
            const safeEmptyCells = evaluatedEmptyCells.filter(cell => !cell.isRisky);
            possibleMoves.push(...safeEmptyCells.slice(0, getTopMovesCount(5)));
        } else {
            possibleMoves.push(...evaluatedEmptyCells.slice(0, getTopMovesCount(3)));
        }
    } 
    else if (gameStage === 'midgame') {
        // In midgame, prioritize building and strategic captures
        const safetyThreshold = getSafetyThreshold();
        
        possibleMoves.push(...twoBallMoves.filter(move => 
            !isVulnerable || !move.isRisky || Math.random() > safetyThreshold
        ));
        
        // If vulnerable, be more selective with one-ball moves
        if (isVulnerable && Math.random() < vulnerabilitySensitivity) {
            const safeOneBallMoves = oneBallMoves.filter(move => 
                !move.isRisky && move.score > (aiDifficulty === 'hard' ? 0.5 : 1)
            );
            possibleMoves.push(...safeOneBallMoves);
        } else {
            // Filter for higher-value one-ball cells
            const valueThreshold = aiDifficulty === 'hard' ? 1.5 : 2;
            const betterOneBallMoves = oneBallMoves.filter(move => move.score > valueThreshold);
            possibleMoves.push(...betterOneBallMoves);
        }
        
        // Only add best empty cells
        evaluatedEmptyCells.sort((a, b) => b.score - a.score);
        
        // If vulnerable, prefer safer empty cells
        if (isVulnerable && Math.random() < vulnerabilitySensitivity) {
            const safeEmptyCells = evaluatedEmptyCells.filter(cell => !cell.isRisky);
            possibleMoves.push(...safeEmptyCells.slice(0, getTopMovesCount(5)));
        } else {
            possibleMoves.push(...evaluatedEmptyCells.slice(0, getTopMovesCount(2)));
        }
    }
    else if (gameStage === 'endgame') {
        // In endgame, be aggressive but smart
        const safetyThreshold = getSafetyThreshold();
        
        possibleMoves.push(...twoBallMoves.filter(move => 
            !isVulnerable || !move.isRisky || Math.random() > safetyThreshold
        ));
        
        // Hard AI is more aggressive in endgame, easy AI is more cautious
        const aggressionLevel = getAggressionLevel();
        
        if (isVulnerable && Math.random() > aggressionLevel) {
            // When vulnerable in endgame, focus more on strategic positioning
            const safeEmptyCells = evaluatedEmptyCells.filter(cell => !cell.isRisky);
            possibleMoves.push(...safeEmptyCells.slice(0, getTopMovesCount(5)));
            
            const safeOneBallMoves = oneBallMoves.filter(move => !move.isRisky);
            possibleMoves.push(...safeOneBallMoves);
        } else {
            // Target opponent-adjacent positions
            const offensiveEmptyCells = evaluatedEmptyCells.filter(move => 
                isAdjacentToOpponentCluster(move.row, move.col, playerColor)
            );
            possibleMoves.push(...offensiveEmptyCells);
            
            // Add any remaining moves as fallback
            possibleMoves.push(...oneBallMoves);
        }
        
        // Sort by aggression potential - unless vulnerable
        if (!isVulnerable || Math.random() < aggressionLevel) {
            possibleMoves.sort((a, b) => {
                // If scores differ significantly
                if (Math.abs(b.score - a.score) > 1) {
                    return b.score - a.score;
                }
                // If similar scores, prefer moves closer to opponent pieces
                return getOpponentProximityScore(b.row, b.col, playerColor) - 
                       getOpponentProximityScore(a.row, a.col, playerColor);
            });
        }
    }
    
    // If no moves found, use all possibilities as fallback
    if (possibleMoves.length === 0) {
        // If vulnerable, prioritize safe moves
        if (isVulnerable && Math.random() < vulnerabilitySensitivity) {
            const safeMoves = [
                ...twoBallMoves.filter(move => !move.isRisky),
                ...oneBallMoves.filter(move => !move.isRisky),
                ...evaluatedEmptyCells.filter(move => !move.isRisky)
            ];
            
            if (safeMoves.length > 0) {
                possibleMoves.push(...safeMoves);
            } else {
                // No safe moves available, use all as last resort
                possibleMoves.push(...twoBallMoves);
                possibleMoves.push(...oneBallMoves);
                possibleMoves.push(...evaluatedEmptyCells);
            }
        } else {
            possibleMoves.push(...twoBallMoves);
            possibleMoves.push(...oneBallMoves);
            possibleMoves.push(...evaluatedEmptyCells);
        }
    }
    
    // Filter out any invalid moves
    const validMoves = possibleMoves.filter(move => 
        move.row >= 0 && move.row < GRID_SIZE && 
        move.col >= 0 && move.col < GRID_SIZE
    );
    
    if (validMoves.length === 0) {
        // No valid moves found, return a random move as last resort
        return makeRandomMove();
    }
    
    // When vulnerable, sort heavily prioritizing safety and survival
    if (isVulnerable && Math.random() < vulnerabilitySensitivity) {
        validMoves.sort((a, b) => {
            // First, prioritize non-risky moves
            if (a.isRisky && !b.isRisky) return 1;
            if (!a.isRisky && b.isRisky) return -1;
            
            // Then sort by score
            return b.score - a.score;
        });
    } else {
        // Sort by priority and score
        validMoves.sort((a, b) => {
            // First compare by priority (higher is better)
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            
            // Then compare by score (higher is better)
            return b.score - a.score;
        });
    }
    
    // Select the best move or a slightly suboptimal one based on difficulty
    const selectedMove = selectMoveBasedOnDifficulty(validMoves);
    return selectedMove;
}

// Helper functions for AI difficulty
function makeRandomMove() {
    // Find all possible valid moves
    const validMoves = [];
    
    // First look for cells with our color
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = gameState.board[row][col];
            if (cell.color === aiPlayer.color) {
                validMoves.push({ row, col, priority: cell.balls });
            }
        }
    }
    
    // If we don't have any cells yet, add empty cells
    if (validMoves.length === 0) {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = gameState.board[row][col];
                if (cell.balls === 0) {
                    validMoves.push({ row, col, priority: 0 });
                }
            }
        }
    }
    
    if (validMoves.length === 0) {
        return null; // No valid moves available
    }
    
    // Select a random move
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
}

function getVulnerabilitySensitivity() {
    switch(aiDifficulty) {
        case 'easy': return 0.4;   // 40% chance of using survival strategy
        case 'medium': return 0.8; // 80% chance of using survival strategy
        case 'hard': return 0.95;  // 95% chance of using survival strategy
        default: return 0.8;       // Default to medium
    }
}

function getExplosionThreshold(isVulnerable) {
    // Hard AI will take more risks with explosions
    switch(aiDifficulty) {
        case 'easy': return isVulnerable ? 5 : 2;     // More cautious
        case 'medium': return isVulnerable ? 3 : 1;   // Balanced
        case 'hard': return isVulnerable ? 1 : -1;    // More aggressive
        default: return isVulnerable ? 3 : 1;         // Default to medium
    }
}

function adjustRiskPerception(originalRisk) {
    // Adjust how the AI perceives risk based on difficulty
    switch(aiDifficulty) {
        case 'easy': 
            // Easy AI is more cautious, perceives more risk
            return Math.min(1.0, originalRisk * 1.3);
        case 'medium':
            // Medium AI has balanced risk perception
            return originalRisk;
        case 'hard':
            // Hard AI is more willing to take risks, perceives less risk
            return Math.max(0.0, originalRisk * 0.7);
        default:
            return originalRisk;
    }
}

function getSafetyThreshold() {
    // Threshold for ignoring risky moves (higher = more cautious)
    switch(aiDifficulty) {
        case 'easy': return 0.3;    // Only 30% chance to take risky moves
        case 'medium': return 0.5;  // 50% chance to take risky moves
        case 'hard': return 0.7;    // 70% chance to take risky moves
        default: return 0.5;        // Default to medium
    }
}

function getAggressionLevel() {
    // How aggressive the AI plays in endgame (higher = more aggressive)
    switch(aiDifficulty) {
        case 'easy': return 0.3;    // Less aggressive
        case 'medium': return 0.6;  // Moderately aggressive
        case 'hard': return 0.9;    // Very aggressive
        default: return 0.6;        // Default to medium
    }
}

function getTopMovesCount(baseCount) {
    // Controls how many top-scoring moves the AI considers
    // Hard AI considers more options, easy AI considers fewer
    switch(aiDifficulty) {
        case 'easy': return Math.floor(baseCount * 0.7);     // Fewer options
        case 'medium': return baseCount;                     // Normal options
        case 'hard': return Math.ceil(baseCount * 1.3);      // More options
        default: return baseCount;                           // Default to medium
    }
}

function applyDifficultyToScore(originalScore, moveType) {
    // Apply multipliers to scores based on difficulty and move type
    const multiplier = getDifficultyMultiplier(moveType);
    
    // Apply the multiplier
    return originalScore * multiplier;
}

function getDifficultyMultiplier(moveType) {
    // Define multipliers for different types of moves based on difficulty
    // This makes hard AI better evaluate strategic moves and easy AI worse
    switch(aiDifficulty) {
        case 'easy':
            switch(moveType) {
                case 'explosion': return 0.8;    // 20% worse at evaluating explosions
                case 'strategic': return 0.7;    // 30% worse at strategic moves
                case 'building': return 0.9;     // 10% worse at building moves
                case 'placement': return 0.8;    // 20% worse at placement
                default: return 0.8;
            }
        case 'medium':
            return 1.0;  // No modification for medium difficulty (base AI)
        case 'hard':
            switch(moveType) {
                case 'explosion': return 1.3;    // 30% better at evaluating explosions
                case 'strategic': return 1.5;    // 50% better at strategic moves
                case 'building': return 1.2;     // 20% better at building moves
                case 'placement': return 1.3;    // 30% better at placement
                default: return 1.3;
            }
        default:
            return 1.0;  // Default to medium
    }
}

function selectMoveBasedOnDifficulty(validMoves) {
    if (validMoves.length === 0) return null;
    
    // For hard difficulty, always pick the best move
    if (aiDifficulty === 'hard') {
        return validMoves[0];
    }
    
    // For easy difficulty, often pick a suboptimal move
    if (aiDifficulty === 'easy') {
        // 60% chance to pick a suboptimal move
        if (validMoves.length > 1 && Math.random() < 0.6) {
            // Pick a move from the top half, but not the best one
            const randomIndex = 1 + Math.floor(Math.random() * Math.min(validMoves.length - 1, Math.ceil(validMoves.length / 2)));
            return validMoves[randomIndex];
        }
    }
    
    // For medium difficulty, occasionally pick a slightly suboptimal move
    if (aiDifficulty === 'medium') {
        // 30% chance to pick a slightly suboptimal move
        if (validMoves.length > 1 && Math.random() < 0.3) {
            // Pick from the top 3 moves, but not the best one
            const randomIndex = 1 + Math.floor(Math.random() * Math.min(validMoves.length - 1, 2));
            return validMoves[randomIndex];
        }
    }
    
    // Default: pick the best move
    return validMoves[0];
}

// Check if AI is in a vulnerable position with few remaining balls
function isAiVulnerable(boardAnalysis) {
    const aiColor = aiPlayer.color;
    const playerColor = gameState.players[0].color;
    
    // Calculate the ratio of AI balls to player balls
    const aiBalls = boardAnalysis.colorCount[aiColor] || 0;
    const playerBalls = boardAnalysis.colorCount[playerColor] || 0;
    
    // Calculate the number of cells containing AI's color
    const aiCells = boardAnalysis.colorCells[aiColor].length;
    
    // AI is vulnerable if it has significantly fewer balls than the player
    // or if it has very few cells with its color
    if (aiBalls === 0) return false; // No balls means game is over or just starting
    
    // Vulnerability conditions:
    // 1. Less than 3 cells with AI's color
    // 2. Player has more than 2.5x the number of balls
    // 3. Player has a significant number of balls (8+) while AI has very few (<4)
    const fewCells = aiCells <= 3;
    const ballRatio = playerBalls / aiBalls;
    const overwhelmed = playerBalls >= 8 && aiBalls <= 4;
    
    return fewCells || ballRatio >= 2.5 || overwhelmed;
}

// Find a move that helps the AI survive when vulnerable
function findSurvivalMove(board, aiColor, playerColor, boardAnalysis) {
    const aiCells = boardAnalysis.colorCells[aiColor];
    
    // If AI has no cells, game is probably over
    if (aiCells.length === 0) {
        return null;
    }
    
    // If AI has very few cells, prioritize placing new balls away from player
    if (aiCells.length <= 3) {
        // Find the safest empty cells far from player pieces
        const safestCells = [];
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = board[row][col];
                if (cell.balls === 0) {
                    // Calculate distance from player pieces
                    const captureRisk = assessCaptureRisk(row, col, playerColor);
                    const playerProximity = getOpponentProximityScore(row, col, playerColor);
                    
                    // Calculate strategic value
                    const centerProximity = getCenterPositionValue(row, col);
                    const defensiveValue = calculateDefensiveValue(row, col, aiColor, playerColor);
                    
                    // Safety score: higher = safer
                    const safetyScore = (1 - captureRisk) * 5 - playerProximity * 0.3 + defensiveValue + centerProximity;
                    
                    safestCells.push({
                        row, col, 
                        priority: 5, // Highest priority for survival
                        score: safetyScore,
                        captureRisk
                    });
                }
            }
        }
        
        // Sort by safety (higher score = safer)
        safestCells.sort((a, b) => b.score - a.score);
        
        // Find cells with very low capture risk
        const verySafeCells = safestCells.filter(cell => cell.captureRisk < 0.3);
        
        if (verySafeCells.length > 0) {
            return verySafeCells[0]; // Return the safest cell
        }
        
        if (safestCells.length > 0) {
            return safestCells[0]; // Return the relatively safest cell
        }
    }
    
    // If AI has cells with multiple balls, check if building them further is safe
    const multipleBallCells = aiCells.filter(cell => cell.balls >= 2);
    
    if (multipleBallCells.length > 0) {
        // Evaluate each cell for safety
        const evaluatedCells = multipleBallCells.map(cell => {
            const captureRisk = assessCaptureRisk(cell.row, cell.col, playerColor);
            
            return {
                row: cell.row,
                col: cell.col,
                priority: 4,
                score: 5 - captureRisk * 10, // Higher score for safer cells
                balls: cell.balls
            };
        });
        
        // Sort by safety and ball count (prioritize safe cells with more balls)
        evaluatedCells.sort((a, b) => {
            // First compare safety
            if (a.score > b.score + 2) return -1;
            if (b.score > a.score + 2) return 1;
            
            // If safety is similar, prefer cells with more balls
            return b.balls - a.balls;
        });
        
        // Return the safest multi-ball cell that's not extremely risky
        const safeCells = evaluatedCells.filter(cell => cell.score > 0);
        if (safeCells.length > 0) {
            return safeCells[0];
        }
    }
    
    // If all else fails, find an empty cell far from opponent pieces
    const emptyCells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (board[row][col].balls === 0) {
                const playerProximity = getOpponentProximityScore(row, col, playerColor);
                emptyCells.push({
                    row, col,
                    priority: 3,
                    score: -playerProximity // Lower proximity = higher score
                });
            }
        }
    }
    
    if (emptyCells.length > 0) {
        emptyCells.sort((a, b) => b.score - a.score);
        return emptyCells[0];
    }
    
    return null; // No good survival move found
}

// Assess risk of a position being captured by the opponent
function assessCaptureRisk(row, col, opponentColor) {
    let risk = 0;
    
    // Check adjacent cells for opponent's pieces
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            if (cell.color === opponentColor) {
                // Higher risk if opponent has multiple balls
                if (cell.balls === 3) {
                    risk += 0.9; // Very high risk - opponent can explode next turn
                } else if (cell.balls === 2) {
                    risk += 0.4; // Medium risk - opponent is two moves away from explosion
                } else if (cell.balls === 1) {
                    risk += 0.1; // Low risk - opponent is three moves away
                }
            }
        }
    }
    
    // Cap risk at 1.0
    return Math.min(risk, 1.0);
}

// Calculate defensive value of a position based on board control
function calculateDefensiveValue(row, col, aiColor, playerColor) {
    let value = 0;
    
    // Check if this position helps form a defensive barrier
    let aiNeighbors = 0;
    let emptyNeighbors = 0;
    
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            if (cell.color === aiColor) {
                aiNeighbors++;
                // Higher value for connecting to cells with more balls
                value += cell.balls * 0.3;
            } else if (cell.balls === 0) {
                emptyNeighbors++;
            }
        }
    }
    
    // Forming clusters provides better defense
    if (aiNeighbors >= 2) {
        value += 1.5;
    }
    
    // Some empty neighbors provide flexibility
    if (emptyNeighbors >= 1 && aiNeighbors >= 1) {
        value += 0.5;
    }
    
    // Check if this position blocks opponent's expansion
    const blockingValue = evaluateBlockingValue(row, col, playerColor);
    value += blockingValue;
    
    return value;
}

// Evaluate how well a position blocks opponent expansion
function evaluateBlockingValue(row, col, opponentColor) {
    let value = 0;
    
    // Check for opponent clusters nearby
    let opponentNeighbors = 0;
    let opponentDiagonalNeighbors = 0;
    
    // Check direct neighbors
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            if (cell.color === opponentColor) {
                opponentNeighbors++;
                // Higher value for blocking cells with more balls
                value += cell.balls * 0.2;
            }
        }
    }
    
    // Check diagonal neighbors
    const diagonals = [
        {row: -1, col: -1}, {row: -1, col: 1}, 
        {row: 1, col: -1}, {row: 1, col: 1}
    ];
    
    for (const dir of diagonals) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            if (cell.color === opponentColor) {
                opponentDiagonalNeighbors++;
            }
        }
    }
    
    // Blocking opponent clusters
    if (opponentNeighbors >= 2) {
        value += 1.0;
    }
    
    // Being near lots of opponent pieces (direct + diagonal)
    if (opponentNeighbors + opponentDiagonalNeighbors >= 3) {
        value += 0.5;
    }
    
    return value;
}

// Evaluate explosion with risk assessment for more strategic decisions
function evaluateExplosionWithRiskAssessment(row, col, aiColor, playerColor, isVulnerable) {
    // Start with the basic explosion simulation
    let score = simulateExplosion(row, col, aiColor);
    
    // If the AI is vulnerable, do a more careful risk assessment
    if (isVulnerable) {
        // Simulate the full explosion chain to see its outcome
        const simulationResult = simulateFullExplosion(row, col, aiColor);
        
        // Count how many of our cells/balls remain after the explosion
        let remainingAiCells = 0;
        let remainingAiBalls = 0;
        
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = simulationResult.simulatedBoard[r][c];
                if (cell.color === aiColor) {
                    remainingAiCells++;
                    remainingAiBalls += cell.balls;
                }
            }
        }
        
        // If the explosion would leave us with very few cells, it's risky
        if (remainingAiCells <= 2) {
            score -= 10; // Heavy penalty for leaving us vulnerable
        }
        
        // If the explosion would eliminate the player, it's a winning move
        if (simulationResult.eliminatesColor(playerColor)) {
            score += 100; // Huge bonus for winning
        }
        
        // If the explosion converts many opponent cells, it might be worth the risk
        const conversionBonus = simulationResult.capturedColors.has(playerColor) ? 3 : 0;
        score += conversionBonus;
    }
    
    return score;
}

// Determine game stage based on board analysis
function determineGameStage(analysis) {
    const totalBalls = analysis.totalBalls;
    const maxPossibleBalls = GRID_SIZE * GRID_SIZE * 3; // Theoretical maximum
    
    if (totalBalls < maxPossibleBalls * 0.2) {
        return 'opening';
    } else if (totalBalls < maxPossibleBalls * 0.6) {
        return 'midgame';
    } else {
        return 'endgame';
    }
}

// Analyze the board to get comprehensive information about game state
function analyzeBoard() {
    const colorCount = {}; // Track balls by color
    const colorCells = {}; // Track cells containing each color
    const colorClusters = {}; // Track clusters of same color
    let totalBalls = 0;
    
    // Initialize tracking objects
    for (const color of COLORS) {
        colorCount[color] = 0;
        colorCells[color] = [];
        colorClusters[color] = [];
    }
    
    // Count balls and cells by color
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = gameState.board[row][col];
            if (cell.balls > 0 && cell.color) {
                colorCount[cell.color] += cell.balls;
                colorCells[cell.color].push({row, col, balls: cell.balls});
                totalBalls += cell.balls;
            }
        }
    }
    
    // Find clusters of each color
    for (const color of COLORS) {
        if (colorCells[color].length > 0) {
            colorClusters[color] = findClusters(colorCells[color]);
        }
    }
    
    return {
        colorCount,
        colorCells,
        colorClusters,
        totalBalls
    };
}

// Find clusters of connected cells with the same color
function findClusters(colorCells) {
    const clusters = [];
    const visited = new Set();
    
    for (const cell of colorCells) {
        const cellKey = `${cell.row}-${cell.col}`;
        if (!visited.has(cellKey)) {
            const cluster = [];
            exploreCluster(cell, colorCells, visited, cluster);
            clusters.push(cluster);
        }
    }
    
    return clusters;
}

// Helper function to explore connected cells recursively
function exploreCluster(cell, allCells, visited, cluster) {
    const cellKey = `${cell.row}-${cell.col}`;
    if (visited.has(cellKey)) return;
    
    visited.add(cellKey);
    cluster.push(cell);
    
    // Check all 4 directions
    for (const dir of DIRECTIONS) {
        const newRow = cell.row + dir.row;
        const newCol = cell.col + dir.col;
        const newCellKey = `${newRow}-${newCol}`;
        
        // Find if this adjacent cell exists in our color cells
        const adjacentCell = allCells.find(c => c.row === newRow && c.col === newCol);
        if (adjacentCell && !visited.has(newCellKey)) {
            exploreCluster(adjacentCell, allCells, visited, cluster);
        }
    }
}

// Check if the AI has a winning move that can eliminate the last opponent
function findWinningMove(board, aiColor, playerColor) {
    // Count player's cells and balls
    let playerCells = 0;
    let playerCellPositions = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = board[row][col];
            if (cell.color === playerColor) {
                playerCells++;
                playerCellPositions.push({row, col, balls: cell.balls});
            }
        }
    }
    
    // If player has very few cells, look for a winning explosion
    if (playerCells <= 3) {
        // Check all AI cells with 3 balls to see if they can eliminate player
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = board[row][col];
                if (cell.color === aiColor && cell.balls === 3) {
                    // Simulate explosion to see if it would eliminate the player
                    const simulationResult = simulateFullExplosion(row, col, aiColor);
                    if (simulationResult.eliminatesColor(playerColor)) {
                        return {row, col, priority: 5, score: 1000}; // Highest possible score
                    }
                }
            }
        }
    }
    
    return null;
}

// Simulate a full explosion chain to see if it eliminates a color
function simulateFullExplosion(startRow, startCol, explosionColor) {
    // Create a deep copy of the board for simulation
    const simulatedBoard = JSON.parse(JSON.stringify(gameState.board));
    const visitedCells = new Set();
    const explosionQueue = [{row: startRow, col: startCol}];
    const capturedColors = new Set();
    let eliminatedColors = new Set();
    
    // Add the initial 4th ball to trigger explosion
    simulatedBoard[startRow][startCol].balls++;
    
    // Process all chain reactions
    while (explosionQueue.length > 0) {
        const {row, col} = explosionQueue.shift();
        const cellKey = `${row}-${col}`;
        
        if (visitedCells.has(cellKey) || simulatedBoard[row][col].balls <= 3) continue;
        
        visitedCells.add(cellKey);
        
        // Track the color being replaced if any
        if (simulatedBoard[row][col].color !== explosionColor && simulatedBoard[row][col].color !== null) {
            capturedColors.add(simulatedBoard[row][col].color);
        }
        
        // Reset the exploding cell
        simulatedBoard[row][col].balls = 0;
        simulatedBoard[row][col].color = null;
        
        // Process all four directions
        for (const dir of DIRECTIONS) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            
            // Check if in bounds
            if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                // If the cell had a different color, record it
                if (simulatedBoard[newRow][newCol].color !== null && 
                    simulatedBoard[newRow][newCol].color !== explosionColor) {
                    capturedColors.add(simulatedBoard[newRow][newCol].color);
                }
                
                // Add a ball and set color
                if (simulatedBoard[newRow][newCol].balls === 0) {
                    simulatedBoard[newRow][newCol].balls = 1;
                    simulatedBoard[newRow][newCol].color = explosionColor;
                } else {
                    simulatedBoard[newRow][newCol].balls++;
                    simulatedBoard[newRow][newCol].color = explosionColor;
                    
                    // If this causes another explosion, add it to the queue
                    if (simulatedBoard[newRow][newCol].balls > 3) {
                        explosionQueue.push({row: newRow, col: newCol});
                    }
                }
            }
        }
    }
    
    // Check if any colors were completely eliminated
    for (const capturedColor of capturedColors) {
        let colorStillExists = false;
        
        // Check if the color still exists anywhere on the board
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (simulatedBoard[row][col].color === capturedColor) {
                    colorStillExists = true;
                    break;
                }
            }
            if (colorStillExists) break;
        }
        
        if (!colorStillExists) {
            eliminatedColors.add(capturedColor);
        }
    }
    
    // Return an object with the simulation results
    return {
        capturedColors,
        eliminatedColors,
        simulatedBoard,
        eliminatesColor: (color) => eliminatedColors.has(color)
    };
}

// Simulate the immediate explosion (without full chain reactions) to evaluate its value
function simulateExplosion(row, col, color) {
    let score = 2; // Base score for any explosion
    const playerColor = gameState.players[0].color;
    
    // Higher score for explosions that capture opponent pieces
    let capturesOpponent = false;
    let captureValue = 0;
    let chainReactionPotential = 0;
    
    // Check all four directions
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const targetCell = gameState.board[newRow][newCol];
            
            // Target opponent pieces - especially valuable if they have multiple balls
            if (targetCell.color !== null && targetCell.color !== color) {
                capturesOpponent = true;
                // Higher score for capturing the player's color vs other AI colors (in multiplayer)
                const captureMultiplier = (targetCell.color === playerColor) ? 3 : 2;
                captureValue += targetCell.balls * captureMultiplier;
                
                // Extra value for capturing cells that are about to explode
                if (targetCell.balls == 3) {
                    captureValue += 5;
                }
            }
            
            // Check for chain reaction potential (our cells with 3 balls)
            if (targetCell.color === color && targetCell.balls === 3) {
                chainReactionPotential += 5;
            }
            
            // Check for chain reaction potential (our cells with 2 balls)
            if (targetCell.color === color && targetCell.balls === 2) {
                chainReactionPotential += 2;
            }
        }
    }
    
    // Check if this explosion would lead to a cell with 3 of our balls
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const targetCell = gameState.board[newRow][newCol];
            
            if (targetCell.color === color && targetCell.balls === 2) {
                // This explosion would create a cell with 3 balls, which is valuable for future explosions
                chainReactionPotential += 3;
            }
        }
    }
    
    // Calculate final score
    score += captureValue + chainReactionPotential;
    
    // Bonus for capturing opponent pieces
    if (capturesOpponent) {
        score *= 1.5;
    }
    
    return score;
}

// Evaluate the strategic value of a cell with advanced position analysis
function evaluateAdvancedStrategicValue(row, col, boardAnalysis, gameStage, isVulnerable) {
    const aiColor = aiPlayer.color;
    const playerColor = gameState.players[0].color;
    let score = 2; // Base score
    
    // Check adjacent cells for strategic patterns
    let adjacentAiCells = 0;
    let adjacentOpponentCells = 0;
    let adjacentEmptyCells = 0;
    let patternValue = 0;
    
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            if (cell.balls === 0) {
                adjacentEmptyCells++;
            } 
            else if (cell.color === aiColor) {
                adjacentAiCells++;
                patternValue += cell.balls; // Higher value for being next to our higher ball counts
            } 
            else if (cell.color !== null) {
                adjacentOpponentCells++;
                
                // Higher value for being next to opponent cells we can capture
                if (cell.color === playerColor) {
                    patternValue += cell.balls * 1.5;
                } else {
                    patternValue += cell.balls;
                }
            }
        }
    }
    
    // Strategic pattern recognition
    if (adjacentAiCells >= 2) {
        // Value forming clusters of our color
        score += 3;
    }
    
    if (adjacentOpponentCells >= 2) {
        // Value positioning near multiple opponent cells for potential captures
        score += 2;
    }
    
    // Add position-based value
    score += patternValue;
    
    // Game stage adjustments
    if (gameStage === 'opening') {
        // In opening, prioritize central positions and spreading out
        const centerBonus = getCenterPositionValue(row, col);
        score += centerBonus;
    } 
    else if (gameStage === 'midgame') {
        // In midgame, prioritize building strategic clusters
        if (adjacentAiCells >= 1 && adjacentEmptyCells >= 1) {
            score += 2; // Value having both our cells and room to expand
        }
    }
    else if (gameStage === 'endgame') {
        // In endgame, prioritize aggressive plays against the opponent
        if (adjacentOpponentCells > 0) {
            score += 3; // Value being next to opponent for captures
        }
    }
    
    // Corner positioning is generally less valuable
    if (isCorner(row, col)) {
        score *= 0.8;
    }
    
    return score;
}

// Evaluate the value of adding to a cell with 1 ball
function evaluateBuildingValue(row, col, boardAnalysis, gameStage) {
    const aiColor = aiPlayer.color;
    const playerColor = gameState.players[0].color;
    let score = 1.5; // Base score
    
    // Check if this forms part of a larger structure
    let adjacentAiCells = 0;
    let adjacentAiBalls = 0;
    let adjacentOpponentCells = 0;
    
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            if (cell.color === aiColor) {
                adjacentAiCells++;
                adjacentAiBalls += cell.balls;
                
                // Higher value for being next to our 2-ball cells
                if (cell.balls === 2) {
                    score += 2;
                }
            } 
            else if (cell.color !== null) {
                adjacentOpponentCells++;
                
                // If this builds toward capturing opponent cells
                if (cell.color === playerColor) {
                    score += 1.5;
                }
            }
        }
    }
    
    // Value building connected structures of our color
    if (adjacentAiCells >= 2) {
        score += adjacentAiBalls * 0.5;
    }
    
    // Game stage specific adjustments
    if (gameStage === 'midgame' || gameStage === 'endgame') {
        // Later in the game, prioritize building toward explosions
        if (adjacentOpponentCells > 0) {
            score += 2; // More valuable to build near opponents in later stages
        }
    }
    
    return score;
}

// Evaluate the strategic value of placing in an empty cell
function evaluateEmptyCell(row, col, boardAnalysis, gameStage, isVulnerable) {
    const aiColor = aiPlayer.color;
    const playerColor = gameState.players[0].color;
    let score = 1; // Base score for any empty cell
    
    // Check the pattern of surrounding cells
    let opponentAdjacent = false;
    let opponentCellCount = 0;
    let opponentBallCount = 0;
    let aiCellCount = 0;
    
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            
            // Track adjacency to opponent cells
            if (cell.color !== null && cell.color !== aiColor) {
                opponentAdjacent = true;
                opponentCellCount++;
                opponentBallCount += cell.balls;
                
                // Higher value for being next to human player vs other AI players
                if (cell.color === playerColor) {
                    score += cell.balls * 0.7;
                } else {
                    score += cell.balls * 0.3;
                }
            }
            
            // Track adjacency to our own cells
            if (cell.color === aiColor) {
                aiCellCount++;
                
                // Value connecting to our existing structures
                score += cell.balls * 0.5;
            }
        }
    }
    
    // Strategic positioning based on game stage
    if (gameStage === 'opening') {
        // In opening, value central positioning and spacing
        const centerValue = getCenterPositionValue(row, col);
        score += centerValue;
        
        // In opening, also value starting near the player for early pressure
        if (opponentAdjacent && opponentCellCount === 1) {
            score += 1;
        }
    } 
    else if (gameStage === 'midgame') {
        // In midgame, value building structures
        if (aiCellCount > 0) {
            score += aiCellCount * 0.7;
        }
        
        // Also value positions that threaten opponent structures
        if (opponentCellCount >= 2) {
            score += 1.5;
        }
    }
    else if (gameStage === 'endgame') {
        // In endgame, aggressive positioning is key
        if (opponentAdjacent) {
            score += opponentBallCount * 0.8;
        }
        
        // In endgame, also value connecting to our large structures
        if (aiCellCount >= 2) {
            score += 2;
        }
    }
    
    // Corner positioning is generally less valuable
    if (isCorner(row, col)) {
        score *= 0.8;
    }
    
    return score;
}

// Get value of a position based on center proximity
function getCenterPositionValue(row, col) {
    const centerX = GRID_SIZE / 2 - 0.5;
    const centerY = GRID_SIZE / 2 - 0.5;
    const distanceToCenter = Math.sqrt(Math.pow(row - centerX, 2) + Math.pow(col - centerY, 2));
    const maxDistance = Math.sqrt(Math.pow(GRID_SIZE, 2) + Math.pow(GRID_SIZE, 2)) / 2;
    
    // Convert to a 0-3 value where 3 is center, 0 is corner
    return 3 * (1 - (distanceToCenter / maxDistance));
}

// Check if a position is a corner
function isCorner(row, col) {
    return (row === 0 || row === GRID_SIZE-1) && (col === 0 || col === GRID_SIZE-1);
}

// Check if a position is adjacent to an opponent cluster
function isAdjacentToOpponentCluster(row, col, opponentColor) {
    let adjacentOpponentCells = 0;
    
    for (const dir of DIRECTIONS) {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            const cell = gameState.board[newRow][newCol];
            if (cell.color === opponentColor) {
                adjacentOpponentCells++;
            }
        }
    }
    
    return adjacentOpponentCells >= 2;
}

// Calculate a score based on proximity to opponent pieces
function getOpponentProximityScore(row, col, opponentColor) {
    let score = 0;
    
    // Check all cells on the board for opponent pieces and calculate proximity
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = gameState.board[r][c];
            if (cell.color === opponentColor) {
                const distance = Math.sqrt(Math.pow(row - r, 2) + Math.pow(col - c, 2));
                
                // Closer cells have higher value (inverse relation to distance)
                if (distance <= 2) {
                    score += (cell.balls * (3 - distance));
                }
            }
        }
    }
    
    return score;
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
    // Update the last explosion time
    lastExplosionTime = Date.now();
    
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
                
                // Continue processing the queue after a slight delay
                // This helps ensure animations complete properly
                setTimeout(() => {
                    processExplosionQueue();
                }, 50);
            }, 300);
        } else {
            // Skip this explosion and continue processing
            processExplosionQueue();
        }
    } else {
        // Double check that all animations are complete 
        // This ensures there's no race condition with animation tracking
        if (pendingAnimations > 0) {
            // Some animations are still running, check again after a delay
            setTimeout(() => {
                checkExplosionsComplete();
            }, 100);
        } else {
            // All explosions and animations are complete
            checkExplosionsComplete();
        }
    }
}

// Check if all explosions are complete
function checkExplosionsComplete() {
    if (pendingAnimations === 0 && explosionQueue.length === 0) {
        console.log("All explosions complete");
        
        // Make sure enough time has passed since the last explosion started
        // This is an additional safety check to ensure animations have time to complete
        const timeSinceLastExplosion = Date.now() - lastExplosionTime;
        const minExplosionTime = 500; // Minimum time to wait in milliseconds
        
        if (timeSinceLastExplosion < minExplosionTime) {
            // Not enough time has passed, wait a bit longer
            console.log("Waiting for minimum explosion time...");
            setTimeout(() => checkExplosionsComplete(), minExplosionTime - timeSinceLastExplosion);
            return;
        }
        
        // Clear the processing flag
        isProcessingExplosion = false;
        
        // Check for win condition
        const gameWon = checkWinCondition();
        
        // Only move to next player if game is not won
        if (!gameWon && gameState.status === 'playing') {
            // Add a small delay before moving to next player
            // This ensures all animations are truly complete
            setTimeout(() => {
                moveToNextPlayer();
            }, 300);
        }
        
        // Clear recently exploded cells
        if (gameState.recentlyExploded) {
            gameState.recentlyExploded.clear();
        }
        
        // Update the display
        updateBoardDisplay();
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
    isAiThinking = false;
    aiPlayer = null;
    
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
    
    // Reset AI mode toggle if it was enabled
    if (aiMode) {
        // If we want to keep AI mode enabled, don't reset the toggle
        // aiModeToggle.checked = false;
        // aiMode = false;
        
        // Reset player count buttons
        // playerCountButtons.forEach(btn => btn.disabled = false);
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