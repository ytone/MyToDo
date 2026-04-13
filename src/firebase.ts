import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyATY63tPPdSY1TLZvf75WGbhW5OctaqwwE",
  authDomain: "mytodo-f59bb.firebaseapp.com",
  projectId: "mytodo-f59bb",
  storageBucket: "mytodo-f59bb.firebasestorage.app",
  messagingSenderId: "933295613368",
  appId: "1:933295613368:web:3a4feeb6e1f9c61a769b4d"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
