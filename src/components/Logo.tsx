import React from 'react';
import { cn } from '../utils';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  onClick?: () => void;
}

export default function Logo({ className, size = 'md', showText = true, onClick }: LogoProps) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-40 h-40'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  const content = (
    <div className={cn("flex items-center gap-4 group", className)}>
      <div className={cn("relative", sizes[size])}>
        {/* The Shoe Logo (SVG Recreated EXACTLY from Image) */}
        <motion.div
          whileHover={{ x: 5, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="relative w-full h-full"
        >
          <svg 
            viewBox="0 0 1000 1000" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* Speed Lines (Tapered as in the image) */}
            {/* White lines */}
            <path d="M290 365 L460 365 L440 385 L290 385 Z" fill="white" opacity="0.9" />
            <path d="M165 450 L395 450 L375 470 L165 470 Z" fill="white" opacity="0.9" />
            <path d="M110 535 L395 535 L375 555 L110 555 Z" fill="white" opacity="0.9" />
            <path d="M340 620 L610 620 L590 640 L340 640 Z" fill="white" opacity="0.9" />
            
            {/* Neon Green lines */}
            <path d="M235 408 L430 408 L410 428 L235 428 Z" fill="#CCFF00" />
            <path d="M200 493 L425 493 L405 513 L200 513 Z" fill="#CCFF00" />
            <path d="M235 578 L435 578 L415 598 L235 598 Z" fill="#CCFF00" />

            {/* Shoe Upper (White/Grey with shading) */}
            <path 
              d="M465 405 C500 330 550 300 630 330 C680 350 750 450 900 585 C910 595 905 615 890 625 C850 645 780 635 730 615 C680 595 550 500 465 405 Z" 
              fill="white"
            />
            {/* Shading on Upper */}
            <path 
              d="M465 405 C480 380 520 360 560 380 C600 400 650 480 750 580 L730 615 C680 595 550 500 465 405 Z" 
              fill="#E5E5E5"
            />
            
            {/* Neon Green Sole (The thick part) */}
            <path 
              d="M420 440 C435 480 480 530 650 610 C750 655 850 640 860 630 L850 645 C800 665 700 670 600 630 C500 590 430 520 420 440 Z" 
              fill="#CCFF00"
            />
            {/* Darker green / shadow on sole */}
            <path 
              d="M450 500 C500 550 600 600 750 640 L730 650 C600 620 500 570 450 500 Z" 
              fill="#AACC00"
              opacity="0.5"
            />

            {/* Black Details (Heel/Bottom) */}
            <path 
              d="M850 645 C870 640 905 615 890 595 L905 605 C915 625 880 650 850 655 Z" 
              fill="#333333"
            />

            {/* Laces (Black) */}
            <path d="M650 385 L730 405" stroke="black" strokeWidth="12" strokeLinecap="round" />
            <path d="M685 425 L765 445" stroke="black" strokeWidth="12" strokeLinecap="round" />
            <path d="M720 465 L800 485" stroke="black" strokeWidth="12" strokeLinecap="round" />
            <path d="M755 505 L835 525" stroke="black" strokeWidth="12" strokeLinecap="round" />

            {/* Opening of the shoe */}
            <path 
              d="M525 345 C550 320 600 325 630 350 C660 375 680 420 680 420" 
              stroke="black" 
              strokeWidth="8" 
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </motion.div>
      </div>

      {showText && (
        <div className="flex flex-col -space-y-1">
          <span className={cn("font-display font-black italic tracking-tighter text-white uppercase", textSizes[size])}>
            GO<span className="text-neon-green">PACE</span>
          </span>
          <span className="text-[8px] font-mono font-bold tracking-[0.3em] uppercase text-zinc-500 ml-0.5">
            Performance
          </span>
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="focus:outline-none transition-transform active:scale-95"
      >
        {content}
      </button>
    );
  }

  return content;
}
