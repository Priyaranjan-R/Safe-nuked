import React from 'react';
import { CardOption } from '../types';

interface CardProps {
  option: CardOption;
  onClick: (id: string) => void;
  disabled: boolean;
  isSetupMode?: boolean;
}

export const Card: React.FC<CardProps> = ({ option, onClick, disabled, isSetupMode }) => {
  // Styles for the card states
  const baseClasses = "relative w-full h-32 cursor-pointer select-none card-flip rounded-xl shadow-lg border-2 border-opacity-50";
  
  if (isSetupMode) {
    return (
      <div 
        className={`perspective-1000 group hover:scale-105 transition-all duration-200`}
        onClick={() => onClick(option.id)}
      >
        <div className={`relative w-full h-32 rounded-xl flex items-center justify-center p-4 text-center border-4 shadow-lg transition-colors ${option.isNuke ? 'bg-red-900 border-red-500' : 'bg-gray-800 border-gray-600'}`}>
           <span className={`font-bold text-sm md:text-base leading-tight ${option.isNuke ? 'text-white' : 'text-gray-400'}`}>
            {option.text}
          </span>
          {option.isNuke && (
            <div className="absolute top-2 right-2 text-xl">☢️</div>
          )}
          {option.isNuke && option.placedBy && (
            <div className="absolute bottom-1 right-2 text-[10px] text-red-300 font-mono">
              BY: {option.placedBy}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`perspective-1000 group ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} transition-all duration-200`}
      onClick={() => !disabled && !option.isRevealed && onClick(option.id)}
    >
      <div className={`${baseClasses} ${option.isRevealed ? 'flipped' : ''} border-gray-700`}>
        
        {/* Front of Card (Hidden State) */}
        <div className="card-face absolute w-full h-full bg-gray-900 flex items-center justify-center rounded-xl p-4 text-center border-2 border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <span className="text-gray-300 font-bold text-sm md:text-base leading-tight">
            {option.text}
          </span>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        </div>

        {/* Back of Card (Revealed State) */}
        <div className={`card-face card-back absolute w-full h-full rounded-xl flex items-center justify-center border-4 ${option.isNuke ? 'bg-red-900 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-green-900 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]'}`}>
          {option.isNuke ? (
             <div className="flex flex-col items-center animate-bounce">
               <span className="text-4xl">☢️</span>
               <span className="text-red-100 font-display uppercase mt-2 font-bold tracking-widest">NUKED</span>
             </div>
          ) : (
            <div className="flex flex-col items-center">
               <span className="text-4xl">🛡️</span>
               <span className="text-green-100 font-display uppercase mt-2 font-bold tracking-widest">SAFE</span>
            </div>
          )}
          
          {/* Show who placed the trap if it's a nuke */}
          {option.isNuke && option.placedBy && (
             <div className="absolute bottom-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white font-mono border border-red-500/50">
               TRAP BY: {option.placedBy}
             </div>
          )}
        </div>

      </div>
    </div>
  );
};