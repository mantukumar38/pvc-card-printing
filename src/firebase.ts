// Firebase configuration - sirf Firestore Database use kar rahe hain
// Files Cloudinary par upload hoti hain (free 25 GB)

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdC-UtHj5XQ4ins2JnpxzivIG3l1gS4aE",
  authDomain: "pvc-card-printing-6e321.firebaseapp.com",
  projectId: "pvc-card-printing-6e321",
  storageBucket: "pvc-card-printing-6e321.firebasestorage.app",
  messagingSenderId: "211707500028",
  appId: "1:211707500028:web:7857931c09d789e84d0e79",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (orders database)
export const db = getFirestore(app);

export default app;
