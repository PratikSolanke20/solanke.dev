import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCj6rTVpKvXoOFlNJomLvtqiXzHCNXau4s",
  authDomain: "solankedev-8878c.firebaseapp.com",
  projectId: "solankedev-8878c",
  storageBucket: "solankedev-8878c.firebasestorage.app",
  messagingSenderId: "410768139831",
  appId: "1:410768139831:web:e3c163c3fdb94db93001b2",
  measurementId: "G-2GK06Y4KCL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
