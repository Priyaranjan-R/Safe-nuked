import React from 'react';
import { AVATARS } from '../types';

interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selectedAvatar, onSelect }) => {
  return (
    <div className="mb-4">
      <label className="text-xs text-gray-400 mb-2 block font-mono">SELECT AVATAR</label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
        {AVATARS.map(av => (
          <button
            key={av}
            onClick={() => onSelect(av)}
            className={`text-2xl p-2 rounded-lg border-2 transition-all flex-shrink-0 ${selectedAvatar === av ? 'border-red-500 bg-red-900/30 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-transparent hover:bg-gray-800'}`}
          >
            {av}
          </button>
        ))}
      </div>
    </div>
  );
};