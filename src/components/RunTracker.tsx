import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Square, 
  MapPin, 
  Timer, 
  Zap, 
  ChevronRight,
  X
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { calculatePace, formatDuration, formatPace } from '../utils';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../firebase-utils';
import RunMap from './RunMap';
import Logo from './Logo';

interface RunTrackerProps {
  onClose: () => void;
  user: UserProfile;
}

export default function RunTracker({ onClose, user }: RunTrackerProps) {
  const [showPermissionRequest, setShowPermissionRequest] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [route, setRoute] = useState<{ lat: number; lng: number }[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isBackground, setIsBackground] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const handleAcceptPermissions = () => {
    setShowPermissionRequest(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsBackground(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Request Wake Lock to keep screen on and GPS active
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (isActive && !isPaused) {
      requestWakeLock();
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);

      if ("geolocation" in navigator) {
        // Request background permission if possible (mostly for mobile browsers)
        if ('permissions' in navigator) {
          navigator.permissions.query({ name: 'geolocation' as any }).then(result => {
            if (result.state === 'granted') {
              console.log('Location permission granted');
            }
          });
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Ignore low accuracy points (more than 30m)
            if (accuracy && accuracy > 30) return;

            const newPoint = { lat: latitude, lng: longitude };
            
            setCurrentPos(newPoint);
            setRoute(prev => {
              if (prev.length > 0) {
                const lastPoint = prev[prev.length - 1];
                const d = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
                // Only add distance if it's more than 5 meters to avoid GPS jitter
                if (d > 0.005) {
                  setDistance(dist => dist + d);
                  return [...prev, newPoint];
                }
                return prev;
              }
              return [newPoint];
            });
          },
          (err) => console.error('GPS Error:', err),
          { 
            enableHighAccuracy: true, 
            maximumAge: 0, // Don't use cached positions
            timeout: 10000 
          }
        );
      }
    } else {
      releaseWakeLock();
      if (timerRef.current) clearInterval(timerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    }

    return () => {
      releaseWakeLock();
      if (timerRef.current) clearInterval(timerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isActive, isPaused]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleFinish = async () => {
    if (distance < 0.01) {
      onClose();
      return;
    }

    setIsSaving(true);
    const pace = calculatePace(distance, time);
    const xpGained = Math.round(distance * 100); // 100 XP per KM
    
    try {
      // Save Run
      await addDoc(collection(db, 'runs'), {
        user_id: user.uid,
        user_name: user.name,
        user_image: user.profile_image || '',
        distance,
        duration: time,
        pace,
        route,
        created_at: serverTimestamp(),
        likes: [],
        comments: []
      });

      // Update User Stats
      const userRef = doc(db, 'users', user.uid);
      const newXpTotal = user.xp_total + xpGained;
      const xpToNextLevel = user.level * 1000;
      const newLevel = Math.floor(newXpTotal / 1000) + 1;
      
      // Streak logic
      let newStreak = user.current_streak;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastDate = user.last_run_date?.split('T')[0];
      
      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      await updateDoc(userRef, {
        xp_total: newXpTotal,
        level: newLevel,
        total_km: increment(distance),
        current_streak: newStreak,
        last_run_date: now.toISOString()
      });

      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'runs/users');
    } finally {
      setIsSaving(false);
    }
  };

  const pace = calculatePace(distance, time);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="fixed inset-0 bg-speed-black z-[60] flex flex-col diagonal-bg overflow-hidden"
    >
      {/* Animated Speed Lines Background */}
      {isActive && !isPaused && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: '-100%', y: `${Math.random() * 100}%` }}
              animate={{ x: '200%' }}
              transition={{ 
                duration: 0.5 + Math.random() * 0.5, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 2
              }}
              className="absolute h-[1px] w-32 bg-gradient-to-r from-transparent via-neon-green to-transparent"
            />
          ))}
        </div>
      )}

      <div className="p-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          {isActive && !isPaused && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-neon-green/80">Rastreamento Ativo</span>
            </div>
          )}
        </div>
        {!isActive && (
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-95">
            <X className="w-7 h-7 text-zinc-500" />
          </button>
        )}
      </div>

      {/* Permission Request Screen */}
      <AnimatePresence>
        {showPermissionRequest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-speed-black flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-24 h-24 bg-neon-green/10 rounded-full flex items-center justify-center mb-8 border border-neon-green/20">
              <MapPin className="w-12 h-12 text-neon-green animate-bounce" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Permissão de GPS</h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-12">
              Para rastrear sua corrida com precisão profissional, precisamos acessar sua localização <span className="text-white font-bold">mesmo quando o app estiver em segundo plano ou com a tela bloqueada</span>.
            </p>
            <div className="space-y-4 w-full max-w-xs">
              <button 
                onClick={handleAcceptPermissions}
                className="w-full bg-neon-green text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(57,255,20,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Permitir e Continuar
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-900 text-zinc-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/5"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Mode Overlay */}
      <AnimatePresence>
        {isBackground && isActive && !isPaused && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-neon-green text-black px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-2xl"
          >
            <MapPin className="w-3 h-3 animate-bounce" />
            Corrida em andamento (Background)
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-16 relative z-10">
        <div className="text-center space-y-2">
          <motion.div 
            key={distance}
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[12rem] font-black italic tracking-tighter text-neon-green font-display leading-none drop-shadow-[0_0_30px_rgba(57,255,20,0.3)]"
          >
            {distance.toFixed(2)}
          </motion.div>
          <div className="text-zinc-500 font-black uppercase tracking-[0.5em] text-sm">Kilômetros</div>
        </div>

        <div className="grid grid-cols-2 gap-16 w-full max-w-md">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Timer className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Tempo</span>
            </div>
            <div className="text-5xl font-black italic tabular-nums font-display">{formatDuration(time)}</div>
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Zap className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Pace</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black italic tabular-nums font-display">{formatPace(pace)}</div>
          </div>
        </div>

        {route.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md h-48 rounded-3xl overflow-hidden border border-white/5 relative"
          >
            <RunMap route={route} className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        )}

        {currentPos && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 text-neon-green/60 text-[10px] font-mono font-bold uppercase tracking-widest"
          >
            <MapPin className="w-3 h-3" />
            Sinal GPS Ativo: {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
          </motion.div>
        )}
      </div>

      <div className="p-16 flex items-center justify-center gap-10 relative z-10">
        {!isActive ? (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleStart}
            className="w-32 h-32 bg-neon-green rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(57,255,20,0.4)] group"
          >
            <Play className="w-14 h-14 text-black fill-current group-hover:scale-110 transition-transform" />
          </motion.button>
        ) : (
          <>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePause}
              className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-white/10 group"
            >
              {isPaused ? (
                <Play className="w-10 h-10 text-white fill-current group-hover:scale-110 transition-transform" />
              ) : (
                <Pause className="w-10 h-10 text-white fill-current group-hover:scale-110 transition-transform" />
              )}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFinish}
              disabled={isSaving}
              className="w-32 h-32 bg-vibrant-orange rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(255,69,0,0.4)] group disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Square className="w-12 h-12 text-white fill-current group-hover:scale-110 transition-transform" />
              )}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
