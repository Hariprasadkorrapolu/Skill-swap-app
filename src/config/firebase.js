import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAtO599cveXyKKg4qpNX149lTyDGdWTHMY',
  authDomain: 'myapp-1b90c.firebaseapp.com',
  projectId: 'myapp-1b90c',
  storageBucket: 'myapp-1b90c.appspot.com',
  messagingSenderId: '209179581929',
  appId: '1:209179581929:web:0e513b8d8831e44ce67f78',
};

const app = initializeApp(firebaseConfig);

// Detect platform and initialize Auth accordingly
let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app); // Web doesn't support getReactNativePersistence
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };
