import React from 'react';
import { Player } from '../types';
import { AvatarSelector } from './AvatarSelector';

interface OnlineLobbyProps {
  lobbyState: 'MENU' | 'CREATE' | 'JOIN';
  setLobbyState: (state: 'MENU' | 'CREATE' | 'JOIN') => void;
  roomCode: string;
  joinCode: string;
  setJoinCode: (code: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedAvatar: string;
  setSelectedAvatar: (avatar: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  players: Player[];
  onBack: () => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  lobbyState,
  setLobbyState,
  roomCode,
  joinCode,
  setJoinCode,
  playerName,
  setPlayerName,
  selectedAvatar,
  setSelectedAvatar,
  onCreateRoom,
  onJoinRoom,
  players,
  onBack
}) => {
  const isPlayerAdded = players.length > 0;

  // Render Waiting Room (After Create/Join)
  if (isPlayerAdded) {
    return (
      <div className="animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-xs text-gray-500 mb-2 font-mono">SECURE CHANNEL ESTABLISHED</div>
          {lobbyState === 'CREATE' ? (
            <div className="mb-6">
               <div className="text-xs text-red-400 mb-1">ROOM ACCESS CODE</div>
               <div className="text-4xl font-display text-white tracking-widest bg-gray-900 border-2 border-red-900 p-4 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] relative group">
                  {roomCode}
                  <button 
                    onClick={() => navigator.clipboard.writeText(roomCode)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-xs px-2 py-1 rounded border border-gray-600 hover:bg-gray-700"
                  >
                    COPY
                  </button>
               </div>
               <p className="text-xs text-gray-500 mt-2 animate-pulse">WAITING FOR TARGETS...</p>
            </div>
          ) : (
            <div className="mb-6">
               <div className="text-lg text-green-500 font-bold mb-2">CONNECTED TO LOBBY</div>
               <div className="text-2xl font-mono bg-gray-900 p-2 rounded border border-green-900 text-gray-400">
                 {joinCode || roomCode}
               </div>
               <p className="text-xs text-gray-500 mt-2 animate-pulse">WAITING FOR HOST TO INITIATE...</p>
            </div>
          )}

          {/* Player List in Lobby */}
          <div className="bg-black/40 p-4 rounded-lg border border-gray-800 mb-4">
             <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider border-b border-gray-800 pb-2">Connected Lifeforms</div>
             <div className="space-y-2">
                {players.map(p => (
                   <div key={p.id} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded">
                      <span className="text-xl">{p.avatar}</span>
                      <span className={`font-bold ${p.isHost ? 'text-red-400' : 'text-gray-300'}`}>
                        {p.name} {p.isHost && '(HOST)'}
                      </span>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Menu (Before Create/Join)
  return (
    <div className="animate-fade-in">
       {lobbyState === 'MENU' && (
         <div className="flex flex-col gap-4">
            <AvatarSelector selectedAvatar={selectedAvatar} onSelect={setSelectedAvatar} />
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">CODENAME</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-3 text-white focus:border-red-500 outline-none text-center font-bold text-lg"
                placeholder="ENTER NAME"
                maxLength={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                onClick={() => {
                   if(!playerName) return;
                   onCreateRoom();
                }}
                disabled={!playerName}
                className="bg-red-900/50 hover:bg-red-800 border border-red-700 py-4 rounded font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CREATE ROOM
              </button>
              <button 
                onClick={() => {
                   if(!playerName) return;
                   setLobbyState('JOIN');
                }}
                disabled={!playerName}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 py-4 rounded font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                JOIN ROOM
              </button>
            </div>
         </div>
       )}

       {lobbyState === 'JOIN' && (
         <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-gray-800 p-2 rounded mb-2">
               <span className="text-2xl">{selectedAvatar}</span>
               <span className="font-bold text-gray-300">{playerName}</span>
               <button onClick={onBack} className="ml-auto text-xs text-gray-500 underline">EDIT</button>
            </div>

            <div>
               <label className="text-xs text-gray-400 mb-1 block text-center">ENTER ACCESS CODE</label>
               <input 
                 type="text" 
                 value={joinCode}
                 onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                 className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-4 text-white text-center tracking-[0.5em] font-mono text-2xl uppercase focus:border-green-500 outline-none placeholder-gray-700"
                 placeholder="XXXXXX"
                 maxLength={6}
               />
            </div>
            
            <button 
              onClick={onJoinRoom}
              disabled={joinCode.length < 6}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-4 rounded font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(21,128,61,0.4)]"
            >
              CONNECT TO MAINFRAME
            </button>
            <button onClick={onBack} className="text-center text-xs text-gray-500 hover:text-white mt-2">CANCEL</button>
         </div>
       )}
    </div>
  );
};