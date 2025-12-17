import React, { useEffect, useState } from 'react';

interface GameMasterProps {
  log: string;
  isThinking: boolean;
}

export const GameMaster: React.FC<GameMasterProps> = ({ log, isThinking }) => {
  // Typewriter effect state
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const speed = 30; // ms per char
    
    if (!log) return;

    const interval = setInterval(() => {
      if (i < log.length) {
        setDisplayedText((prev) => prev + log.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [log]);

  return (
    <div className="w-full bg-black border-t-4 border-b-4 border-purple-600 p-4 mb-4 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
      <div className="max-w-4xl mx-auto flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-16 h-16 rounded-full border-2 border-purple-500 flex items-center justify-center bg-gray-900 overflow-hidden ${isThinking ? 'animate-pulse shadow-[0_0_15px_#a855f7]' : ''}`}>
            <span className="text-3xl">👁️‍🗨️</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-purple-700 text-xs px-2 py-0.5 rounded text-white font-bold">
            AI-GM
          </div>
        </div>

        {/* Chat Bubble */}
        <div className="flex-1">
          <div className="text-purple-400 text-xs font-bold tracking-wider mb-1 uppercase font-display">
            System Message {isThinking && <span className="animate-pulse">...PROCESSING</span>}
          </div>
          <p className="text-gray-100 font-mono text-sm md:text-lg leading-relaxed min-h-[3rem]">
            {displayedText}
            <span className="animate-pulse inline-block w-2 h-4 bg-purple-500 ml-1 align-middle"></span>
          </p>
        </div>
      </div>
    </div>
  );
};
