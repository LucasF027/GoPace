import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Flame, 
  Trophy, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { UserProfile, Run, Ad } from '../types';
import { cn, formatPace, calculatePace } from '../utils';
import { handleFirestoreError, OperationType } from '../firebase-utils';

interface DashboardProps {
  user: UserProfile;
  onStartRun: () => void;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ user, onStartRun, setActiveTab }: DashboardProps) {
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [activeAds, setActiveAds] = useState<Ad[]>([]);

  useEffect(() => {
    const runsQ = query(
      collection(db, 'runs'), 
      where('user_id', '==', user.uid), 
      orderBy('created_at', 'desc'), 
      limit(3)
    );
    const unsubRuns = onSnapshot(runsQ, (snap) => {
      setRecentRuns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Run)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'runs');
    });

    const adsQ = query(collection(db, 'ads'), where('active', '==', true), limit(3));
    const unsubAds = onSnapshot(adsQ, (snap) => {
      setActiveAds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });

    return () => { unsubRuns(); unsubAds(); };
  }, [user.uid]);

  const xpToNextLevel = user.level * 1000;
  const xpProgress = (user.xp_total % xpToNextLevel) / xpToNextLevel * 100;

  return (
    <div className="space-y-10 pb-10">
      {/* Welcome Header */}
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 bg-neon-green rounded-full" />
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">Bem-vindo de volta</span>
          </div>
          <h1 className="text-4xl font-display font-black italic tracking-tighter text-white uppercase leading-none">
            Olá, <span className="text-neon-green">{user.name ? user.name.split(' ')[0] : 'corredor'}</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest mt-1">
            Pronto para superar seus limites hoje?
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600 mb-1">Nível</div>
          <div className="text-4xl font-display font-black italic text-neon-green leading-none">{user.level}</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="px-2 space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Progresso de XP</span>
          <span className="text-xs font-bold italic text-white">{user.xp_total % xpToNextLevel} / {xpToNextLevel} XP</span>
        </div>
        <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-neon-green to-emerald-400 rounded-full relative"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[move-bg_1s_linear_infinite]" />
          </motion.div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="speed-card p-6 space-y-4 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-neon-green/10 rounded-2xl flex items-center justify-center border border-neon-green/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-neon-green" />
            </div>
            <TrendingUp className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="text-4xl font-black italic tracking-tighter text-white font-display leading-none mb-1">{user.total_km.toFixed(1)}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">KM Totais</div>
          </div>
        </div>

        <div className="speed-card p-6 space-y-4 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-vibrant-orange/10 rounded-2xl flex items-center justify-center border border-vibrant-orange/20 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6 text-vibrant-orange" />
            </div>
            <Trophy className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="text-4xl font-black italic tracking-tighter text-white font-display leading-none mb-1">{user.current_streak}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dias Seguidos</div>
          </div>
        </div>
      </div>

      {/* Ad Banner */}
      {activeAds.length > 0 && (
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="relative group cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900 aspect-[21/9] shadow-2xl"
        >
          <img 
            src={activeAds[0].image_url} 
            alt={activeAds[0].title} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-green">Destaque</div>
            </div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{activeAds[0].title}</h3>
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-neon-green rounded-full" />
            <h3 className="font-black italic uppercase tracking-tighter text-lg">Últimas Corridas</h3>
          </div>
          <button onClick={() => setActiveTab('profile')} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-neon-green transition-colors">Ver Histórico</button>
        </div>
        
        <div className="space-y-4">
          {recentRuns.length > 0 ? recentRuns.map((run, idx) => (
            <motion.div 
              key={run.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="speed-card p-5 flex items-center justify-between group cursor-pointer hover:border-neon-green/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-neon-green border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-transparent" />
                  <TrendingUp className="w-7 h-7 relative z-10" />
                </div>
                <div>
                  <div className="font-black italic text-lg tracking-tighter uppercase leading-none mb-1">
                    {run.distance.toFixed(1)} <span className="text-zinc-500 text-xs">KM</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    <Calendar className="w-3 h-3" />
                    {new Date(run.created_at.toDate()).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black italic text-zinc-400 leading-none mb-1">{formatPace(calculatePace(run.distance, run.duration))}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Pace Médio</div>
              </div>
            </motion.div>
          )) : (
            <div className="bg-zinc-900/30 border border-dashed border-white/10 rounded-[2.5rem] p-12 text-center space-y-6">
              <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center text-zinc-600">
                <Play className="w-8 h-8 fill-current opacity-20" />
              </div>
              <p className="text-zinc-500 text-sm italic font-medium">O asfalto está te esperando. Comece sua jornada!</p>
              <button 
                onClick={onStartRun}
                className="inline-flex items-center gap-3 bg-neon-green text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_20px_rgba(57,255,20,0.2)] hover:scale-105 transition-transform"
              >
                <Play className="w-4 h-4 fill-current" />
                Iniciar Corrida
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
