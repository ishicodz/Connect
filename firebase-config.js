// Local storage configuration for the game
// No need for actual Firebase connection - using local storage only
const firebaseConfig = {
    apiKey: "offline-mode",
    authDomain: "offline-mode",
    databaseURL: "offline-mode",
    projectId: "offline-mode",
    storageBucket: "offline-mode",
    messagingSenderId: "offline-mode",
    appId: "offline-mode"
};

// Mock Firebase database with local storage
let database;

// Set up local storage for the game
function setupOfflineMode() {
    // Initial game state
    const localGameState = {
        status: 'waiting',
        currentTurn: null,
        players: {},
        board: null,
        lastUpdated: Date.now()
    };
    
    // Keep track of event listeners
    let listeners = {};
    
    // Create a mock database interface
    database = {
        ref: (path) => {
            return {
                set: (data) => {
                    const pathParts = path.split('/');
                    let current = localGameState;
                    
                    for (let i = 1; i < pathParts.length - 1; i++) {
                        if (pathParts[i] === '') continue;
                        
                        if (!current[pathParts[i]]) {
                            current[pathParts[i]] = {};
                        }
                        current = current[pathParts[i]];
                    }
                    
                    const lastPart = pathParts[pathParts.length - 1];
                    if (lastPart !== '') {
                        current[lastPart] = JSON.parse(JSON.stringify(data)); // Deep copy
                    } else {
                        Object.assign(current, JSON.parse(JSON.stringify(data))); // Deep copy
                    }
                    
                    // Trigger any listeners for this path or parent paths
                    triggerListeners(path, data);
                    
                    return Promise.resolve();
                },
                update: (data) => {
                    const pathParts = path.split('/');
                    let current = localGameState;
                    
                    for (let i = 1; i < pathParts.length; i++) {
                        if (pathParts[i] === '') continue;
                        
                        if (!current[pathParts[i]]) {
                            current[pathParts[i]] = {};
                        }
                        current = current[pathParts[i]];
                    }
                    
                    // Deep copy the data and merge with current
                    const dataCopy = JSON.parse(JSON.stringify(data));
                    Object.assign(current, dataCopy);
                    
                    // Trigger any listeners for this path or parent paths
                    triggerListeners(path, current);
                    
                    return Promise.resolve();
                },
                once: (event) => {
                    return Promise.resolve({
                        val: () => {
                            const pathParts = path.split('/');
                            let current = localGameState;
                            
                            for (let i = 1; i < pathParts.length; i++) {
                                if (pathParts[i] === '') continue;
                                
                                if (!current || !current[pathParts[i]]) {
                                    return null;
                                }
                                current = current[pathParts[i]];
                            }
                            
                            return JSON.parse(JSON.stringify(current)); // Return deep copy
                        }
                    });
                },
                on: (event, callback) => {
                    if (!listeners[path]) {
                        listeners[path] = [];
                    }
                    listeners[path].push(callback);
                    
                    // Immediately call with current value
                    callback({
                        val: () => {
                            const pathParts = path.split('/');
                            let current = localGameState;
                            
                            for (let i = 1; i < pathParts.length; i++) {
                                if (pathParts[i] === '') continue;
                                
                                if (!current || !current[pathParts[i]]) {
                                    return null;
                                }
                                current = current[pathParts[i]];
                            }
                            
                            return JSON.parse(JSON.stringify(current)); // Return deep copy
                        }
                    });
                }
            };
        }
    };
    
    // Helper function to trigger listeners
    function triggerListeners(path, data) {
        // Trigger exact path listeners
        if (listeners[path]) {
            listeners[path].forEach(callback => {
                callback({
                    val: () => JSON.parse(JSON.stringify(data))
                });
            });
        }
        
        // Trigger game root listeners when any path changes
        if (path.startsWith('games/default-game/') && listeners['games/default-game']) {
            listeners['games/default-game'].forEach(callback => {
                callback({
                    val: () => JSON.parse(JSON.stringify(localGameState))
                });
            });
        }
    }
}

// Initialize database in local storage mode
    setupOfflineMode();

console.log("Game running in local multiplayer mode"); 