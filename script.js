import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your Firebase configuration
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

// Login Logic
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');
    
    // Clear previous error
    errorMsg.innerText = "";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
// Check the user's role in the database
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "admin") {
                window.location.href = "admin.html"; // This opens the admin page
            } else {
                alert("Welcome, Team User!");
                // window.location.href = "team.html";
            }
        }        
        // In the next step, we will create the redirect to the Admin Dashboard
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Invalid login details. Please try again.";
        errorMsg.style.color = "#ff4d4d";
    }
}
// --- ADMIN DASHBOARD FUNCTIONS ---

// 1. Function to Save League Name
export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;

    if (!name) {
        alert("Please enter a League Name");
        return;
    }

    try {
        // This saves the league info to a special folder in your database called 'settings'
        import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
        await setDoc(doc(db, "settings", "leagueInfo"), {
            leagueName: name,
            leagueLogo: logo
        });
        alert("League Settings Saved!");
        // We will add the redirect to Team Setup here in the next step
    } catch (e) {
        console.error("Error saving league: ", e);
    }
}

// 2. Function to Logout
export function logout() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
}
