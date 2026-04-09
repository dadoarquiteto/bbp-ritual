// ==================================================
// FIREBASE INIT - BBP RITUAL
// ==================================================

const firebaseConfig = {
  apiKey: "AIzaSyDuWLQV97c8s2LKUg-ubHa2WQC8BIQhFlM",
  authDomain: "bbp-ritual-live.firebaseapp.com",
  databaseURL: "https://bbp-ritual-live-default-rtdb.firebaseio.com",
  projectId: "bbp-ritual-live",
  storageBucket: "bbp-ritual-live.firebasestorage.app",
  messagingSenderId: "869468541237",
  appId: "1:869468541237:web:11a86a2e66c10de0b9bc7c"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

window.BBPFirebase = {
  database,
  activeSeedsRef: (scene) => database.ref(`ritual/scene_${scene}/activeSeeds`),
  participantsRef: (scene) => database.ref(`ritual/scene_${scene}/participants`),
  completedRef: (scene) => database.ref(`ritual/scene_${scene}/completed`)
};

console.log('🔥 Firebase iniciado');