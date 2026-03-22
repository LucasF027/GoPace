import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Trash2,
  Timer,
  Zap,
  Map as MapIcon,
  Send,
  X,
  Play
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Run, Comment, UserProfile } from '../types';
import { formatDuration, formatPace, calculatePace, safeToDate } from '../utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UserAvatar from './UserAvatar';
import { handleFirestoreError, OperationType } from '../firebase-utils';
import { motion, AnimatePresence } from 'motion/react';
import UserCategory from './UserCategory';

import RunMap from './RunMap';
import { domToPng } from 'modern-screenshot';

interface FeedProps {
  user: UserProfile;
  onViewProfile: (uid: string) => void;
}

export default function Feed({ user, onViewProfile }: FeedProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sharingRun, setSharingRun] = useState<Run | null>(null);
  const [viewingRun, setViewingRun] = useState<Run | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  const shareRef = useRef<HTMLDivElement>(null);

  const handleShare = async (run: Run) => {
    setSharingRun(run);
  };

  const generateShareImage = async () => {
    if (!shareRef.current) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await domToPng(shareRef.current, {
        scale: 2,
        backgroundColor: '#000000',
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `GOPace_Run_${sharingRun?.distance.toFixed(2)}km.png`;
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGeneratingImage(false);
      setSharingRun(null);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'runs'), orderBy('created_at', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const runsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Run));
      setRuns(runsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'runs');
    });
    return unsubscribe;
  }, []);

  const handleLike = async (run: Run) => {
    if (!auth.currentUser) return;
    const runRef = doc(db, 'runs', run.id);
    const isLiked = run.likes?.includes(auth.currentUser.uid);

    try {
      await updateDoc(runRef, {
        likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `runs/${run.id}`);
    }
  };

  const handleComment = async (runId: string) => {
    if (!auth.currentUser || !commentText.trim()) return;

    const runRef = doc(db, 'runs', runId);
    const newComment: Omit<Comment, 'id'> = {
      user_id: auth.currentUser.uid,
      user_name: auth.currentUser.displayName || 'Corredor',
      user_image: auth.currentUser.photoURL || undefined,
      text: commentText.trim(),
      created_at: new Date() // Will be converted to timestamp by Firestore if using serverTimestamp, but for local array we use Date
    };

    try {
      await updateDoc(runRef, {
        comments: arrayUnion({ ...newComment, id: Math.random().toString(36).substr(2, 9) })
      });
      setCommentText('');
      setCommentingOn(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `runs/${runId}`);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    try {
      await deleteDoc(doc(db, 'runs', runId));
      setMenuOpenId(null);
      setDeletingRunId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `runs/${runId}`);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin neon-glow" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <AnimatePresence mode="popLayout">
        {runs.map((run, index) => (
          <motion.div 
            key={run.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="speed-card overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between relative z-20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onViewProfile(run.user_id)}
                  className="hover:scale-105 transition-transform"
                >
                  <UserAvatar 
                    user={{ uid: run.user_id, name: run.user_name, profile_image: run.user_image }} 
                    size="md" 
                  />
                </button>
                <div>
                  <button 
                    onClick={() => onViewProfile(run.user_id)}
                    className="font-display font-bold text-base text-white tracking-tight hover:text-neon-green transition-colors text-left block"
                  >
                    {run.user_name}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCategory userId={run.user_id} className="px-1 py-0.5 text-[7px]" showIcon={false} />
                    <span className="text-zinc-800">•</span>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {run.created_at ? formatDistanceToNow(safeToDate(run.created_at), { addSuffix: true, locale: ptBR }) : 'Agora mesmo'}
                    </div>
                  </div>
                </div>
              </div>
              
              {user.role === 'Admin' && (
                <div className="relative">
                  <button 
                    onClick={() => setMenuOpenId(menuOpenId === run.id ? null : run.id)}
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  <AnimatePresence>
                    {menuOpenId === run.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingRunId(run.id);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Apagar Corrida
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-neon-green/10 via-transparent to-vibrant-orange/5 border-y border-white/5 relative group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
              
              {/* Route Map */}
              {run.route && run.route.length > 0 && (
                <div 
                  onClick={() => setViewingRun(run)}
                  className="w-full h-56 relative overflow-hidden cursor-pointer group/map"
                >
                  <RunMap route={run.route} className="w-full h-full transition-transform duration-500 group-hover/map:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-lg opacity-0 group-hover/map:opacity-100 transition-opacity">
                    <MapIcon className="w-4 h-4 text-neon-green" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 relative z-10 p-4 sm:p-6">
                <div className="text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-display font-black italic tracking-tighter text-neon-green neon-glow">
                    {run.distance.toFixed(2)}
                  </div>
                  <div className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">KM</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-display font-black italic tracking-tighter text-white">
                    {formatDuration(run.duration)}
                  </div>
                  <div className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">Tempo</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg sm:text-xl font-display font-black italic tracking-tighter text-vibrant-orange orange-glow">
                    {formatPace(calculatePace(run.distance, run.duration))}
                  </div>
                  <div className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">Pace</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <motion.button 
                  whileTap={{ scale: 1.2 }}
                  onClick={() => handleLike(run)}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    run.likes?.includes(auth.currentUser?.uid || '') 
                      ? 'text-neon-green' 
                      : 'text-zinc-400 hover:text-neon-green'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${run.likes?.includes(auth.currentUser?.uid || '') ? 'fill-current' : ''}`} />
                  <span className="text-sm font-bold font-mono">{run.likes?.length || 0}</span>
                </motion.button>
                <button 
                  onClick={() => setCommentingOn(commentingOn === run.id ? null : run.id)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-vibrant-orange transition-all duration-300"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-sm font-bold font-mono">{run.comments?.length || 0}</span>
                </button>
                <button 
                  onClick={() => handleShare(run)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all duration-300 ml-auto"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>

              {/* Comments Section */}
              {run.comments && run.comments.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  {run.comments.slice(-3).map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-sm items-baseline">
                      <button 
                        onClick={() => onViewProfile(comment.user_id)}
                        className="font-bold text-neon-green hover:underline"
                      >
                        {comment.user_name}
                      </button>
                      <span className="text-zinc-300">{comment.text}</span>
                    </div>
                  ))}
                  {run.comments.length > 3 && (
                    <button 
                      onClick={() => setViewingRun(run)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
                    >
                      Ver todos os {run.comments.length} comentários
                    </button>
                  )}
                </div>
              )}

              {/* Comment Input */}
              {commentingOn === run.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex gap-2 pt-2"
                >
                  <input 
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Adicione um comentário..."
                    className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neon-green transition-colors"
                    onKeyPress={(e) => e.key === 'Enter' && handleComment(run.id)}
                  />
                  <button 
                    onClick={() => handleComment(run.id)}
                    disabled={!commentText.trim()}
                    className="p-2 bg-neon-green text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {sharingRun && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 rounded-[2.5rem] border border-white/10 overflow-hidden"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <h3 className="font-black italic uppercase tracking-tighter text-xl">Compartilhar Corrida</h3>
                <button onClick={() => setSharingRun(null)} className="p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Shareable Card Preview */}
                <div 
                  ref={shareRef}
                  className="bg-black rounded-3xl overflow-hidden border border-white/10 aspect-square flex flex-col"
                >
                  <div className="flex-1 relative">
                    <RunMap route={sharingRun.route} className="w-full h-full" />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                      <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">{sharingRun.user_name}</span>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-900 grid grid-cols-3 gap-4 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-2xl font-display font-black italic tracking-tighter text-neon-green">{sharingRun.distance.toFixed(2)}</div>
                      <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-zinc-500">KM</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-display font-black italic tracking-tighter text-white">{formatDuration(sharingRun.duration)}</div>
                      <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-zinc-500">Tempo</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-display font-black italic tracking-tighter text-vibrant-orange">{formatPace(calculatePace(sharingRun.distance, sharingRun.duration))}</div>
                      <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-zinc-500">Pace</div>
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-black flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-neon-green rounded-md flex items-center justify-center">
                        <Play className="w-4 h-4 text-black fill-current -rotate-90" />
                      </div>
                      <span className="text-[10px] font-black italic tracking-tighter text-white uppercase">GO<span className="text-neon-green">PACE</span></span>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-zinc-600 uppercase tracking-widest">Performance Running App</span>
                  </div>
                </div>

                <button 
                  onClick={generateShareImage}
                  disabled={isGeneratingImage}
                  className="w-full bg-neon-green text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_20px_rgba(57,255,20,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isGeneratingImage ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Baixar Imagem para Compartilhar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingRunId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingRunId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm speed-card p-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black italic text-white uppercase tracking-tight">Apagar Corrida?</h3>
                <p className="text-zinc-400 text-sm mt-2">Esta ação não pode ser desfeita. A corrida será removida permanentemente.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingRunId(null)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteRun(deletingRunId)}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Apagar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Run Detail Modal */}
      <AnimatePresence>
        {viewingRun && (
          <div className="fixed inset-0 z-[110] bg-speed-black flex flex-col diagonal-bg">
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewingRun(null)} className="p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
                <div className="flex flex-col">
                  <span className="text-xl font-black italic uppercase tracking-tighter">Detalhes da Corrida</span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{viewingRun.user_name}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  handleShare(viewingRun);
                  setViewingRun(null);
                }}
                className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 active:scale-95 transition-transform"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="w-full h-96 relative">
                <RunMap route={viewingRun.route} className="w-full h-full" interactive={true} />
                <div className="absolute inset-0 bg-gradient-to-t from-speed-black via-transparent to-transparent pointer-events-none" />
              </div>

              <div className="p-8 space-y-12 -mt-20 relative z-10">
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center space-y-1">
                    <div className="text-4xl font-display font-black italic tracking-tighter text-neon-green">{viewingRun.distance.toFixed(2)}</div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">KM</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-4xl font-display font-black italic tracking-tighter text-white">{formatDuration(viewingRun.duration)}</div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Tempo</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-4xl font-display font-black italic tracking-tighter text-vibrant-orange">{formatPace(viewingRun.pace)}</div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Pace</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-600 border-b border-white/5 pb-2">Comentários</h4>
                  {viewingRun.comments && viewingRun.comments.length > 0 ? (
                    <div className="space-y-4">
                      {viewingRun.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <button 
                            onClick={() => {
                              onViewProfile(comment.user_id);
                              setViewingRun(null);
                            }}
                            className="hover:scale-105 transition-transform"
                          >
                            <UserAvatar 
                              user={{ uid: comment.user_id, name: comment.user_name, profile_image: comment.user_image }} 
                              size="sm" 
                            />
                          </button>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <button 
                                onClick={() => {
                                  onViewProfile(comment.user_id);
                                  setViewingRun(null);
                                }}
                                className="text-xs font-bold text-neon-green hover:underline"
                              >
                                {comment.user_name}
                              </button>
                              <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                                {comment.created_at ? formatDistanceToNow(safeToDate(comment.created_at), { addSuffix: true, locale: ptBR }) : ''}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-zinc-600 text-xs font-mono uppercase tracking-widest italic">Nenhum comentário ainda</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
