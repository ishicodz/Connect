# Connect

A multiplayer turn-based strategy game with a vibrant neon theme where players compete to dominate the board with their color by strategically placing and exploding balls.

## Game Mechanics

- Play against AI or with friends (2-5 players) on a 6x6 grid
- Each player is assigned a different color (blue, pink, green, yellow, or purple)
- When a player taps an empty grid cell, a ball of their color appears
- Tapping a cell with one ball adds another ball (2 total)
- Tapping a cell with two balls adds a third ball (3 total)
- Tapping a cell with three balls adds a fourth ball and causes an explosion - the balls spread to adjacent cells (up, down, left, right)
- When balls move to a cell containing another player's ball(s), they convert those balls to the current player's color
- The game ends when only one color remains on the board - that player wins!

## Features

- **Single-player AI mode** with three difficulty levels:
  - **Easy**: Makes occasional random moves and misses obvious strategic opportunities
  - **Medium**: Balanced AI that makes reasonably competitive moves
  - **Hard**: Advanced AI that uses strategic evaluation and aggressive tactics
- Vibrant neon-themed UI with glowing elements and animations
- Support for 2-5 players on the same device
- Chain reaction mechanics for strategic gameplay
- Dynamic board coloring and visual feedback
- Explosion animations with particle effects
- Victory celebration with confetti animation
- Responsive design that works on various screen sizes
- Improved win condition detection for all game modes

## How to Play

1. Select game mode (single-player vs AI or multiplayer)
2. Choose AI difficulty or select the number of players (2-5)
3. Enter names for each player
4. Click "Start Game" to begin
5. Players take turns clicking on cells to place or add balls
6. Try to strategically place balls to create chains of explosions
7. The last player with balls remaining on the board wins!

## Game Strategy Tips

- Focus on creating clusters of 3 balls to trigger explosions
- Try to position your balls near opponent's cells to convert them when exploding
- Pay attention to the chain reactions as they can quickly change the board state
- In multiplayer games, be cautious of getting caught between two players who might target you
- Corner positions can be strategic as they only have two adjacent cells
- When playing against AI on hard difficulty, focus on defensive positioning and avoid leaving vulnerable cells

## Advanced Strategy

- **Early Game**: Focus on territory expansion by placing balls in spread-out positions
- **Mid Game**: Build strategic clusters of 2 balls that can be triggered later
- **Late Game**: Look for chain reaction opportunities that can eliminate opponent colors
- **Defensive Play**: Create buffer zones around your territory with single balls
- **Offensive Play**: Position your balls adjacent to opponent clusters to capture them when you explode

## Online Access

You can play the game online at [https://connect-one-woad.vercel.app/](https://connect-one-woad.vercel.app/)

## Technical Details

- Built with vanilla JavaScript, HTML5, and CSS3
- Employs requestAnimationFrame for smooth animations
- Uses strategic AI algorithms with difficulty scaling
- Responsive design using CSS Grid and Flexbox
- All styles and scripts bundled in the HTML for optimal loading performance

## Deployment

The game is deployed using Vercel for easy hosting and automatic updates when the code changes.

## Future Enhancements

- Online multiplayer mode
- Game statistics and player profiles
- Customizable game board sizes
- Additional visual themes
- Sound effects and background music

## License

MIT License
