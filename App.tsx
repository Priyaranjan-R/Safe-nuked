import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, CardOption, GameMode, ConnectionType, AVATARS } from './types';
import { generateRoundContent, generateGameMasterCommentary } from './services/geminiService';
import { Card } from './components/Card';
import { PlayerList } from './components/PlayerList';
import { GameMaster } from './components/GameMaster';
import { OnlineLobby } from './components/OnlineLobby';
import { AvatarSelector } from './components/AvatarSelector';
import { Auth } from './components/Auth';

const TURN_TIME_LIMIT = 10; // Seconds for Timed Mode

const App: React.FC = () => {
  // -- State --
  const [status, setStatus] = useState<GameState['status']>('LOBBY');
  const [connection, setConnection] = useState<ConnectionType>('LOCAL');
  const [players, setPlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [deck, setDeck] = useState<CardOption[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [category, setCategory] = useState('');
  const [gmLog, setGmLog] = useState("System initialized. Awaiting players.");
  const [gmThinking, setGmThinking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  
  // Auth State
  const [showAuth, setShowAuth] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

  // Settings
  const [customTopic, setCustomTopic] = useState('');
  const [isManualTraps, setIsManualTraps] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [cardCount, setCardCount] = useState(12);
  const [manualCardInputs, setManualCardInputs] = useState<string[]>([]);
  const [nukeCount, setNukeCount] = useState(4);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [manualActsCount, setManualActsCount] = useState(0); // Track number of trap placements made

  // Online / Lobby Inputs
  const [newPlayerName, setNewPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [onlineLobbyState, setOnlineLobbyState] = useState<'MENU' | 'CREATE' | 'JOIN'>('MENU');

  // Handle Login
  const handleLogin = (username: string) => {
    setLoggedInUser(username);
    setNewPlayerName(username); // Pre-fill the player name input
    setShowAuth(false);
    setGmLog(`User authenticated: ${username}. Welcome back.`);
  };

  // If user logs out (optional, for dev testing mostly)
  const handleLogout = () => {
    setLoggedInUser(null);
    setNewPlayerName('');
    setGmLog("User disconnected.");
  };

  // -- AI Turn Logic --
  useEffect(() => {
    if (!players.length) return;
    
    // Get current player safely
    const currentPlayer = players[currentPlayerIndex];

    // 1. Gameplay Phase AI
    if (status === 'PLAYING' && currentPlayer?.id === 'ai-bot' && currentPlayer.status === 'ALIVE') {
        const timer = setTimeout(() => {
            // Pick random safe-looking card (AI doesn't cheat, it just picks random unrevealed)
            const available = deck.filter(c => !c.isRevealed);
            if (available.length > 0) {
                const randomCard = available[Math.floor(Math.random() * available.length)];
                handleCardClick(randomCard.id);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }

    // 2. Setup Phase AI (Manual Traps)
    if (status === 'SETUP_TRAPS') {
         // Check if quota full using manualActsCount
         if (manualActsCount >= nukeCount) return;

         const placingPlayer = players[manualActsCount % players.length];
         if (placingPlayer?.id === 'ai-bot') {
             const timer = setTimeout(() => {
                 // AI picks any card (can be nuke or not, it doesn't know)
                 const randomCard = deck[Math.floor(Math.random() * deck.length)];
                 handleManualTrapSelect(randomCard.id);
             }, 1000);
             return () => clearTimeout(timer);
         }
    }
  }, [status, currentPlayerIndex, deck, players, nukeCount, manualActsCount]);

  // -- Timed Mode Logic --
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (status === 'PLAYING' && mode === 'TIMED') {
      if (timeLeft > 0) {
        timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        handleTimeOut();
      }
    }
    return () => clearTimeout(timer);
  }, [status, mode, timeLeft, currentPlayerIndex]);

  // Adjust manual inputs if card count changes
  useEffect(() => {
    setManualCardInputs(prev => {
      if (prev.length === cardCount) return prev;
      const newArr = Array(cardCount).fill('');
      prev.forEach((val, i) => { if (i < cardCount) newArr[i] = val; });
      return newArr;
    });
  }, [cardCount]);

  const handleTimeOut = async () => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.status !== 'ALIVE') return;

    setGmThinking(true);
    setGmLog(`Tick tock. Player ${currentPlayer.name} ran out of time. Automatic detonation.`);
    updatePlayerStatus(currentPlayer.id, 'ELIMINATED');
    
    checkWinCondition(currentPlayer.id);
    setGmThinking(false);
  };

  const checkWinCondition = async (dyingPlayerId: string) => {
    const alivePlayers = players.filter(p => p.id !== dyingPlayerId && p.status === 'ALIVE');
    
    // Multiplayer Logic (now handles 1v1 AI too)
    if (alivePlayers.length <= 1) {
       setStatus('GAME_OVER');
       revealAllCards();
       if (alivePlayers.length === 1) {
          updatePlayerStatus(alivePlayers[0].id, 'WINNER');
          const winMsg = await generateGameMasterCommentary('WIN', alivePlayers[0].name);
          setGmLog(winMsg);
       } else {
          setGmLog("Everyone died. How disappointing.");
       }
    } else {
        moveToNextPlayer();
    }
  };

  const revealAllCards = () => {
    setDeck(prev => prev.map(c => ({ ...c, isRevealed: true })));
  };

  // -- Game Logic Methods --

  const addLocalPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim().substring(0, 10),
      status: 'ALIVE',
      avatar: selectedAvatar,
      isHost: players.length === 0
    };
    setPlayers([...players, newPlayer]);
    
    // Only clear if not logged in user (so logged in user doesn't have to retype)
    if (!loggedInUser || newPlayerName !== loggedInUser) {
        setNewPlayerName('');
    }
    
    const nextIndex = (AVATARS.indexOf(selectedAvatar) + 1) % AVATARS.length;
    setSelectedAvatar(AVATARS[nextIndex]);
  };

  const createRoom = () => {
    if (!newPlayerName.trim()) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setOnlineLobbyState('CREATE');
    
    const host: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim().substring(0, 10),
      status: 'ALIVE',
      avatar: selectedAvatar,
      isHost: true
    };
    setPlayers([host]);
  };

  const joinRoom = () => {
    if (!newPlayerName.trim() || !joinRoomCode) return;
    // In a real app, this would verify the code via socket/API
    // For now, we mock joining a room (or creating a client view)
    const guest: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim().substring(0, 10),
      status: 'ALIVE',
      avatar: selectedAvatar,
      isHost: false
    };
    // Mock: If room code matches what we just typed (local simulation), we add to players
    // In real P2P, we'd wait for connection. Here we just show the waiting screen.
    setPlayers([guest]);
    // Mock adding a host if empty for visual demo
    setTimeout(() => {
        if (!players.find(p => p.isHost)) {
           setPlayers(prev => [{ id: 'host-mock', name: 'HOST', status: 'ALIVE', avatar: '🤖', isHost: true }, ...prev]);
        }
    }, 1000);
  };

  const initGameSequence = async () => {
    if (players.length < 1) {
      setGmLog("Error: No lifeforms detected.");
      return;
    }
    
    // Handle Single Player -> AI Opponent
    if (players.length === 1 && connection === 'LOCAL') {
        const aiPlayer: Player = {
            id: 'ai-bot',
            name: 'SYSTEM_AI',
            status: 'ALIVE',
            avatar: '🤖',
            isHost: false
        };
        setPlayers(prev => [...prev, aiPlayer]);
        setGmLog("Single player detected. Adding AI Opponent: SYSTEM_AI.");
    }

    // Phase 1: Determine content source
    if (isManualEntry) {
      setGmLog("Manual Override engaged. Input your deception cards.");
      setStatus('MANUAL_ENTRY');
      return;
    }

    // AI Generation Path
    setStatus('LOADING_ROUND');
    setGmThinking(true);
    setGmLog(mode === 'CUSTOM' ? `Fabricating scenario based on: "${customTopic}"...` : "Initializing death traps...");
    
    const startMsg = await generateGameMasterCommentary('START');
    setGmLog(startMsg);

    await loadNewRound();
  };

  const loadNewRound = async () => {
    const data = await generateRoundContent(mode, currentRound, customTopic, cardCount);
    
    // Create base deck (no nukes yet)
    const rawOptions = data.items.map((text, idx) => ({
      id: `card-${idx}`,
      text,
      isNuke: false, // Will be set later
      isRevealed: false
    }));

    setCategory(data.category);
    setDeck(rawOptions);
    
    // Phase 2: Trap Placement
    if (isManualTraps) {
      setStatus('SETUP_TRAPS');
      setManualActsCount(0); // Reset manual actions counter
      // No log here, logic handles it in render based on turn
      setGmThinking(false);
    } else {
      assignRandomNukes(rawOptions);
    }
  };

  const submitManualCards = () => {
    // Validate inputs
    const filledInputs = manualCardInputs.map(s => s.trim()).filter(s => s.length > 0);
    if (filledInputs.length < cardCount) {
      alert(`Please fill in all ${cardCount} cards.`);
      return;
    }

    const rawOptions = filledInputs.map((text, idx) => ({
      id: `card-${idx}`,
      text,
      isNuke: false,
      isRevealed: false
    }));
    
    setCategory(customTopic || "USER GENERATED CONTENT");
    setDeck(rawOptions);
    
    // Note: Manual Entry disables Manual Traps per user requirement
    assignRandomNukes(rawOptions);
  };

  const assignRandomNukes = (options: CardOption[]) => {
    const newDeck = [...options];
    let nukesPlaced = 0;
    // Safety check to ensure we don't loop forever if nukeCount > cardCount
    const safeNukeCount = Math.min(nukeCount, cardCount - 1);

    while (nukesPlaced < safeNukeCount) {
      const idx = Math.floor(Math.random() * newDeck.length);
      if (!newDeck[idx].isNuke) {
        newDeck[idx].isNuke = true;
        newDeck[idx].placedBy = 'AI';
        nukesPlaced++;
      }
    }
    setDeck(newDeck);
    setGmThinking(false);
    setStatus('PLAYING');
    setTimeLeft(TURN_TIME_LIMIT);
  };

  const handleManualTrapSelect = (cardId: string) => {
    // Check limit
    if (manualActsCount >= nukeCount) return;

    // Identify who is placing this trap
    // We cycle through players: P1 -> P2 -> P3 -> P1...
    const placingPlayer = players[manualActsCount % players.length];

    // NOTE: We allow players to select cards that are ALREADY nukes.
    // This maintains secrecy (you don't know if a card is taken).
    // It also implies multiple players can trap the same card.
    
    setDeck(prev => prev.map(c => {
      if (c.id === cardId) {
        const existingNames = c.placedBy ? c.placedBy + ', ' : '';
        return { 
          ...c, 
          isNuke: true, 
          placedBy: existingNames + placingPlayer.name 
        };
      }
      return c;
    }));
    
    setManualActsCount(prev => prev + 1);
    
    // Optional: Visual confirmation for the player (Flash Log)
    setGmLog(`Sector armed by ${placingPlayer.name}. Securing...`);
    setTimeout(() => {
        // Clear log or reset after delay if needed, 
        // but the render loop will update the player turn immediately.
    }, 1000);
  };

  const confirmManualTraps = () => {
    // Only proceed if we've done all actions
    if (manualActsCount < nukeCount) return;
    
    setGmLog("Traps Armed. Proceed with caution.");
    setStatus('PLAYING');
    setTimeLeft(TURN_TIME_LIMIT);
  };

  const updatePlayerStatus = (id: string, status: Player['status']) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const moveToNextPlayer = () => {
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let loops = 0;
    while (players[nextIndex].status !== 'ALIVE' && loops < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      loops++;
    }
    setCurrentPlayerIndex(nextIndex);
    setTimeLeft(TURN_TIME_LIMIT);
  };

  const handleCardClick = async (cardId: string) => {
    if (status !== 'PLAYING') return;

    const clickedCard = deck.find(c => c.id === cardId);
    if (!clickedCard || clickedCard.isRevealed) return;

    // Reveal Logic
    const newDeck = deck.map(c => c.id === cardId ? { ...c, isRevealed: true } : c);
    setDeck(newDeck);

    const currentPlayer = players[currentPlayerIndex];

    if (clickedCard.isNuke) {
      updatePlayerStatus(currentPlayer.id, 'ELIMINATED');
      setGmThinking(true);
      const msg = await generateGameMasterCommentary('DEATH', currentPlayer.name, clickedCard.text);
      setGmLog(msg);
      setGmThinking(false);

      checkWinCondition(currentPlayer.id);

      const alivePlayers = players.filter(p => p.id !== currentPlayer.id && p.status === 'ALIVE');
      
      // If Single Player or Multiplayer continue
      if (players.length === 1 && alivePlayers.length === 0) {
         // Single player dead
         return; 
      }
      
      if (alivePlayers.length > 1) {
        // Continue game for survivors: reshuffle
        setTimeout(async () => {
           setGmLog("Reshuffling trap matrix...");
           setStatus('LOADING_ROUND');
           
           setTimeout(() => {
              setCurrentRound(prev => prev + 1);
              // Reset card reveals
              const resetDeck = deck.map(c => ({ ...c, isRevealed: false, isNuke: false, placedBy: undefined }));
              
              if (isManualTraps) {
                 setDeck(resetDeck);
                 setStatus('SETUP_TRAPS');
                 setManualActsCount(0);
              } else {
                 assignRandomNukes(resetDeck);
              }
              moveToNextPlayer();
           }, 2000);
        }, 3000);
      }

    } else {
      if (Math.random() > 0.7 && currentPlayer.id !== 'ai-bot') {
        setGmThinking(true);
        generateGameMasterCommentary('SAFE', currentPlayer.name, clickedCard.text).then(msg => {
            setGmLog(msg);
            setGmThinking(false);
        });
      }
      
      const remainingSafe = newDeck.filter(c => !c.isNuke && !c.isRevealed).length;
      if (remainingSafe === 0) {
         setStatus('LOADING_ROUND');
         setGmLog("All safe options exhausted. Reshuffling trap matrix.");
         setTimeout(() => {
            setCurrentRound(prev => prev + 1);
            // Same logic as death: reset deck
            const resetDeck = deck.map(c => ({ ...c, isRevealed: false, isNuke: false, placedBy: undefined }));
             if (isManualTraps) {
                 setDeck(resetDeck);
                 setStatus('SETUP_TRAPS');
                 setManualActsCount(0);
              } else {
                 assignRandomNukes(resetDeck);
              }
            moveToNextPlayer();
         }, 2000);
      } else {
        moveToNextPlayer();
      }
    }
  };

  const restartGame = () => {
    // Clean up players: Remove AI bot and reset Human players
    const realPlayers = players.filter(p => p.id !== 'ai-bot');
    setPlayers(realPlayers.map(p => ({ ...p, status: 'ALIVE' })));
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setStatus('LOBBY');
    setGmLog("System reset. Ready for new victims.");
    setOnlineLobbyState('MENU');
    setRoomCode('');
    setJoinRoomCode('');
  };

  // Helper to determine if we should show settings
  // Show settings if LOCAL OR (ONLINE and we are the HOST)
  const isHost = players.find(p => p.isHost)?.id === players[0]?.id; // Simple check since host is usually first
  const showSettings = connection === 'LOCAL' || (connection === 'ONLINE' && isHost);
  const showLaunchButton = connection === 'LOCAL' || (connection === 'ONLINE' && isHost && players.length > 0);

  // -- 1. LOBBY RENDER --
  if (status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-4 flex flex-col items-center justify-center crt">
        <h1 className="text-5xl md:text-7xl font-display text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600 mb-2 tracking-tighter">
          SAFE / NUKED
        </h1>
        <p className="text-gray-400 mb-8 font-mono">A PARTY BLUFF GAME POWERED BY AI</p>

        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl overflow-y-auto max-h-[85vh] relative">
          
          {/* Auth Section */}
          <div className="flex justify-end gap-3 mb-4 px-1 border-b border-gray-700 pb-2">
             {loggedInUser ? (
                <div className="flex items-center gap-2">
                   <span className="text-xs text-green-400 font-mono">Logged in as {loggedInUser}</span>
                   <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-white font-bold">[LOGOUT]</button>
                </div>
             ) : (
               <button 
                 onClick={() => setShowAuth(true)}
                 className="text-xs text-red-500 hover:text-red-400 font-bold transition-colors animate-pulse"
               >
                 [ SYSTEM LOGIN / REGISTER ]
               </button>
             )}
          </div>

          {/* Render Auth Modal Over content */}
          {showAuth && (
            <div className="mb-6">
               <Auth onLogin={handleLogin} onCancel={() => setShowAuth(false)} />
            </div>
          )}

          {/* Connection Toggle */}
          <div className="flex bg-gray-900 rounded p-1 mb-6 border border-gray-700">
             <button 
               onClick={() => {
                 setConnection('LOCAL');
                 setPlayers([]);
               }}
               className={`flex-1 py-1 rounded text-sm font-bold transition-colors ${connection === 'LOCAL' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
             >
               LOCAL PASS & PLAY
             </button>
             <button 
               onClick={() => {
                 setConnection('ONLINE');
                 setPlayers([]);
                 setOnlineLobbyState('MENU');
               }}
               className={`flex-1 py-1 rounded text-sm font-bold transition-colors ${connection === 'ONLINE' ? 'bg-red-900 text-red-100' : 'text-gray-500 hover:text-gray-300'}`}
             >
               ONLINE (BETA)
             </button>
          </div>

          {connection === 'ONLINE' ? (
             <OnlineLobby 
               lobbyState={onlineLobbyState}
               setLobbyState={setOnlineLobbyState}
               roomCode={roomCode}
               joinCode={joinRoomCode}
               setJoinCode={setJoinRoomCode}
               playerName={newPlayerName}
               setPlayerName={setNewPlayerName}
               selectedAvatar={selectedAvatar}
               setSelectedAvatar={setSelectedAvatar}
               onCreateRoom={createRoom}
               onJoinRoom={joinRoom}
               players={players}
               onBack={() => setOnlineLobbyState('MENU')}
             />
          ) : (
             /* LOCAL PLAYER ENTRY */
             <div className="mb-6 border-b border-gray-700 pb-6">
              <h2 className="text-xl font-bold mb-4 text-white">1. Roster</h2>
              
              <AvatarSelector selectedAvatar={selectedAvatar} onSelect={setSelectedAvatar} />

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocalPlayer()}
                  className={`flex-1 bg-gray-900 border ${loggedInUser && newPlayerName === loggedInUser ? 'border-green-500 text-green-400' : 'border-gray-600'} rounded px-4 py-2 text-white focus:border-red-500 outline-none`}
                  placeholder="Enter Name"
                  maxLength={10}
                />
                <button onClick={addLocalPlayer} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-bold transition-colors">ADD</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {players.map(p => (
                  <span key={p.id} className="bg-gray-900 border border-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <span>{p.avatar}</span> {p.name}
                  </span>
                ))}
              </div>
              {players.length === 1 && <div className="text-xs text-yellow-500 mt-2">Single player detected. AI Opponent will be added on start.</div>}
            </div>
          )}

          {/* Mode Selection & Advanced Settings - Only show if LOCAL or if we are the online HOST */}
          {showSettings && (
          <>
            <div className="mb-6 border-b border-gray-700 pb-6">
              <h2 className="text-xl font-bold mb-4 text-white">2. Protocol</h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['CLASSIC', 'PARTY', 'TIMED', 'CUSTOM'] as GameMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-2 text-sm font-bold rounded border-2 transition-all ${mode === m ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              
              {mode === 'CUSTOM' && (
                <div className="mb-4 animate-fade-in">
                  <label className="text-xs text-gray-400 block mb-1">CUSTOM TOPIC</label>
                  <input 
                    type="text" 
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full bg-gray-900 border border-red-500 rounded px-4 py-2 text-white outline-none"
                    placeholder="e.g. Football Players, Harry Potter Spells..."
                  />
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 text-white">3. Variables</h2>
              
              <div className="mb-6">
                <label className="text-sm text-gray-300 flex justify-between mb-2">
                   <span>Grid Size (Cards)</span>
                   <span className="text-blue-400 font-bold">{cardCount}</span>
                </label>
                <input 
                  type="range" 
                  min="12" 
                  max="24" 
                  step="4"
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm text-gray-300 flex justify-between mb-2">
                   <span>Threat Level (Nukes)</span>
                   <span className="text-red-500 font-bold">{nukeCount}</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max={Math.min(8, cardCount - 4)} 
                  value={nukeCount}
                  onChange={(e) => setNukeCount(Number(e.target.value))}
                  className="w-full accent-red-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Easy</span>
                  <span>Impossible</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                 <label className="text-sm text-gray-300">Manual Card Entry</label>
                 <input 
                   type="checkbox" 
                   checked={isManualEntry}
                   onChange={(e) => {
                     setIsManualEntry(e.target.checked);
                     if(e.target.checked) setIsManualTraps(false);
                   }}
                   className="w-5 h-5 accent-red-600"
                 />
              </div>

              <div className={`flex items-center justify-between mb-2 ${isManualEntry ? 'opacity-50' : ''}`}>
                 <label className="text-sm text-gray-300">Manual Trap Placement</label>
                 <input 
                   type="checkbox" 
                   checked={isManualTraps}
                   disabled={isManualEntry}
                   onChange={(e) => setIsManualTraps(e.target.checked)}
                   className="w-5 h-5 accent-red-600"
                 />
              </div>
            </div>
          </>
          )}

          {showLaunchButton && (
            <button 
              onClick={initGameSequence}
              disabled={players.length < 1 || (mode === 'CUSTOM' && !customTopic && !isManualEntry)}
              className={`w-full py-4 rounded-lg font-display text-xl tracking-widest transition-all ${players.length < 1 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]'}`}
            >
              {connection === 'ONLINE' ? 'LAUNCH SERVER' : 'INITIATE SEQUENCE'}
            </button>
          )}
        </div>

        {/* Donate Footer */}
        <div className="mt-8">
          <button 
            onClick={() => window.open('https://buymeacoffee.com/pryrnjn', '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFDD00] text-black font-bold font-display text-sm hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,221,0,0.3)]"
          >
             <span>☕</span> BUY ME A COFFEE
          </button>
        </div>
      </div>
    );
  }

  // -- 2. MANUAL ENTRY RENDER --
  if (status === 'MANUAL_ENTRY') {
    return (
       <div className="min-h-screen bg-neutral-900 text-white p-4 flex flex-col items-center justify-center crt">
          <h2 className="text-3xl font-display text-red-500 mb-6">MANUAL OVERRIDE</h2>
          <p className="text-gray-400 mb-4">Enter {cardCount} distinct items/phrases.</p>
          
          <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8 overflow-y-auto max-h-[70vh]">
             {manualCardInputs.map((val, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={val}
                  onChange={(e) => {
                     const newArr = [...manualCardInputs];
                     newArr[idx] = e.target.value;
                     setManualCardInputs(newArr);
                  }}
                  className="bg-gray-800 border border-gray-600 rounded p-4 text-center text-white focus:border-red-500 outline-none"
                  placeholder={`Item ${idx + 1}`}
                />
             ))}
          </div>
          
          <button 
            onClick={submitManualCards}
            className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold tracking-widest"
          >
            UPLOAD DATA
          </button>
       </div>
    );
  }

  // -- 3. SETUP TRAPS RENDER --
  if (status === 'SETUP_TRAPS') {
    // Determine whose turn it is to place the trap based on action count
    const placingPlayer = players[manualActsCount % players.length];

    return (
      <div className="min-h-screen bg-neutral-900 text-white p-4 flex flex-col items-center crt">
        <div className="text-center mb-8">
           <h2 className="text-3xl font-display text-red-600 mb-2">TRAP PLACEMENT MODE</h2>
           {placingPlayer.id === 'ai-bot' ? (
              <p className="text-purple-400 font-mono animate-pulse">
                SYSTEM (AI) IS CALCULATING TRAP VECTORS...
              </p>
           ) : (
             <>
               <p className="text-gray-400 mb-2">
                 Pass the device to:
               </p>
               <div className="inline-flex items-center gap-2 bg-gray-800 px-6 py-3 rounded-full border-2 border-red-500 animate-pulse mb-4">
                 <span className="text-3xl">{placingPlayer.avatar}</span>
                 <span className="text-xl font-bold uppercase">{placingPlayer.name}</span>
               </div>
               <p className="text-xs text-red-400 font-mono font-bold tracking-widest uppercase">
                  WARNING: Friendly fire is always on - watch your step!
               </p>
             </>
           )}

           <p className="text-xl font-mono mt-4 text-gray-500">{manualActsCount} / {nukeCount} ARMED</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-6xl mb-8">
          {deck.map((card) => {
            // MASKING: We copy the card and force isNuke to false for rendering only.
            // This ensures players don't see existing traps on the grid.
            const maskedCard = { ...card, isNuke: false };
            
            return (
              <Card 
                key={card.id} 
                option={maskedCard} 
                onClick={handleManualTrapSelect}
                disabled={placingPlayer.id === 'ai-bot'} // Disable human input during AI turn
                isSetupMode={true}
              />
            );
          })}
        </div>

        <button 
          onClick={confirmManualTraps}
          disabled={manualActsCount !== nukeCount}
          className={`px-8 py-4 rounded font-bold font-display tracking-wider text-xl transition-all ${manualActsCount === nukeCount ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
        >
          ARM SYSTEM & BEGIN
        </button>
      </div>
    );
  }

  // -- 4. MAIN GAME RENDER (LOADING_ROUND, PLAYING, GAME_OVER) --
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col crt">
      
      {/* HUD Header */}
      <header className="p-4 bg-black border-b border-gray-800 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="font-display text-xl md:text-2xl text-red-600 tracking-tighter">SAFE / NUKED</h1>
          <div className="text-xs text-gray-500 font-mono">ROUND {currentRound} :: {mode} {players.length === 1 ? '(SOLO)' : ''}</div>
        </div>
        
        {status === 'GAME_OVER' ? (
          <div className="bg-red-900/50 px-4 py-1 rounded text-red-200 font-bold font-display animate-pulse">
            GAME OVER
          </div>
        ) : (
          mode === 'TIMED' && status === 'PLAYING' && (
             <div className={`text-2xl font-mono font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
               00:{timeLeft.toString().padStart(2, '0')}
             </div>
          )
        )}

        <button onClick={restartGame} className="text-xs text-gray-600 hover:text-white underline">
          {status === 'GAME_OVER' ? 'NEW GAME' : 'ABORT'}
        </button>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col relative">
        
        {/* Game Over Summary Banner (replaces overlay so grid is visible) */}
        {status === 'GAME_OVER' && (
           <div className="mb-8 bg-black/80 border border-red-600 p-6 rounded-lg text-center shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-fade-in z-20">
              <h2 className="text-4xl md:text-5xl font-display text-red-500 mb-2">GAME OVER</h2>
              <p className="text-gray-300 font-mono text-lg mb-4">
                {players.length === 1 
                 ? `ROUNDS SURVIVED: ${currentRound - 1}`
                 : (players.find(p => p.status === 'WINNER') 
                    ? `SURVIVOR: ${players.find(p => p.status === 'WINNER')?.name}`
                    : "TOTAL ELIMINATION")
                }
              </p>
              <div className="text-xs text-gray-500 mb-4">ALL TRAP LOCATIONS REVEALED BELOW</div>
              <button 
                onClick={restartGame}
                className="px-8 py-3 bg-white text-black font-bold font-display text-xl rounded hover:bg-gray-200 hover:scale-105 transition-all"
              >
                PLAY AGAIN
              </button>
           </div>
        )}

        {status !== 'GAME_OVER' && <GameMaster log={gmLog} isThinking={gmThinking} />}

        <PlayerList players={players} currentPlayerIndex={currentPlayerIndex} />

        <div className="bg-gray-900/50 p-2 mb-4 rounded border-l-4 border-blue-500">
           <span className="text-blue-400 font-bold text-sm uppercase mr-2">Target Category:</span>
           <span className="text-white font-mono text-lg">{status === 'LOADING_ROUND' ? 'DECRYPTING...' : category}</span>
        </div>

        {status === 'LOADING_ROUND' ? (
           <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
             <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-red-500 font-display tracking-widest animate-pulse">GENERATING HAZARDS...</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
            {deck.map((card) => (
              <Card 
                key={card.id} 
                option={card} 
                onClick={handleCardClick}
                disabled={status !== 'PLAYING' || card.isRevealed}
              />
            ))}
          </div>
        )}
      </main>

    </div>
  );
};

export default App;