import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { INITIAL_LOJAS, INITIAL_USERS } from './data';
import { Loja, User, Visita, Plano, Config, Revisita } from './types';

// Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBoJEcIaWpE9O_dsjq5DQjuqMA0htG7heA",
  authDomain: "vocal-pager-5n56p.firebaseapp.com",
  projectId: "vocal-pager-5n56p",
  storageBucket: "vocal-pager-5n56p.firebasestorage.app",
  messagingSenderId: "535436851092",
  appId: "1:535436851092:web:b7d3477d9e8d56ecf60181",
  firestoreDatabaseId: "ai-studio-rotacerta-fb67450c-fd24-4537-90ce-cd19fc8e398f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection References
export const lojasCol = collection(db, 'lojas');
export const usersCol = collection(db, 'users');
export const visitasCol = collection(db, 'visitas');
export const revisitasCol = collection(db, 'revisitas');
export const planosCol = collection(db, 'planos');

// Helper to seed database if empty
export async function seedDatabaseIfEmpty() {
  try {
    const lojasSnap = await getDocs(lojasCol);
    if (lojasSnap.empty) {
      console.log('Seeding initial lojas to Firestore...');
      for (const loja of INITIAL_LOJAS) {
        await setDoc(doc(db, 'lojas', loja.id), loja);
      }
    }

    const usersSnap = await getDocs(usersCol);
    const existingUserIds = new Set(usersSnap.docs.map(doc => doc.id));
    for (const user of INITIAL_USERS) {
      if (!existingUserIds.has(user.id)) {
        console.log(`Seeding missing user ${user.nome} to Firestore...`);
        await setDoc(doc(db, 'users', user.id), user);
      }
    }

    // Initialize global config document
    const configDoc = doc(db, 'config', 'global');
    await setDoc(configDoc, { prazoPadrao: 15 }, { merge: true });
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Data synchronization hooks/helpers
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  onError?: (error: any) => void
) {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data() } as T);
      });
      onUpdate(items);
    },
    (error) => {
      console.error(`Firestore subscription error for ${collectionName}:`, error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  onUpdate: (data: T) => void,
  onError?: (error: any) => void
) {
  return onSnapshot(
    doc(db, collectionName, docId),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as T);
      }
    },
    (error) => {
      console.error(`Firestore subscription error for ${collectionName}/${docId}:`, error);
      if (onError) onError(error);
    }
  );
}

// CRUD helper functions
export async function saveLojaToFirestore(loja: Loja) {
  const cleanLoja = { ...loja };
  // Remove non-serializable or clean fields if necessary
  await setDoc(doc(db, 'lojas', loja.id), cleanLoja);
}

export async function deleteLojaFromFirestore(id: string) {
  await deleteDoc(doc(db, 'lojas', id));
}

export async function saveUserToFirestore(user: User) {
  await setDoc(doc(db, 'users', user.id), user);
}

export async function saveVisitaToFirestore(visita: Visita) {
  await setDoc(doc(db, 'visitas', visita.id), visita);
}

export async function deleteVisitaFromFirestore(id: string) {
  await deleteDoc(doc(db, 'visitas', id));
}

export async function saveRevisitaToFirestore(revisita: Revisita) {
  await setDoc(doc(db, 'revisitas', revisita.id), revisita);
}

export async function deleteRevisitaFromFirestore(id: string) {
  await deleteDoc(doc(db, 'revisitas', id));
}

export async function savePlanoToFirestore(plano: Plano) {
  await setDoc(doc(db, 'planos', plano.id), plano);
}

export async function deletePlanoFromFirestore(id: string) {
  await deleteDoc(doc(db, 'planos', id));
}

export async function saveConfigToFirestore(config: Config) {
  await setDoc(doc(db, 'config', 'global'), config);
}
