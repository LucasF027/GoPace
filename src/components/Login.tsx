import React from 'react';
import { Play, LogIn, Zap, Flame, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import Logo from './Logo';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
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
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            className="w-full bg-white text-black font-display font-black uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:bg-zinc-100 transition-all"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
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
