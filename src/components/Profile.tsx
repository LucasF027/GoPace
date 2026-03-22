import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Edit3, 
  MapPin, 
  Flame, 
  Zap, 
  Award,
  History,
  Grid,
  Image,
  X,
  Save,
  TrendingUp,
  Calendar,
  ChevronRight,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFirebaseStorage, db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, Run, Medal } from '../types';
import { cn, formatDuration, formatPace, calculatePace, safeToDate } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UserAvatar from './UserAvatar';
import { handleFirestoreError, OperationType } from '../firebase-utils';
import { ArrowLeft } from 'lucide-react';
import UserCategory from './UserCategory';

interface ProfileProps {
  user: UserProfile;
  targetUserId?: string;
  onBack?: () => void;
}

export default function Profile({ user: currentUser, targetUserId, onBack }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [userRuns, setUserRuns] = useState<Run[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [profileUser, setProfileUser] = useState<UserProfile>(currentUser);
  const [editForm, setEditForm] = useState({
    name: currentUser.name,
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
    profile_image: currentUser.profile_image || '',
    city: currentUser.city || '',
    state: currentUser.state || ''
  });
  const [states, setStates] = useState<{ sigla: string; nome: string }[]>([]);
  const [cities, setCities] = useState<{ nome: string }[]>([]);
  const [isFetchingStates, setIsFetchingStates] = useState(false);
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !targetUserId || targetUserId === currentUser.uid;

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        let targetUser = currentUser;
        
        if (targetUserId && targetUserId !== currentUser.uid) {
          const userDoc = await getDoc(doc(db, 'users', targetUserId));
          if (userDoc.exists()) {
            targetUser = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
          }
        }
        
        setProfileUser(targetUser);
        setEditForm({
          name: targetUser.name,
          phone: targetUser.phone || '',
          bio: targetUser.bio || '',
          profile_image: targetUser.profile_image || '',
          city: targetUser.city || '',
          state: targetUser.state || ''
        });

        const runsQ = query(collection(db, 'runs'), where('user_id', '==', targetUser.uid));
        const runsSnap = await getDocs(runsQ);
        const runs = runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Run));
        // Sort in memory to avoid composite index
        const sortedRuns = runs.sort((a, b) => {
          const dateA = safeToDate(a.created_at).getTime();
          const dateB = safeToDate(b.created_at).getTime();
          return dateB - dateA;
        });
        setUserRuns(sortedRuns);

        const medalsSnap = await getDocs(collection(db, `users/${targetUser.uid}/medals`));
        setMedals(medalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medal)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'user_data');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [currentUser, targetUserId]);

  // Fetch states from IBGE
  useEffect(() => {
    if (isEditing) {
      const fetchStates = async () => {
        setIsFetchingStates(true);
        try {
          const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
          const data = await response.json();
          setStates(data.map((s: any) => ({ sigla: s.sigla, nome: s.nome })));
        } catch (err) {
          console.error("Error fetching states:", err);
        } finally {
          setIsFetchingStates(false);
        }
      };
      fetchStates();
    }
  }, [isEditing]);

  // Fetch cities from IBGE when state changes
  useEffect(() => {
    if (editForm.state) {
      const fetchCities = async () => {
        setIsFetchingCities(true);
        try {
          const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${editForm.state}/municipios?orderBy=nome`);
          const data = await response.json();
          setCities(data.map((c: any) => ({ nome: c.nome })));
        } catch (err) {
          console.error("Error fetching cities:", err);
        } finally {
          setIsFetchingCities(false);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [editForm.state]);

  const handleSuggestCity = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const state = data.address.state || '';
        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
        
        // Try to find state abbreviation (UF)
        let stateUF = '';
        if (state) {
          // Simple mapping or just use the state name if we can't find UF
          // IBGE API uses UF, so we should try to match it
          const statesResponse = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
          const statesData = await statesResponse.json();
          const matchedState = statesData.find((s: any) => 
            s.nome.toLowerCase() === state.toLowerCase() || 
            s.sigla.toLowerCase() === state.toLowerCase()
          );
          if (matchedState) stateUF = matchedState.sigla;
        }

        if (city) {
          setEditForm(prev => ({ ...prev, city, state: stateUF || prev.state }));
        }
      } catch (err) {
        console.error("Error fetching city:", err);
      } finally {
        setIsLocating(false);
      }
    }, (err) => {
      console.error("Geolocation error:", err);
      setIsLocating(false);
    });
  };

  const handleSave = async () => {
    if (!editForm.state) {
      alert("O campo estado é obrigatório.");
      return;
    }
    if (!editForm.city.trim()) {
      alert("O campo cidade é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), editForm);
      setIsEditing(false);
      setProfileUser({ ...profileUser, ...editForm });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleImageUpload triggered", e.target.files);
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    console.log("Iniciando upload da imagem...", file.name, file.size, file.type);
    try {
      const storage = getFirebaseStorage();
      if (!storage) throw new Error("Firebase Storage não inicializado.");
      
      setUploadProgress(30);
      const filePath = `profiles/${currentUser.uid}/${Date.now()}_${file.name}`;
      console.log("Caminho do arquivo no Storage:", filePath);
      
      const storageRef = ref(storage, filePath);
      setUploadProgress(50);
      
      console.log("Enviando bytes...");
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload concluído com sucesso!", snapshot.metadata.fullPath);
      
      setUploadProgress(80);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("URL de download obtida:", downloadURL);
      
      setUploadProgress(100);
      setEditForm(prev => ({ ...prev, profile_image: downloadURL }));
    } catch (err) {
      console.error("Erro detalhado no upload da imagem:", err);
      let errorMessage = "Erro ao enviar a imagem.";
      if (err instanceof Error) {
        if (err.message.includes('storage/unauthorized')) {
          errorMessage = "Erro de permissão: Verifique se as Regras do Firebase Storage permitem o upload.";
        } else if (err.message.includes('storage/retry-limit-exceeded')) {
          errorMessage = "Erro de rede: O tempo limite foi excedido. Tente novamente.";
        } else {
          errorMessage += " Detalhes: " + err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin neon-glow" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-speed-black via-zinc-900 to-neon-green/10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-neon-green/10 blur-[100px] rounded-full" />
          <div className="absolute top-6 left-6 flex gap-2">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 transition-all group"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white transition-all" />
              </button>
            )}
          </div>
          {isOwnProfile && (
            <div className="absolute top-6 right-6">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 transition-all group"
              >
                <Settings className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:rotate-90 transition-all duration-500" />
              </button>
            </div>
          )}
        </div>

        <div className="px-8 -mt-16 flex flex-col items-center text-center relative z-10">
          <div className="relative group">
            <UserAvatar 
              user={profileUser} 
              size="xl" 
              className="ring-4 ring-speed-black bg-speed-black shadow-[0_0_30px_rgba(57,255,20,0.3)]"
            />
            <div className="absolute -bottom-2 -right-2 bg-neon-green text-black p-2 rounded-xl shadow-lg border-2 border-speed-black">
              <Zap className="w-4 h-4 fill-current" />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h2 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase">{profileUser.name}</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-3">
                <span className="bg-neon-green text-black px-3 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(57,255,20,0.3)]">
                  Nível {profileUser.level}
                </span>
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest font-bold">{profileUser.role}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                <MapPin className="w-3 h-3 text-neon-green" />
                {profileUser.city || 'Cidade não definida'}
              </div>
              <UserCategory userId={profileUser.uid} className="scale-125 px-4 py-2" />
            </div>
            {profileUser.bio && (
              <p className="text-zinc-400 text-sm mt-4 max-w-sm font-medium leading-relaxed">
                {profileUser.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 px-2">
        <div className="speed-card p-5 text-center group hover:border-neon-green/30 transition-all neon-card-glow">
          <div className="text-2xl font-display font-black italic tracking-tighter text-neon-green neon-glow group-hover:scale-110 transition-transform">
            {profileUser.total_km.toFixed(1)}
          </div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 mt-1">KM TOTAIS</div>
        </div>
        <div className="speed-card p-5 text-center group hover:border-vibrant-orange/30 transition-all orange-card-glow">
          <div className="flex items-center justify-center gap-1 text-vibrant-orange orange-glow group-hover:scale-110 transition-transform">
            <Flame className="w-5 h-5 fill-current" />
            <span className="text-2xl font-display font-black italic tracking-tighter">{profileUser.current_streak}</span>
          </div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 mt-1">STREAK</div>
        </div>
        <div className="speed-card p-5 text-center group hover:border-white/20 transition-all">
          <div className="text-2xl font-display font-black italic tracking-tighter text-white group-hover:scale-110 transition-transform">
            {profileUser.xp_total}
          </div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 mt-1">TOTAL XP</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="speed-card p-8 space-y-6 relative overflow-hidden neon-card-glow">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <TrendingUp className="w-24 h-24" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-500">Progresso de Nível</div>
            <div className="text-2xl font-display font-black italic text-white mt-1 uppercase">Rumo ao Nível {profileUser.level + 1}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-display font-black italic text-neon-green neon-glow">{profileUser.xp_total % 1000}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">/ 1000 XP</div>
          </div>
        </div>
        <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-white/5 p-1 relative z-10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(profileUser.xp_total % 1000) / 10}%` }}
            className="h-full bg-gradient-to-r from-neon-green to-emerald-400 rounded-full relative shadow-[0_0_15px_rgba(57,255,20,0.5)]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[move-bg_1s_linear_infinite]" />
          </motion.div>
        </div>
      </div>

      {/* Medals Section */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-vibrant-orange" />
            <h3 className="font-display font-black italic text-lg uppercase tracking-tight">Conquistas</h3>
          </div>
          <button className="text-[10px] font-mono font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Ver Todas</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {medals.length > 0 ? medals.map(medal => (
            <motion.div 
              key={medal.id} 
              whileHover={{ y: -5 }}
              className="flex-shrink-0 w-24 text-center space-y-3"
            >
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-4xl shadow-lg relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                {medal.icon}
              </div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-tighter text-zinc-400 truncate px-1">{medal.name}</div>
            </motion.div>
          )) : (
            <div className="w-full py-10 speed-card flex flex-col items-center justify-center gap-3 border-dashed opacity-50">
              <Award className="w-10 h-10 text-zinc-800" />
              <p className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest">Nenhuma medalha conquistada</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity History */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neon-green" />
            <h3 className="font-display font-black italic text-lg uppercase tracking-tight">Atividades Recentes</h3>
          </div>
          <button className="text-[10px] font-mono font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Ver Histórico</button>
        </div>
        <div className="space-y-4">
          {userRuns.length > 0 ? userRuns.slice(0, 5).map(run => (
            <motion.div 
              key={run.id} 
              whileHover={{ x: 5 }}
              className="speed-card p-5 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-neon-green group-hover:bg-neon-green group-hover:text-black transition-all">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="text-sm font-display font-black italic text-white uppercase tracking-tight">
                    {format(safeToDate(run.created_at), "dd 'de' MMMM", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      {formatDuration(run.duration)}
                    </span>
                    <span className="text-zinc-800">•</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      {formatPace(calculatePace(run.distance, run.duration))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-display font-black italic tracking-tighter text-neon-green group-hover:scale-110 transition-transform">
                  {run.distance.toFixed(2)}
                </div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">KM</div>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-12 speed-card border-dashed opacity-50">
              <p className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest">Nenhuma corrida registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-speed-black rounded-[2.5rem] border border-white/10 p-8 space-y-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black italic tracking-tighter uppercase text-neon-green">Editar Perfil</h3>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Personalize sua identidade GOPace</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Nome de Atleta</label>
                  <input 
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Bio / Mantra</label>
                  <textarea 
                    value={editForm.bio}
                    onChange={e => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none min-h-[100px] transition-all"
                    placeholder="Qual sua motivação?"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Estado (UF)</label>
                    <div className="relative">
                      <select 
                        value={editForm.state}
                        onChange={e => setEditForm({...editForm, state: e.target.value, city: ''})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all appearance-none"
                        disabled={isFetchingStates}
                      >
                        <option value="">Selecione o Estado</option>
                        {states.map(s => (
                          <option key={s.sigla} value={s.sigla}>{s.nome}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        {isFetchingStates ? (
                          <div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 ml-4">Cidade</label>
                    <div className="relative">
                      <select 
                        value={editForm.city}
                        onChange={e => setEditForm({...editForm, city: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-neon-green outline-none transition-all appearance-none disabled:opacity-50"
                        disabled={!editForm.state || isFetchingCities}
                      >
                        <option value="">{editForm.state ? 'Selecione a Cidade' : 'Selecione um Estado primeiro'}</option>
                        {cities.map(c => (
                          <option key={c.nome} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        {isFetchingCities ? (
                          <div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={handleSuggestCity}
                      disabled={isLocating}
                      className="flex items-center gap-2 mt-2 ml-4 text-[10px] font-mono font-bold text-neon-green hover:opacity-80 transition-all disabled:opacity-50"
                    >
                      {isLocating ? (
                        <div className="w-3 h-3 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      Sugerir via GPS
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-8">
                  <div className="relative">
                    <UserAvatar 
                      user={{ ...profileUser, profile_image: editForm.profile_image }} 
                      size="xl" 
                      className="ring-4 ring-neon-green/20"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 z-20">
                        <div className="w-12 h-12 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
                        <span className="text-[10px] font-mono text-neon-green font-bold">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <label className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-900 border border-white/10 rounded-2xl hover:border-neon-green/50 transition-all cursor-pointer group relative overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <div className="p-2 bg-white/5 rounded-xl group-hover:bg-neon-green group-hover:text-black transition-all">
                        <Image className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest">Galeria</span>
                    </label>

                    <label className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-900 border border-white/10 rounded-2xl hover:border-neon-green/50 transition-all cursor-pointer group relative overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="user" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <div className="p-2 bg-white/5 rounded-xl group-hover:bg-neon-green group-hover:text-black transition-all">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest">Câmera</span>
                    </label>
                  </div>
                </div>

                    <div className="space-y-1.5 mt-2">
                      <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-600 ml-2">Ou cole a URL da imagem</label>
                      <input 
                        value={editForm.profile_image}
                        onChange={e => setEditForm({...editForm, profile_image: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-[10px] focus:border-neon-green outline-none transition-all font-mono"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

              <button 
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="w-full bg-neon-green text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                {isSaving ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
