import React, { useState } from 'react';

interface AuthProps {
  onLogin: (username: string) => void;
  onCancel: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onCancel }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/register' : '/api/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isRegistering) {
        // Auto switch to login after register or just auto-login
        alert('Registration successful! Please log in.');
        setIsRegistering(false);
        setPassword('');
      } else {
        onLogin(data.username);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black/80 border border-gray-700 p-6 rounded-lg mb-6 max-w-sm mx-auto animate-fade-in shadow-[0_0_20px_rgba(255,0,0,0.15)] relative">
      <button 
        onClick={onCancel}
        className="absolute top-2 right-3 text-gray-500 hover:text-white"
      >
        ✕
      </button>

      <h2 className="text-xl font-display text-red-500 mb-4 text-center">
        {isRegistering ? 'NEW OPERATOR' : 'SYSTEM LOGIN'}
      </h2>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 text-xs p-2 rounded mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-gray-500 font-mono block mb-1">USERNAME</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-red-500 outline-none"
            required
            maxLength={12}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-mono block mb-1">PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-red-500 outline-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`mt-2 py-2 rounded font-bold font-display tracking-wider transition-all ${loading ? 'bg-gray-700 cursor-wait' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'}`}
        >
          {loading ? 'PROCESSING...' : (isRegistering ? 'REGISTER' : 'LOGIN')}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
          }}
          className="text-xs text-gray-400 hover:text-white underline font-mono"
        >
          {isRegistering ? 'ALREADY HAVE AN ACCOUNT? LOGIN' : 'CREATE ACCOUNT'}
        </button>
      </div>
    </div>
  );
};