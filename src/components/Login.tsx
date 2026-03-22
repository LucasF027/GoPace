import React, { useState } from 'react';
import { Play, LogIn, Zap, Flame, Trophy, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import Logo from './Logo';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login error:", err);
      let message = "Ocorreu um erro ao entrar. Tente novamente.";
      if (err.code === 'auth/popup-blocked') {
        message = "O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site.";
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        message = "O login foi cancelado.";
      } else if (err.code === 'auth/network-request-failed') {
        message = "Erro de rede. Verifique sua conexão e tente novamente.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-speed-black flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-green/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-vibrant-orange/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] diagonal-bg" />
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center space-y-12 max-w-sm relative z-10"
      >
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center"
          >
            <Logo size="xl" />
          </motion.div>
          
          <p className="text-zinc-400 font-medium text-sm leading-relaxed px-4">
            Sua jornada de performance começa aqui. <br/>
            <span className="text-white">Conecte-se, corra e domine o asfalto.</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5">
              <Zap className="w-5 h-5 text-neon-green" />
            </div>
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Velocidade</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5">
              <Flame className="w-5 h-5 text-vibrant-orange" />
            </div>
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Consistência</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Conquista</span>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs text-left"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-display font-black uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </motion.button>
          
          <div className="flex flex-col gap-2">
            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-bold">
              Ao entrar, você concorda com nossos termos de uso.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="w-12 h-[1px] bg-zinc-800" />
              <div className="w-1 h-1 rounded-full bg-neon-green" />
              <div className="w-12 h-[1px] bg-zinc-800" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Decorative Lines */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-20" />
    </div>
  );
}
