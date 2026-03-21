import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Megaphone, 
  Users, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ExternalLink,
  Settings
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc, getDocs, query, where } from 'firebase/firestore';
import { Ad, UserProfile, Run, Event, UserRole } from '../types';
import { cn, calculatePace } from '../utils';
import { Ghost, Sparkles, Wand2, Activity, UserPlus, Edit2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../firebase-utils';
import { motion, AnimatePresence } from 'motion/react';

const GHOST_NAMES = [
  'Ricardo Silva', 'Mariana Costa', 'Bruno Oliveira', 'Ana Paula', 
  'Carlos Eduardo', 'Fernanda Lima', 'Gabriel Santos', 'Juliana Rocha',
  'Lucas Mendes', 'Beatriz Alves', 'Tiago Souza', 'Camila Ferreira',
  'Rodrigo Lima', 'Vanessa Costa', 'André Santos', 'Patrícia Oliveira'
];

const EVENT_TEMPLATES = [
  {
    title: 'Maratona da Madrugada GOPace',
    description: 'Um desafio épico sob as estrelas. Percurso de 42km com hidratação premium e medalha exclusiva.',
    location: 'Parque do Ibirapuera, SP',
    image: 'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?auto=format&fit=crop&q=80&w=1200',
  },
  {
    title: 'Sprint de Verão 5K',
    description: 'Corrida rápida de 5km na orla. Perfeito para bater seu recorde pessoal.',
    location: 'Copacabana, RJ',
    image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80&w=1200',
  },
  {
    title: 'Trail Run Montanha',
    description: 'Desafio técnico em trilhas de montanha. 15km de pura adrenalina e natureza.',
    location: 'Serra da Mantiqueira, MG',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=1200',
  }
];

export default function Admin() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showAddAd, setShowAddAd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isSeeding, setIsSeeding] = useState(false);
  const [showGhostModal, setShowGhostModal] = useState(false);
  const [editingGhost, setEditingGhost] = useState<UserProfile | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const seedInitialData = async () => {
    setIsSeeding(true);
    try {
      // 1. Seed 1 Ghost
      const name = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
      const ghostId = `ghost_${Math.random().toString(36).substr(2, 9)}`;
      const totalKm = Math.random() * 500 + 50;
      const level = Math.floor(totalKm / 50) + 1;
      
      const ghostData: any = {
        name,
        role: 'Ghost',
        xp_total: level * 1000 + Math.floor(Math.random() * 500),
        level,
        total_km: totalKm,
        current_streak: Math.floor(Math.random() * 15),
        profile_image: `https://i.pravatar.cc/150?u=${ghostId}`,
        bio: 'Atleta GOPace focado em performance e superação.',
        city: 'São Paulo, SP'
      };

      await setDoc(doc(db, 'users', ghostId), ghostData);

      // 2. Seed 2 runs for this ghost
      for (let i = 0; i < 2; i++) {
        const distance = Math.random() * 15 + 3;
        const duration = distance * (Math.random() * 120 + 300); // 5-7 min/km
        const pace = (duration / 60) / distance;
        
        await addDoc(collection(db, 'runs'), {
          user_id: ghostId,
          user_name: name,
          user_image: ghostData.profile_image,
          distance,
          duration,
          pace,
          created_at: new Date(Date.now() - Math.random() * 86400000 * 7), // Last 7 days
          likes: [],
          comments: [],
          route: [
            { lat: -23.5505 + (Math.random() - 0.5) * 0.05, lng: -46.6333 + (Math.random() - 0.5) * 0.05 },
            { lat: -23.5505 + (Math.random() - 0.5) * 0.05, lng: -46.6333 + (Math.random() - 0.5) * 0.05 }
          ]
        });
      }

      // 3. Seed 1 Event (using the ghost as creator)
      const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      await addDoc(collection(db, 'events'), {
        ...template,
        date_time: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 30) + 1)).toISOString(),
        created_by: ghostId,
        participant_count: Math.floor(Math.random() * 30),
        created_at: serverTimestamp()
      });

      alert('Dados iniciais (1 Evento, 1 Ghost e 2 Corridas) gerados com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'system/seed');
    } finally {
      setIsSeeding(false);
    }
  };

  const saveGhost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ghostId = editingGhost?.uid || `ghost_${Math.random().toString(36).substr(2, 9)}`;
    
    const ghostData = {
      name: formData.get('name') as string,
      role: 'Ghost' as UserRole,
      profile_image: formData.get('profile_image') as string || `https://i.pravatar.cc/150?u=${ghostId}`,
      bio: formData.get('bio') as string || 'Atleta Ghost GOPace',
      xp_total: editingGhost?.xp_total || 0,
      level: editingGhost?.level || 1,
      total_km: editingGhost?.total_km || 0,
      current_streak: editingGhost?.current_streak || 0,
      city: formData.get('city') as string || 'GOPace City'
    };

    try {
      await setDoc(doc(db, 'users', ghostId), ghostData);
      setShowGhostModal(false);
      setEditingGhost(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${ghostId}`);
    }
  };

  const deleteGhost = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      showNotification('Ghost excluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      showNotification('Erro ao excluir Ghost', 'error');
    }
  };

  useEffect(() => {
    const unsubAds = onSnapshot(collection(db, 'ads'), (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => { unsubAds(); unsubUsers(); };
  }, []);

  const toggleAd = async (ad: Ad) => {
    await updateDoc(doc(db, 'ads', ad.id), { active: !ad.active });
  };

  const deleteAd = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ads', id));
      showNotification('Anúncio excluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ads/${id}`);
      showNotification('Erro ao excluir anúncio', 'error');
    }
  };

  const updateUserRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, 'users', uid), { role });
  };

  const deleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      showNotification('Usuário excluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      showNotification('Erro ao excluir usuário', 'error');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-12 pb-20 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl font-mono font-black uppercase text-[10px] tracking-widest shadow-2xl backdrop-blur-md border",
              notification.type === 'success' 
                ? "bg-neon-green/90 text-black border-neon-green/20" 
                : "bg-red-500/90 text-white border-red-500/20"
            )}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <div className="p-3 bg-neon-green/10 rounded-2xl border border-neon-green/20">
          <ShieldCheck className="w-8 h-8 text-neon-green neon-glow" />
        </div>
        <div>
          <h2 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase">Painel Admin</h2>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-1">Gerenciamento de sistema e usuários</p>
        </div>
      </div>

      {/* System Seeding & Ghosts */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-neon-green" />
            <h3 className="text-lg font-display font-black italic text-white uppercase tracking-tight">Sistema & Automação</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={seedInitialData}
            disabled={isSeeding}
            className="speed-card p-8 flex flex-col items-center justify-center text-center space-y-4 group border-neon-green/20 hover:border-neon-green/50"
          >
            <div className="w-16 h-16 bg-neon-green/10 rounded-3xl flex items-center justify-center border border-neon-green/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-neon-green neon-glow" />
            </div>
            <div>
              <div className="text-xl font-display font-black italic text-white uppercase tracking-tighter">Gerar Dados Iniciais</div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">1 Evento + 1 Ghost + 2 Atividades</p>
            </div>
            {isSeeding && (
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-1/2 h-full bg-neon-green"
                />
              </div>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingGhost(null);
              setShowGhostModal(true);
            }}
            className="speed-card p-8 flex flex-col items-center justify-center text-center space-y-4 group border-vibrant-orange/20 hover:border-vibrant-orange/50"
          >
            <div className="w-16 h-16 bg-vibrant-orange/10 rounded-3xl flex items-center justify-center border border-vibrant-orange/20 group-hover:scale-110 transition-transform">
              <Ghost className="w-8 h-8 text-vibrant-orange shadow-[0_0_15px_rgba(255,69,0,0.3)]" />
            </div>
            <div>
              <div className="text-xl font-display font-black italic text-white uppercase tracking-tighter">Gerenciar Ghosts</div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Criar e editar usuários fantasmas</p>
            </div>
          </motion.button>
        </div>

        {/* Ghost List */}
        <div className="speed-card overflow-hidden">
          <div className="p-4 bg-zinc-900/50 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ghost className="w-4 h-4 text-vibrant-orange" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">Lista de Ghosts</span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {users.filter(u => u.role === 'Ghost').map(ghost => (
              <div key={ghost.uid} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <img src={ghost.profile_image} alt={ghost.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-tight">{ghost.name}</div>
                    <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{ghost.city}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingGhost(ghost);
                      setShowGhostModal(true);
                    }}
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteGhost(ghost.uid)}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {users.filter(u => u.role === 'Ghost').length === 0 && (
              <div className="p-8 text-center text-zinc-600 text-[10px] font-mono uppercase tracking-widest italic">
                Nenhum ghost cadastrado
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ads Management */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-vibrant-orange" />
            <h3 className="text-lg font-display font-black italic text-white uppercase tracking-tight">Anúncios & Banners</h3>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddAd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-vibrant-orange text-black rounded-xl font-mono font-black uppercase text-[10px] tracking-widest shadow-[0_0_15px_rgba(255,69,0,0.3)]"
          >
            <Plus className="w-4 h-4" />
            Novo Anúncio
          </motion.button>
        </div>

        <div className="grid gap-4">
          {ads.map(ad => (
            <motion.div 
              key={ad.id} 
              layout
              className="speed-card group p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-12 bg-zinc-800 rounded-xl overflow-hidden border border-white/10 group-hover:border-vibrant-orange/50 transition-all">
                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white uppercase tracking-tight">{ad.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      ad.active ? "bg-neon-green animate-pulse" : "bg-zinc-600"
                    )} />
                    <span className={cn(
                      "text-[8px] font-mono font-black uppercase tracking-widest", 
                      ad.active ? "text-neon-green" : "text-zinc-500"
                    )}>
                      {ad.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleAd(ad)} 
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    ad.active ? "bg-zinc-800 text-zinc-500 hover:text-white" : "bg-neon-green/10 text-neon-green hover:bg-neon-green/20"
                  )}
                >
                  {ad.active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => deleteAd(ad.id)} 
                  className="p-2 bg-zinc-800 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* User Management */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-neon-green" />
            <h3 className="text-lg font-display font-black italic text-white uppercase tracking-tight">Gerenciar Atletas</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="BUSCAR ATLETA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest focus:border-neon-green outline-none transition-all"
              />
            </div>
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest focus:border-neon-green outline-none transition-all cursor-pointer"
            >
              <option value="all">TODOS</option>
              <option value="Usuario">USUÁRIO</option>
              <option value="UserPro">USERPRO</option>
              <option value="Patrocinador">PATROCINADOR</option>
              <option value="Admin">ADMIN</option>
            </select>
          </div>
        </div>

        <div className="speed-card overflow-hidden">
          <div className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map(user => (
                <motion.div 
                  key={user.uid} 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 group-hover:border-neon-green/50 transition-all p-0.5">
                      {user.profile_image ? (
                        <img src={user.profile_image} alt={user.name} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900 rounded-2xl">{user.name[0]}</div>
                      )}
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm text-white uppercase tracking-tight">{user.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[8px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                          user.role === 'Admin' ? "bg-neon-green text-black" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {user.role}
                        </span>
                        <span className="text-zinc-800">•</span>
                        <span className="text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[120px]">
                          {user.email || 'Sem email'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                      <div className="text-xs font-display font-black italic text-neon-green">{user.total_km.toFixed(1)} KM</div>
                      <div className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Nível {user.level}</div>
                    </div>
                    <div className="relative">
                      <Settings className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                      <select 
                        value={user.role}
                        onChange={(e) => updateUserRole(user.uid, e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-xl pl-7 pr-4 py-2 text-[9px] font-mono font-black uppercase tracking-widest outline-none focus:border-neon-green cursor-pointer hover:bg-zinc-800 transition-all appearance-none"
                      >
                        <option value="Usuario">USUÁRIO</option>
                        <option value="UserPro">USERPRO</option>
                        <option value="Patrocinador">PATROCINADOR</option>
                        <option value="Admin">ADMIN</option>
                        <option value="Ghost">GHOST</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => deleteUser(user.uid)}
                      className="p-2 bg-zinc-800 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Add Ad Modal */}
      <AnimatePresence>
        {showAddAd && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddAd(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 rounded-[32px] border border-white/10 p-8 space-y-8 shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-vibrant-orange/10 rounded-2xl">
                  <Megaphone className="w-6 h-6 text-vibrant-orange" />
                </div>
                <h3 className="text-2xl font-display font-black italic tracking-tighter text-white uppercase">Novo Anúncio</h3>
              </div>

              <form className="space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await addDoc(collection(db, 'ads'), {
                  title: formData.get('title'),
                  image_url: formData.get('image_url'),
                  link: formData.get('link'),
                  active: true
                });
                setShowAddAd(false);
              }}>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Título do Anúncio</label>
                  <input name="title" placeholder="EX: NOVA COLEÇÃO NIKE" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold uppercase tracking-widest focus:border-vibrant-orange outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">URL do Banner</label>
                  <input name="image_url" placeholder="HTTPS://..." required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold focus:border-vibrant-orange outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Link de Destino</label>
                  <input name="link" placeholder="HTTPS://..." required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold focus:border-vibrant-orange outline-none transition-all" />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddAd(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-zinc-500 font-mono font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-vibrant-orange text-black font-mono font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(255,69,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Criar Anúncio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ghost Modal */}
      <AnimatePresence>
        {showGhostModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGhostModal(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 rounded-[32px] border border-white/10 p-8 space-y-8 shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-vibrant-orange/10 rounded-2xl">
                  <Ghost className="w-6 h-6 text-vibrant-orange" />
                </div>
                <h3 className="text-2xl font-display font-black italic tracking-tighter text-white uppercase">
                  {editingGhost ? 'Editar Ghost' : 'Novo Ghost'}
                </h3>
              </div>

              <form className="space-y-5" onSubmit={saveGhost}>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome</label>
                  <input name="name" defaultValue={editingGhost?.name} placeholder="NOME DO GHOST" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold uppercase tracking-widest focus:border-vibrant-orange outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">URL da Foto</label>
                  <input name="profile_image" defaultValue={editingGhost?.profile_image} placeholder="HTTPS://..." className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold focus:border-vibrant-orange outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Cidade</label>
                  <input name="city" defaultValue={editingGhost?.city} placeholder="CIDADE" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold uppercase tracking-widest focus:border-vibrant-orange outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Bio</label>
                  <textarea name="bio" defaultValue={editingGhost?.bio} placeholder="BIO DO GHOST" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-sm font-mono font-bold focus:border-vibrant-orange outline-none transition-all min-h-[80px]" />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowGhostModal(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-zinc-500 font-mono font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-vibrant-orange text-black font-mono font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(255,69,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingGhost ? 'Salvar Alterações' : 'Criar Ghost'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
