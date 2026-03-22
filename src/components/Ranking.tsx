import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, MapPin, TrendingUp, Crown, Zap, Flame, ChevronRight, Calendar, Clock, Award } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { UserProfile, Run } from '../types';
import { cn, getCategory, Category } from '../utils';
import { handleFirestoreError, OperationType } from '../firebase-utils';
import { motion, AnimatePresence } from 'motion/react';
import { subDays, startOfMonth, startOfYear, isAfter } from 'date-fns';
import CategoryBadge from './CategoryBadge';

interface RankingProps {
  currentUser: UserProfile;
}

type RankingPeriod = 'weekly' | 'monthly' | 'yearly';

interface RankingEntry {
  user: UserProfile;
  totalKm: number;
  position: number;
  category: Category;
}

export default function Ranking({ currentUser }: RankingProps) {
  const [period, setPeriod] = useState<RankingPeriod>('weekly');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [monthlyRuns, setMonthlyRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all users to have their latest profile info
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsubscribe;
  }, []);

  // Fetch runs for the current month for category calculation
  useEffect(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const q = query(
      collection(db, 'runs'),
      where('created_at', '>=', Timestamp.fromDate(start))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMonthlyRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Run)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'monthly_runs');
    });
    return unsubscribe;
  }, []);

  // Fetch runs based on period
  useEffect(() => {
    setLoading(true);
    let startDate: Date;
    const now = new Date();

    if (period === 'weekly') {
      startDate = subDays(now, 7);
    } else if (period === 'monthly') {
      startDate = startOfMonth(now);
    } else {
      startDate = startOfYear(now);
    }

    const q = query(
      collection(db, 'runs'),
      where('created_at', '>=', Timestamp.fromDate(startDate)),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const runsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Run));
      setRuns(runsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'runs_ranking');
      setLoading(false);
    });

    return unsubscribe;
  }, [period]);

  // Calculate ranking data
  const rankingData = useMemo(() => {
    const kmByUser: Record<string, number> = {};
    const monthlyKmByUser: Record<string, number> = {};
    const monthlyTimeByUser: Record<string, number> = {};
    
    runs.forEach(run => {
      if (!kmByUser[run.user_id]) {
        kmByUser[run.user_id] = 0;
      }
      // Ensure distance is a number and valid
      const dist = Number(run.distance) || 0;
      if (dist > 0) {
        kmByUser[run.user_id] += dist;
      }
    });

    monthlyRuns.forEach(run => {
      const dist = Number(run.distance) || 0;
      const time = Number(run.duration) || 0;
      monthlyKmByUser[run.user_id] = (monthlyKmByUser[run.user_id] || 0) + dist;
      monthlyTimeByUser[run.user_id] = (monthlyTimeByUser[run.user_id] || 0) + time;
    });

    const entries: RankingEntry[] = users
      .filter(user => user.city === currentUser.city)
      .map(user => {
        const mKm = monthlyKmByUser[user.uid] || 0;
        const mTime = monthlyTimeByUser[user.uid] || 0;
        const avgPace = mKm > 0 ? (mTime / 60) / mKm : 0;

        return {
          user,
          totalKm: kmByUser[user.uid] || 0,
          position: 0,
          category: getCategory(mKm, avgPace)
        };
      })
      .filter(entry => entry.totalKm > 0 || entry.user.uid === currentUser.uid)
      .sort((a, b) => b.totalKm - a.totalKm);

    // Assign positions
    return entries.map((entry, index) => ({
      ...entry,
      position: index + 1
    }));
  }, [users, runs, monthlyRuns, currentUser.uid]);

  const topThree = rankingData.slice(0, 3);
  const restOfRanking = rankingData.slice(3);
  const userEntry = rankingData.find(e => e.user.uid === currentUser.uid);

  if (!currentUser.city) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
        <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-white/5 shadow-xl">
          <MapPin className="w-10 h-10 text-neon-green animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-display font-black italic uppercase text-white">Cidade não definida</h3>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest max-w-xs mx-auto">
            Defina sua cidade no seu perfil para ver o ranking regional e competir com outros atletas locais!
          </p>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) return (
    <div className="flex justify-center p-12">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin neon-glow" />
    </div>
  );

  return (
    <div className="space-y-8 pb-32">
      {/* Header & Tabs */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase">Ranking</h2>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-3 h-3 text-neon-green" />
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{currentUser.city || 'Sua Cidade'}</p>
          </div>
        </div>

        <div className="flex bg-zinc-900/50 rounded-2xl p-1 border border-white/5 backdrop-blur-md">
          {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all duration-300",
                period === p 
                  ? "bg-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.4)]" 
                  : "text-zinc-500 hover:text-white"
              )}
            >
              {p === 'weekly' ? 'Semanal' : p === 'monthly' ? 'Mensal' : 'Anual'}
            </button>
          ))}
        </div>
      </div>

      {/* Podium Section */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 pt-12 pb-8 px-2 min-h-[300px]">
        {/* 2nd Place */}
        <div className="flex-1 max-w-[110px]">
          {topThree[1] ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={`pos-2-${period}`}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-400 overflow-hidden p-0.5 shadow-lg">
                  {topThree[1].user.profile_image ? (
                    <img src={topThree[1].user.profile_image} alt={topThree[1].user.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900 rounded-2xl">{topThree[1].user.name[0]}</div>
                  )}
                </div>
                <div className="absolute -top-2 -right-2 bg-zinc-400 text-black w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border-2 border-speed-black shadow-xl">2</div>
                <Medal className="absolute -bottom-2 -left-2 w-6 h-6 text-zinc-400 drop-shadow-lg" />
              </div>
              <div className="text-center w-full">
                <div className="text-[10px] font-display font-black italic text-white truncate uppercase px-1">{topThree[1].user.name}</div>
                <div className="text-[11px] font-mono font-black text-zinc-400 uppercase tracking-tighter">{topThree[1].totalKm.toFixed(1)} KM</div>
              </div>
              <div className="w-full h-16 bg-gradient-to-t from-zinc-800/50 to-zinc-700/50 rounded-t-xl border-x border-t border-white/5 backdrop-blur-sm" />
            </motion.div>
          ) : (
            <div className="h-32 border-2 border-dashed border-white/5 rounded-t-xl" />
          )}
        </div>

        {/* 1st Place */}
        <div className="flex-1 max-w-[130px]">
          {topThree[0] ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={`pos-1-${period}`}
              className="flex flex-col items-center gap-3 -mt-12"
            >
              <div className="relative">
                <Crown className="w-10 h-10 text-neon-green absolute -top-10 left-1/2 -translate-x-1/2 neon-glow animate-bounce" />
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-zinc-800 border-4 border-neon-green overflow-hidden p-1 shadow-[0_0_40px_rgba(57,255,20,0.4)]">
                  {topThree[0].user.profile_image ? (
                    <img src={topThree[0].user.profile_image} alt={topThree[0].user.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900 rounded-2xl">{topThree[0].user.name[0]}</div>
                  )}
                </div>
                <div className="absolute -top-2 -right-2 bg-neon-green text-black w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border-4 border-speed-black shadow-2xl">1</div>
                <Trophy className="absolute -bottom-3 -left-3 w-8 h-8 text-neon-green drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]" />
              </div>
              <div className="text-center w-full">
                <div className="text-xs font-display font-black italic text-neon-green truncate uppercase px-1">{topThree[0].user.name}</div>
                <div className="text-sm font-mono font-black text-white uppercase tracking-tighter">{topThree[0].totalKm.toFixed(1)} KM</div>
              </div>
              <div className="w-full h-24 bg-gradient-to-t from-neon-green/20 to-neon-green/40 rounded-t-2xl border-x border-t border-neon-green/30 backdrop-blur-sm" />
            </motion.div>
          ) : (
            <div className="h-40 border-2 border-dashed border-white/5 rounded-t-2xl" />
          )}
        </div>

        {/* 3rd Place */}
        <div className="flex-1 max-w-[110px]">
          {topThree[2] ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={`pos-3-${period}`}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border-2 border-vibrant-orange overflow-hidden p-0.5 shadow-lg">
                  {topThree[2].user.profile_image ? (
                    <img src={topThree[2].user.profile_image} alt={topThree[2].user.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900 rounded-2xl">{topThree[2].user.name[0]}</div>
                  )}
                </div>
                <div className="absolute -top-2 -right-2 bg-vibrant-orange text-black w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border-2 border-speed-black shadow-xl">3</div>
                <Medal className="absolute -bottom-2 -left-2 w-6 h-6 text-vibrant-orange drop-shadow-lg" />
              </div>
              <div className="text-center w-full">
                <div className="text-[10px] font-display font-black italic text-white truncate uppercase px-1">{topThree[2].user.name}</div>
                <div className="text-[11px] font-mono font-black text-zinc-400 uppercase tracking-tighter">{topThree[2].totalKm.toFixed(1)} KM</div>
              </div>
              <div className="w-full h-12 bg-gradient-to-t from-vibrant-orange/10 to-vibrant-orange/20 rounded-t-xl border-x border-t border-vibrant-orange/20 backdrop-blur-sm" />
            </motion.div>
          ) : (
            <div className="h-28 border-2 border-dashed border-white/5 rounded-t-xl" />
          )}
        </div>
      </div>

      {/* Ranking List */}
      <div className="speed-card overflow-hidden">
        <div className="p-4 bg-zinc-900/50 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neon-green" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">
              {period === 'weekly' ? 'Últimos 7 dias' : period === 'monthly' ? 'Mês Atual' : 'Ano Atual'}
            </span>
          </div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
            {rankingData.length} Atletas em {currentUser.city || 'sua cidade'}
          </div>
        </div>

        <div className="divide-y divide-white/5">
          <AnimatePresence mode="popLayout">
            {restOfRanking.length > 0 ? restOfRanking.map((entry, index) => (
              <motion.div 
                key={`${entry.user.uid}-${period}`} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-5 flex items-center gap-4 transition-all group hover:bg-white/5",
                  entry.user.uid === currentUser.uid ? "bg-neon-green/5 border-l-4 border-neon-green" : ""
                )}
              >
                <div className="w-8 text-center font-display font-black italic text-zinc-600 group-hover:text-white transition-colors">
                  #{entry.position}
                </div>
                
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 p-0.5 group-hover:border-neon-green/50 transition-all">
                  {entry.user.profile_image ? (
                    <img src={entry.user.profile_image} alt={entry.user.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900 rounded-2xl">{entry.user.name[0]}</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm truncate flex items-center gap-2 text-white uppercase tracking-tight">
                    {entry.user.name}
                    {entry.user.uid === currentUser.uid && (
                      <span className="bg-neon-green text-black text-[7px] px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">Você</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CategoryBadge category={entry.category} className="px-1.5 py-0.5 text-[7px]" showIcon={false} />
                    <span className="text-zinc-800">•</span>
                    <div className="flex items-center gap-1 text-neon-green">
                      <Zap className="w-3 h-3 fill-current" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Lvl {entry.user.level}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-display font-black italic tracking-tighter text-neon-green group-hover:scale-110 transition-transform">
                    {entry.totalKm.toFixed(1)}
                  </div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">KM</div>
                </div>
              </motion.div>
            )) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                  <TrendingUp className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Nenhuma atividade registrada neste período</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Current User Fixed Bar (if not in top list) */}
      {userEntry && userEntry.position > 10 && (
        <div className="fixed bottom-24 left-4 right-4 z-50">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-neon-green text-black p-4 rounded-2xl shadow-[0_10px_40px_rgba(57,255,20,0.4)] flex items-center gap-4 border-2 border-speed-black"
          >
            <div className="w-10 text-center font-display font-black italic text-black/50">
              #{userEntry.position}
            </div>
            <div className="w-10 h-10 rounded-xl bg-black/10 overflow-hidden border border-black/10">
              {currentUser.profile_image ? (
                <img src={currentUser.profile_image} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-black font-bold">{currentUser.name[0]}</div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-display font-black italic text-sm uppercase tracking-tight">Sua Posição</div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70">Continue correndo para subir!</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-display font-black italic tracking-tighter">
                {userEntry.totalKm.toFixed(1)}
              </div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-70">KM</div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
