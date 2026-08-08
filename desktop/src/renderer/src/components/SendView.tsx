import React, { useState } from 'react';
import { Send, Copy, Check, ShieldAlert, Clock, Flame, Sparkles } from 'lucide-react';

export const SendView: React.FC = () => {
  const [secretText, setSecretText] = useState('');
  const [expireOption, setExpireOption] = useState('86400'); // 24 hours
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretText.trim()) {
      setErrorMsg('Please enter a secret message or password to share.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const api = (window as any).lockpyAPI;
      if (api?.createSend) {
        const res = await api.createSend(secretText.trim(), parseInt(expireOption, 10), 1);
        if (res && res.status === 'ok' && res.share_url) {
          setGeneratedUrl(res.share_url);
        } else {
          setErrorMsg(res?.message || 'Failed to create send link.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating send link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const resetForm = () => {
    setGeneratedUrl('');
    setSecretText('');
    setErrorMsg('');
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-sky-400" /> LockPy Send
        </h2>
        <p className="text-xs text-slate-400">
          Compartilhe senhas, notas ou textos confidenciais através de links efêmeros criptografados de leitura única.
        </p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800/80 p-6 space-y-5">
        {generatedUrl ? (
          <div className="space-y-5 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Flame className="w-4 h-4 text-emerald-400" /> Link de Uso Único Gerado!
              </div>
              <p className="text-xs text-slate-300">
                Garantia Zero-Knowledge: A chave de criptografia foi colocada no fragmento `#key=...` da URL e nunca sai do seu computador.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Link Compartilhável (Se auto-destrói após a leitura / expiração)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 px-3.5 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-sky-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-5 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500">Envie o link para a pessoa desejada.</span>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Gerar Outro Segredo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerateLink} className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Texto ou Senha Confidencial para Compartilhar *
              </label>
              <textarea
                rows={5}
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Cole aqui a senha, chave de Wi-Fi ou mensagem confidencial..."
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" /> Tempo de Expiração do Link
              </label>
              <select
                value={expireOption}
                onChange={(e) => setExpireOption(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="3600">1 Hora (Leitura Única / Destruição Após Leitura)</option>
                <option value="86400">24 Horas (1 Dia)</option>
                <option value="604800">7 Dias</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Segurança Total: O link gerado conterá a chave de abertura apenas no seu navegador. Assim que a pessoa visualizar o link ou o tempo expirar, a informação torna-se 100% irrecuperável.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <Send className="w-4 h-4" /> {loading ? 'Criptografando...' : 'Gerar Link Seguro LockPy Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
