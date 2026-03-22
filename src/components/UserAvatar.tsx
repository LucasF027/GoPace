import React, { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, Timestamp, onSnapshot, doc } from 'firebase/firestore';
import { startOfMonth } from 'date-fns';
import { getCategory, cn } from '../utils';

interface UserAvatarProps {
  user?: {
    uid: string;
    name: string;
    profile_image?: string;
  };
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFrame?: boolean;
}

export default function UserAvatar({ user, userId, size = 'md', className, showFrame = true }: UserAvatarProps) {
  const [stats, setStats] = useState({ km: 0, pace: 0 });
  const [userData, setUserData] = useState(user);
  const uid = userId || user?.uid;

  useEffect(() => {
    if (!uid) return;
    
    // Fetch user data if not provided
    if (!user) {
      const unsubUser = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData({ uid: docSnap.id, ...docSnap.data() } as any);
        }
      });
      return () => unsubUser();
    } else {
      setUserData(user);
    }
  }, [uid, user]);

  useEffect(() => {
    if (!uid) return;
    const now = new Date();
    const start = startOfMonth(now);
    const q = query(
      collection(db, 'runs'),
      where('user_id', '==', uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalKm = 0;
      let totalTime = 0;
      const startTimestamp = Timestamp.fromDate(start).seconds;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const createdAt = data.created_at;
        if (createdAt && createdAt.seconds >= startTimestamp) {
          totalKm += Number(data.distance) || 0;
          totalTime += Number(data.duration) || 0;
        }
      });
      const avgPace = totalKm > 0 ? (totalTime / 60) / totalKm : 0;
      setStats({ km: totalKm, pace: avgPace });
    }, (error) => {
      console.error("Error fetching user stats for avatar:", error);
    });
    return unsubscribe;
  }, [uid]);

  const category = getCategory(stats.km, stats.pace);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-32 h-32 text-4xl'
  };

  const frameColors = {
    'Iniciante': 'border-zinc-500',
    'Intermediário': 'border-blue-400',
    'Bronze': 'border-amber-600',
    'Prata': 'border-zinc-300',
    'Ouro': 'border-yellow-400',
    'Elite': 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
  };

  const bgColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 
    'bg-emerald-500', 'bg-orange-500', 'bg-red-500', 'bg-cyan-500'
  ];
  
  // Consistent color based on UID
  const getBgColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return bgColors[Math.abs(hash) % bgColors.length];
  };

  if (!userData && !uid) return null;

  const name = userData?.name || '...';
  const photo = userData?.profile_image;

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div className={cn(
        "rounded-[2.5rem] overflow-hidden flex items-center justify-center font-display font-black italic relative",
        sizeClasses[size],
        showFrame && `border-2 ${frameColors[category]}`,
        !photo && getBgColor(uid || 'default')
      )}>
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-white">{getInitials(name)}</span>
        )}
        
        {/* Elite Glow Effect */}
        {showFrame && category === 'Elite' && (
          <div className="absolute inset-0 border-2 border-yellow-400/50 animate-pulse rounded-[2.5rem]" />
        )}
      </div>

      {/* Elite Crown */}
      {showFrame && category === 'Elite' && (
        <div className={cn(
          "absolute -top-2 -right-1 bg-yellow-400 text-black rounded-full p-1 shadow-lg border border-black z-10",
          size === 'sm' ? 'p-0.5' : 'p-1'
        )}>
          <Crown className={cn(size === 'sm' ? 'w-2 h-2' : 'w-3 h-3', "fill-current")} />
        </div>
      )}
    </div>
  );
}
