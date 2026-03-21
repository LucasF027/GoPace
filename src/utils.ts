import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function calculatePace(distanceKm: number, durationSeconds: number): number {
  if (distanceKm === 0) return 0;
  return (durationSeconds / 60) / distanceKm;
}

export type Category = 'Iniciante' | 'Intermediário' | 'Bronze' | 'Prata' | 'Ouro' | 'Elite';

export function getCategory(monthlyKm: number, avgPace: number): Category {
  if (monthlyKm > 250 && avgPace > 0 && avgPace <= 5.0) return 'Elite';
  if (monthlyKm > 150) return 'Ouro';
  if (monthlyKm > 80) return 'Prata';
  if (monthlyKm > 40) return 'Bronze';
  if (monthlyKm > 10) return 'Intermediário';
  return 'Iniciante';
}

export function getCategoryColor(category: Category): string {
  switch (category) {
    case 'Elite': return 'text-neon-green';
    case 'Ouro': return 'text-yellow-400';
    case 'Prata': return 'text-zinc-300';
    case 'Bronze': return 'text-amber-600';
    case 'Intermediário': return 'text-blue-400';
    default: return 'text-zinc-500';
  }
}

export function getCategoryBg(category: Category): string {
  switch (category) {
    case 'Elite': return 'bg-neon-green/10 border-neon-green/20';
    case 'Ouro': return 'bg-yellow-400/10 border-yellow-400/20';
    case 'Prata': return 'bg-zinc-300/10 border-zinc-300/20';
    case 'Bronze': return 'bg-amber-600/10 border-amber-600/20';
    case 'Intermediário': return 'bg-blue-400/10 border-blue-400/20';
    default: return 'bg-zinc-500/10 border-zinc-500/20';
  }
}

export function formatPace(pace: number): string {
  if (pace === 0 || !isFinite(pace) || pace > 600) return "--:-- /km";
  
  const totalSeconds = Math.round(pace * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${pad(m)}:${pad(s)} /km`;
}
