import React from 'react';
import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerIndex }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-6">
      {players.map((player, index) => {
        const isCurrent = index === currentPlayerIndex;
        const isDead = player.status === 'ELIMINATED';
        const isWinner = player.status === 'WINNER';

        return (
          <div 
            key={player.id}
            className={`
              relative flex flex-col items-center justify-center p-2 min-w-[80px] rounded-lg border-2 transition-all duration-300
              ${isDead ? 'border-red-900 bg-red-950 opacity-50 grayscale' : ''}
              ${isCurrent && !isDead ? 'border-yellow-400 bg-yellow-900/30 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)] z-10' : 'border-gray-700 bg-gray-800'}
              ${isWinner ? 'border-green-400 bg-green-900/50 scale-125 shadow-[0_0_20px_rgba(34,197,94,0.7)]' : ''}
            `}
          >
            <div className="text-2xl mb-1">{player.avatar}</div>
            <div className={`font-bold text-xs uppercase ${isCurrent ? 'text-yellow-300' : 'text-gray-400'}`}>
              {player.name}
            </div>
            
            {/* Status Indicators */}
            {isDead && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                 <span className="text-red-600 font-black text-3xl transform -rotate-12 drop-shadow-md">X</span>
              </div>
            )}
            {isCurrent && !isDead && !isWinner && (
               <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 rounded-full animate-bounce">
                 TURN
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
