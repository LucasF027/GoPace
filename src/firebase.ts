import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Lazy initialization for Storage to prevent "Service storage is not available" on startup
let storageInstance: any = null;
export const getFirebaseStorage = () => {
  if (!storageInstance) {
    try {
      storageInstance = getStorage(app);
    } catch (error) {
      console.error("Firebase Storage could not be initialized:", error);
      throw new Error("O serviço de armazenamento (Storage) não está disponível. Por favor, verifique a configuração do Firebase.");
    }
  }
  return storageInstance;
};
