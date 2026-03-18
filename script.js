// VERSION 1.1 - AUTH REPAIR
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your exact keys from the screenshot
const firebaseConfig = {
  apiKey: "AIzaSyCF5fo4zu4G7qD_wllxSy5cJPp1BTMCPog",
  authDomain: "cricketauction-dac71.firebaseapp.com",
  projectId: "cricketauction-dac71",
  storageBucket: "cricketauction-dac71.firebasestorage.app",
  messagingSenderId: "767785113298",
  appId: "1:767785113298:web:bb87d9d2ea845a2a95bf0b",
  measurementId: "G-GNP2EJ5G6Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// LOGIN LOGIC
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');
    
    errorMsg.innerText = "Connecting to League...";
    errorMsg.style.color = "#38bdf8";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch User Role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "admin") {
                window.location.href = "admin.html";
            } else {
                alert("Welcome Team User!");
                // window.location.href = "team.html";
            }
        } else {
            errorMsg.innerText = "User role not found in database.";
        }
    } catch (error) {
        console.error("Login Error:", error.code);
        errorMsg.innerText = "Login failed. Check email/password.";
        errorMsg.style.color = "#ff4d4d";
    }
}

// SAVE LEAGUE LOGIC (For admin.html)
export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;
    if (!name) { alert("Enter League Name"); return; }

    try {
        await setDoc(doc(db, "settings", "leagueInfo"), {
            leagueName: name,
            leagueLogo: logo
        });
        alert("League Saved Successfully!");
    } catch (e) { 
        console.error(e);
        alert("Save failed: " + e.message); 
    }
}

// LOGOUT LOGIC
export function logout() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
}
