import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Shield, Sparkles, Check } from 'lucide-react';

interface PasswordGeneratorProps {
  onCopyPassword: (password: string) => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  onCopyPassword
}) => {
  const [length, setLength] = useState(20);
  const [useSymbols, setUseSymbols] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    let pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useNumbers) pool += '0123456789';
    if (useSymbols) pool += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let result = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += pool[array[i] % pool.length];
    }
    setPassword(result);
    setCopied(false);
  };

  useEffect(() => {
    generatePassword();
  }, [length, useSymbols, useNumbers]);

  const handleCopy = () => {
    onCopyPassword(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate entropy bits = length * log2(poolSize)
  let poolSize = 52;
  if (useNumbers) poolSize += 10;
  if (useSymbols) poolSize += 28;
  const entropy = Math.round(length * Math.log2(poolSize));

  let strengthLabel = 'Weak';
  let strengthColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  if (entropy > 60 && entropy <= 90) {
    strengthLabel = 'Strong';
    strengthColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  } else if (entropy > 90) {
    strengthLabel = 'Military-Grade';
    strengthColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-sky-400" /> Cryptographic Password Generator
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Generate CSPRNG entropy-driven passwords resilient against GPU brute-force attacks.
        </p>
      </div>

      {/* Output Display Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-700/50 space-y-4">
        <div className="relative flex items-center bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono text-lg text-emerald-400 tracking-wider break-all select-all">
          <span className="flex-1">{password}</span>
          <button
            onClick={generatePassword}
            title="Regenerate"
            className="p-2 text-slate-400 hover:text-sky-400 transition-colors ml-2"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Strength & Entropy Indicator */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400">Entropy Score:</span>
            <span className="font-semibold text-slate-200">{entropy} bits</span>
          </div>
          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${strengthColor}`}>
            {strengthLabel}
          </span>
        </div>
      </div>

      {/* Controls Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-700/50 space-y-5">
        <div>
          <div className="flex justify-between text-sm font-semibold text-slate-200 mb-2">
            <span>Password Length</span>
            <span className="text-sky-400 font-bold">{length} characters</span>
          </div>
          <input
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <span className="text-xs font-medium text-slate-300">Include Numbers (0-9)</span>
            <input
              type="checkbox"
              checked={useNumbers}
              onChange={(e) => setUseNumbers(e.target.checked)}
              className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <span className="text-xs font-medium text-slate-300">Include Symbols (!@#$)</span>
            <input
              type="checkbox"
              checked={useSymbols}
              onChange={(e) => setUseSymbols(e.target.checked)}
              className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
            />
          </label>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" /> Copied! Auto-wiping in 15s
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy & Auto-Wipe (15s)
            </>
          )}
        </button>
      </div>
    </div>
  );
};
