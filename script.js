import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your Firebase configuration (Using the keys from your screenshot)
const firebaseConfig = {
  apiKey: "AIzaSyCF5fo4zu4G7qD_wllxSy5cJpp1BTMCPog",
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

// --- 1. LOGIN LOGIC ---
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');
    
    if(!email || !password) {
        errorMsg.innerText = "Please enter both email and password.";
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Now we check the "users" folder in the database to see if this user is an admin
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "admin") {
                // SUCCESS: Redirect to the Admin page
                window.location.href = "admin.html";
            } else {
                // Redirect to Team page (we will build this later)
                alert("Welcome Team Member! Team dashboard coming soon.");
            }
        } else {
            errorMsg.innerText = "User role not found in database.";
        }
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Login failed: " + error.message;
        errorMsg.style.color = "#ff4d4d";
    }
}

// --- 2. LEAGUE SETUP LOGIC (For admin.html) ---
export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;

    if (!name) {
        alert("Please enter a League Name");
        return;
    }

    try {
        // Save the league info to a 'settings' collection in Firestore
        await setDoc(doc(db, "settings", "leagueInfo"), {
            leagueName: name,
            leagueLogo: logo
        });
        alert("League Settings Saved successfully!");
    } catch (e) {
        console.error("Error saving league: ", e);
        alert("Error saving league. Check console.");
    }
}

// --- 3. LOGOUT LOGIC ---
export function logout() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Logout Error", error);
    });
}
