import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Feed from './components/Feed';
import Events from './components/Events';
import Ranking from './components/Ranking';
import Profile from './components/Profile';
import Admin from './components/Admin';
import RunTracker from './components/RunTracker';
import Login from './components/Login';
import { AnimatePresence, motion } from 'motion/react';
import { handleFirestoreError, OperationType, testConnection } from './firebase-utils';
import ErrorBoundary from './components/ErrorBoundary';

import Logo from './components/Logo';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTracking, setIsTracking] = useState(false);
  const [targetProfileId, setTargetProfileId] = useState<string | undefined>(undefined);

  useEffect(() => {
    testConnection();
    let unsubUser: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous listener if it exists
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user data
        unsubUser = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({ uid: docSnap.id, ...data } as UserProfile);
          } else {
            // Create new user profile
            const isAdminEmail = firebaseUser.email === "lucasf_freitas99@hotmail.com";
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Corredor',
              profile_image: firebaseUser.photoURL || '',
              role: isAdminEmail ? 'Admin' : 'Usuario',
              xp_total: 0,
              level: 1,
              current_streak: 0,
              total_km: 0,
              city: '', // User must set in profile
              state: ''
            };
            try {
              await setDoc(userRef, {
                ...newUser,
                created_at: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
          setLoading(false);
        }, (error) => {
          // Only report error if we are still supposed to be logged in
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-speed-black flex flex-col items-center justify-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Logo size="xl" />
        </motion.div>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-neon-green/20 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin neon-glow" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} onStartRun={() => setIsTracking(true)} setActiveTab={setActiveTab} />;
      case 'feed': return <Feed user={user} onViewProfile={(uid) => { setTargetProfileId(uid); setActiveTab('profile'); }} />;
      case 'events': return <Events user={user} />;
      case 'ranking': return <Ranking currentUser={user} />;
      case 'profile': return (
        <Profile 
          user={user} 
          targetUserId={targetProfileId} 
          onBack={() => {
            setTargetProfileId(undefined);
            setActiveTab('feed');
          }} 
        />
      );
      case 'admin': return user.role === 'Admin' ? <Admin /> : <Dashboard user={user} onStartRun={() => setIsTracking(true)} setActiveTab={setActiveTab} />;
      default: return <Dashboard user={user} onStartRun={() => setIsTracking(true)} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user}
        onStartRun={() => setIsTracking(true)}
      >
        <AnimatePresence mode="wait">
          <div key={activeTab}>
            {renderContent()}
          </div>
        </AnimatePresence>
      </Layout>

      <AnimatePresence>
        {isTracking && (
          <RunTracker user={user} onClose={() => setIsTracking(false)} />
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
