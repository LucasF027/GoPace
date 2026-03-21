import React from 'react';
import { Crown } from 'lucide-react';
import { Category, getCategoryColor, getCategoryBg, cn } from '../utils';

interface CategoryBadgeProps {
  category: Category;
  className?: string;
  showIcon?: boolean;
}

export default function CategoryBadge({ category, className, showIcon = true }: CategoryBadgeProps) {
  const colorClass = getCategoryColor(category);
  const bgClass = getCategoryBg(category);

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
      colorClass,
      bgClass,
      className
    )}>
      {showIcon && category === 'Elite' && (
        <Crown className="w-3 h-3 fill-current animate-pulse" />
      )}
      {category}
    </div>
  );
}
