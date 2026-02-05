// Firebase Configuration - Uses Firebase CDN (compat version for non-module scripts)
// Firebase will be initialized via CDN script tags in index.html

const firebaseConfig = {
    apiKey: "AIzaSyDsXT710FFpWZD9NEVym9LtNsJviIeeer0",
    authDomain: "antigravityagent4691.firebaseapp.com",
    projectId: "antigravityagent4691",
    storageBucket: "antigravityagent4691.firebasestorage.app",
    messagingSenderId: "487549812505",
    appId: "1:487549812505:web:a012353519c1a7d195cf88",
    measurementId: "G-E5VBZPVK0H"
};

// Initialize Firebase (using compat libraries loaded via CDN)
let firebaseApp = null;
let analytics = null;

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            if (firebase.analytics) {
                analytics = firebase.analytics();
            }
            console.log("Firebase Initialized:", firebaseApp.name);
        } else {
            console.warn("Firebase SDK not loaded");
        }
    } catch (e) {
        console.error("Firebase init error:", e);
    }
}
