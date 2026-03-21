import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  X, 
  Share2,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  serverTimestamp,
  updateDoc,
  increment,
  orderBy
} from 'firebase/firestore';
import { Event, UserProfile } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../utils';
import { handleFirestoreError, OperationType } from '../firebase-utils';

interface EventsProps {
  user: UserProfile;
}

export default function Events({ user }: EventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<{ id: string; name: string; image?: string }[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  const handleShare = async (event: Event) => {
    const shareData = {
      title: `GOPace - ${event.title}`,
      text: `Confira este evento no GOPace: ${event.title} em ${event.location}`,
      url: `${window.location.origin}/events/${event.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Fallback: Open WhatsApp
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkSubscriptions = async () => {
      const subs = new Set<string>();
      for (const event of events) {
        const partDoc = await getDocs(collection(db, `events/${event.id}/participants`));
        if (partDoc.docs.some(d => d.id === user.uid)) {
          subs.add(event.id);
        }
      }
      setUserSubscriptions(subs);
    };
    checkSubscriptions();
  }, [events, user]);

  const handleJoin = async (eventId: string) => {
    if (!user) return;
    const isSubscribed = userSubscriptions.has(eventId);

    try {
      if (isSubscribed) {
        await deleteDoc(doc(db, `events/${eventId}/participants`, user.uid));
        await updateDoc(doc(db, 'events', eventId), { participant_count: increment(-1) });
        setUserSubscriptions(prev => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      } else {
        await setDoc(doc(db, `events/${eventId}/participants`, user.uid), {
          name: user.name,
          image: user.profile_image || '',
          joined_at: serverTimestamp()
        });
        await updateDoc(doc(db, 'events', eventId), { participant_count: increment(1) });
        
        // XP for joining event
        await updateDoc(doc(db, 'users', user.uid), {
          xp_total: increment(50)
        });
        
        setUserSubscriptions(prev => {
          const next = new Set(prev);
          next.add(eventId);
          return next;
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${eventId}`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
    }
  };

  const fetchParticipants = async (eventId: string) => {
    const snapshot = await getDocs(collection(db, `events/${eventId}/participants`));
    setParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin neon-glow" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase">Eventos</h2>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-1">Próximos desafios da comunidade</p>
        </div>
        {(user.role === 'Admin' || user.role === 'Patrocinador') && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-3 bg-neon-green text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.4)]"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="grid gap-8">
        <AnimatePresence mode="popLayout">
          {events.map((event, index) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="speed-card overflow-hidden group relative"
            >
              <div className="aspect-[21/9] bg-zinc-800 relative overflow-hidden">
                {event.image ? (
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75 group-hover:brightness-100" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
                    <ImageIcon className="w-16 h-16 opacity-20" />
                  </div>
                )}
                
                {/* Date Badge */}
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex flex-col items-center min-w-[60px]">
                  <span className="text-xs font-mono font-bold text-neon-green uppercase tracking-tighter">
                    {format(new Date(event.date_time), "MMM", { locale: ptBR })}
                  </span>
                  <span className="text-2xl font-display font-black leading-none">
                    {format(new Date(event.date_time), "dd")}
                  </span>
                </div>

                {/* Time Badge */}
                <div className="absolute top-4 right-4 bg-neon-green text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                  <Clock className="w-3 h-3" />
                  {format(new Date(event.date_time), "HH:mm:ss")}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-display font-black italic tracking-tight text-white group-hover:text-neon-green transition-colors uppercase">{event.title}</h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-vibrant-orange" />
                      {event.location}
                    </div>
                  </div>
                  {user.role === 'Admin' && (
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 font-medium">{event.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button 
                    onClick={() => {
                      setSelectedEvent(event);
                      fetchParticipants(event.id);
                    }}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group/btn"
                  >
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-speed-black bg-zinc-800 flex items-center justify-center text-[8px] font-bold">
                          {i}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest ml-2">
                      {event.participant_count || 0} {event.participant_count === 1 ? 'Participante' : 'Participantes'}
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleShare(event)}
                      className="p-2.5 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleJoin(event.id)}
                      className={cn(
                        "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2",
                        userSubscriptions.has(event.id)
                          ? "bg-zinc-800 text-zinc-500 border border-white/10"
                          : "bg-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95"
                      )}
                    >
                      {userSubscriptions.has(event.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Inscrito
                        </>
                      ) : (
                        'Inscrever-se'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Participants Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-speed-black rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <div>
                  <h3 className="text-xl font-display font-black italic tracking-tight uppercase">Participantes</h3>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{selectedEvent.title}</p>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
                {participants.length > 0 ? participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border-2 border-neon-green/20 p-0.5 group-hover:border-neon-green transition-colors">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-900 rounded-full">{p.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-sm text-white block">{p.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Atleta GOPace</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 space-y-4">
                    <Users className="w-12 h-12 text-zinc-800 mx-auto" />
                    <p className="text-zinc-500 text-sm italic font-medium">Seja o primeiro a se inscrever!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-speed-black rounded-[2.5rem] border border-white/10 p-8 space-y-8 shadow-2xl"
            >
              <div>
                <h3 className="text-3xl font-display font-black italic tracking-tighter uppercase text-neon-green">Novo Evento</h3>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-1">Crie um desafio para a comunidade</p>
              </div>

              <form className="space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await addDoc(collection(db, 'events'), {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    location: formData.get('location'),
                    date_time: formData.get('date_time'),
                    image: `https://picsum.photos/seed/${Math.random()}/1200/600`,
                    created_by: user.uid,
                    participant_count: 0,
                    created_at: serverTimestamp()
                  });
                  setShowCreateModal(false);
                } catch (error) {
                  handleFirestoreError(error, OperationType.CREATE, 'events');
                }
              }}>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Título do Evento</label>
                    <input name="title" placeholder="EX: MARATONA DA MADRUGADA" required className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all placeholder:text-zinc-700" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Descrição</label>
                    <textarea name="description" placeholder="DETALHES DO PERCURSO..." required className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all min-h-[120px] placeholder:text-zinc-700" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Local</label>
                      <input name="location" placeholder="LOCAL" required className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all placeholder:text-zinc-700" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Data e Hora</label>
                      <input name="date_time" type="datetime-local" required className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all text-zinc-400" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-neon-green text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.4)] hover:scale-[1.02] active:scale-95 transition-all mt-4">
                  Publicar Evento
                </button>
              </form>

              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-4 h-4 text-neon-green" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white">Link copiado para a área de transferência!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
