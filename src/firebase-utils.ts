import { auth } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    console.log("Iniciando teste de conexão com o projeto: gopace-fbcca...");
    // Attempt to get a non-existent doc to test connection
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Conexão com Firestore estabelecida com sucesso!");
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('the client is offline')) {
      console.error("ERRO CRÍTICO: O Firestore não está respondendo. Verifique se o 'Firestore Database' está ativo no projeto gopace-fbcca e se o seu computador/servidor tem acesso à internet.");
    } else if (errorMessage.includes('permission-denied')) {
      console.log("Conexão OK, mas acesso negado (isso é normal se você ainda não publicou as Regras de Segurança).");
    } else {
      console.error("Erro inesperado no teste de conexão:", errorMessage);
    }
  }
}
