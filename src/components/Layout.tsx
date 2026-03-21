import React, { useState, useEffect, ReactNode } from 'react';
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  User, 
  Settings, 
  Menu, 
  X, 
  Play,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { doc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn } from '../utils';

import Logo from './Logo';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onStartRun: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onStartRun }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'feed', label: 'Feed Social', icon: Users },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  if (user?.role === 'Admin') {
    menuItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-speed-black text-white font-sans selection:bg-neon-green/30 diagonal-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-6">
        <button onClick={toggleSidebar} className="p-2.5 hover:bg-white/5 rounded-2xl transition-all active:scale-95">
          <Menu className="w-6 h-6 text-zinc-400" />
        </button>
        
        <Logo onClick={() => setActiveTab('dashboard')} />

        <button 
          onClick={() => setActiveTab('profile')}
          className="w-11 h-11 rounded-2xl bg-zinc-900 overflow-hidden border border-white/10 hover:border-neon-green/50 transition-all active:scale-95"
        >
          {user?.profile_image ? (
            <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <User className="w-6 h-6" />
            </div>
          )}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 bottom-0 w-80 bg-zinc-950 border-r border-white/5 z-50 flex flex-col shadow-2xl"
      >
        <div className="p-8 flex items-center justify-between border-b border-white/5">
          <Logo onClick={() => {
            setActiveTab('dashboard');
            setIsSidebarOpen(false);
          }} />
          <button onClick={toggleSidebar} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-neon-green text-black font-bold shadow-[0_0_20px_rgba(57,255,20,0.3)]" 
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id ? "text-black" : "text-zinc-500 group-hover:text-neon-green")} />
              <span className="tracking-tight">{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute left-0 w-1 h-8 bg-black rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-3">
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-zinc-500 hover:bg-vibrant-orange/10 hover:text-vibrant-orange transition-all duration-300 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-bold uppercase tracking-widest text-xs">Sair da Conta</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FAB - Start Run */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="relative group">
          <div className="absolute -inset-4 bg-neon-green blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onStartRun}
            className="w-20 h-20 bg-neon-green rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.5)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
            <Play className="w-10 h-10 text-black fill-current group-hover:scale-110 transition-transform" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
