# Neon Connection Game

A real-time multiplayer game with a vibrant neon theme where players compete to dominate the board with their color by strategically placing and exploding balls.

## Game Mechanics

- Each player is assigned a different color (blue, pink, green, or yellow)
- Players take turns to place balls on the grid
- When a player taps an empty grid cell, a ball of their color appears
- Tapping a cell with one ball adds another ball (2 total)
- Tapping a cell with two balls adds a third ball (3 total)
- Tapping a cell with three balls causes an explosion - the balls spread to adjacent cells (up, down, left, right)
- When balls move to a cell containing another player's ball(s), they convert those balls to the current player's color
- The grid color changes based on whose turn it is
- The game ends when one player dominates all cells on the board

## Features

- Vibrant neon-themed UI with glowing elements
- Real-time multiplayer functionality with Firebase (optional)
- Offline mode with AI opponent for practicing
- Chain reaction mechanic for strategic gameplay
- Responsive design that works on various screen sizes

## Technologies Used

- HTML5, CSS3, and JavaScript
- Firebase Realtime Database for multiplayer functionality (optional)
- Firebase Authentication for player identification (optional)
- Custom offline mode with simulated database for playing without Firebase

## Setup Instructions

### Option 1: Play in Offline Mode (Default)

Just open the `index.html` file in your browser, and the game will automatically run in offline demo mode with an AI opponent.

### Option 2: Set Up with Firebase for Real Multiplayer

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Firebase Realtime Database and Anonymous Authentication
3. Update the Firebase configuration in the `firebase-config.js` file with your own Firebase project credentials
4. Host the files on a web server or use Firebase Hosting to deploy the game

```javascript
// firebase-config.js
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## How to Play

1. Open the game in your web browser
2. Enter your name and click "Join Game"
3. In offline mode, an AI opponent will automatically join
4. In online mode, wait for other players to join (minimum 2 players required)
5. When it's your turn, click on any cell to place or add balls
6. Try to strategically place balls to create chains of explosions
7. The first player to dominate the entire board with their color wins!

## Game Strategy Tips

- Focus on creating clusters of 3 balls to trigger explosions
- Try to position your balls near opponent's cells to convert them when exploding
- Pay attention to the chain reactions as they can quickly change the board state
- Block opponents who are creating large clusters of their color

## Customizing the Theme

The game uses CSS variables for easy color customization. You can modify the neon colors in the `styles.css` file:

```css
:root {
    --neon-blue: #00f3ff;
    --neon-pink: #ff00ff;
    --neon-green: #0dff00;
    --neon-yellow: #ffff00;
    --neon-orange: #ff9500;
    --background: #000000;
    /* ... other variables ... */
}
```

## Future Enhancements

- Support for custom game room creation
- Ability to choose your color
- Different board sizes
- Time limits for each turn
- Game statistics tracking
- Mobile app version
- More advanced AI opponent with different difficulty levels

## License

MIT License # Connect
