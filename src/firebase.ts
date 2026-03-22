import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use the named database if provided and not "(default)", otherwise use the default database
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' && dbId !== ''
  ? getFirestore(app, dbId)
  : getFirestore(app);
export const auth = getAuth(app);

// Lazy initialization for Storage to prevent "Service storage is not available" on startup
let storageInstance: FirebaseStorage | null = null;
export const getFirebaseStorage = () => {
  if (!storageInstance) {
    try {
      const bucket = (firebaseConfig as any).storageBucket;
      if (!bucket) {
        console.warn("Storage Bucket not found in config, using default.");
      }
      storageInstance = getStorage(app, bucket ? `gs://${bucket}` : undefined);
    } catch (error) {
      console.error("Firebase Storage could not be initialized:", error);
      throw new Error("O serviço de armazenamento (Storage) não está disponível. Por favor, verifique a configuração do Firebase.");
    }
  }
  return storageInstance;
};
