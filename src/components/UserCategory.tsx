import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { startOfMonth } from 'date-fns';
import { getCategory } from '../utils';
import CategoryBadge from './CategoryBadge';

interface UserCategoryProps {
  userId: string;
  className?: string;
  showIcon?: boolean;
}

export default function UserCategory({ userId, className, showIcon = true }: UserCategoryProps) {
  const [stats, setStats] = useState({ km: 0, pace: 0 });

  useEffect(() => {
    if (!userId) return;
    const now = new Date();
    const start = startOfMonth(now);
    const q = query(
      collection(db, 'runs'),
      where('user_id', '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalKm = 0;
      let totalTime = 0;
      const startTimestamp = Timestamp.fromDate(start).seconds;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.created_at;
        
        // Filter by month in memory to avoid composite index
        if (createdAt && createdAt.seconds >= startTimestamp) {
          totalKm += Number(data.distance) || 0;
          totalTime += Number(data.duration) || 0;
        }
      });
      const avgPace = totalKm > 0 ? (totalTime / 60) / totalKm : 0;
      setStats({ km: totalKm, pace: avgPace });
    }, (error) => {
      console.error("Error fetching user category stats:", error);
    });
    return unsubscribe;
  }, [userId]);

  return (
    <CategoryBadge 
      category={getCategory(stats.km, stats.pace)} 
      className={className} 
      showIcon={showIcon} 
    />
  );
}
