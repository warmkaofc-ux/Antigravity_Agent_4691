// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDsXT710FFpWZD9NEVym9LtNsJviIeeer0",
    authDomain: "antigravityagent4691.firebaseapp.com",
    projectId: "antigravityagent4691",
    storageBucket: "antigravityagent4691.firebasestorage.app",
    messagingSenderId: "487549812505",
    appId: "1:487549812505:web:a012353519c1a7d195cf88",
    measurementId: "G-E5VBZPVK0H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log("Firebase Initialized:", app.name);

export { app, analytics };
