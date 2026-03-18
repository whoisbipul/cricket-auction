import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- YOUR FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCF5fo4zu4G7qD_wllxSy5cJPp1BTMCPog",
  authDomain: "cricketauction-dac71.firebaseapp.com",
  projectId: "cricketauction-dac71",
  storageBucket: "cricketauction-dac71.firebasestorage.app",
  messagingSenderId: "767785113298",
  appId: "1:767785113298:web:bb87d9d2ea845a2a95bf0b",
  measurementId: "G-GNP2EJ5G6Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 1. LOGIN LOGIC ---
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');
    
    if(errorMsg) errorMsg.innerText = "Connecting...";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists() && userDoc.data().role === "admin") {
            window.location.href = "admin.html";
        } else {
            alert("Success! Welcome Team User.");
        }
    } catch (error) {
        if(errorMsg) errorMsg.innerText = "Login failed. Check credentials.";
    }
}

// --- 2. LEAGUE SETUP LOGIC (Improved Flow) ---
export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;
    
    if (!name) { alert("Please enter a League Name"); return; }

    try {
        await setDoc(doc(db, "settings", "leagueInfo"), {
            leagueName: name,
            leagueLogo: logo
        });
        
        // UI ANIMATION & FLOW:
        // 1. Show the success badge
        document.getElementById('league-saved-msg').classList.remove('hidden');
        // 2. Disable inputs so they don't look messy
        document.getElementById('league-name').disabled = true;
        document.getElementById('league-logo').disabled = true;
        // 3. Hide the save button
        document.getElementById('save-league-btn').style.display = 'none';
        // 4. Reveal the Team Section with a smooth fade
        const teamSection = document.getElementById('team-section');
        teamSection.classList.remove('hidden');
        teamSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (e) { alert("Error saving: " + e.message); }
}

// --- 3. TEAM SETUP LOGIC ---
export async function addTeam() {
    const tName = document.getElementById('team-name').value;
    const tShort = document.getElementById('team-short').value;
    const tLogo = document.getElementById('team-logo').value;
    const mName = document.getElementById('manager-name').value;

    if (!tName || !tShort) { alert("Fill Team Name and Short Form"); return; }

    try {
        await addDoc(collection(db, "teams"), {
            teamName: tName,
            teamShort: tShort,
            teamLogo: tLogo,
            managerName: mName,
            timestamp: Date.now()
        });

        // Clear inputs for next entry
        document.getElementById('team-name').value = "";
        document.getElementById('team-short').value = "";
        document.getElementById('team-logo').value = "";
        document.getElementById('manager-name').value = "";
        
    } catch (e) { console.error(e); }
}

// --- 4. LIVE LISTENER (Updates Team List Automatically) ---
const teamsDisplay = document.getElementById('teams-display');
if (teamsDisplay) {
    onSnapshot(collection(db, "teams"), (snapshot) => {
        teamsDisplay.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const team = doc.data();
            const teamDiv = document.createElement('div');
            teamDiv.className = "team-pill";
            teamDiv.innerHTML = `
                <img src="${team.teamLogo || 'https://via.placeholder.com/50'}" style="width:40px;height:40px;border-radius:50%;margin-bottom:10px;object-fit:cover;">
                <strong>${team.teamShort}</strong>
                <span style="font-size:11px; color:#94a3b8;">${team.teamName}</span>
            `;
            teamsDisplay.appendChild(teamDiv);
        });
    });
}

// --- 5. LOGOUT ---
export function logout() {
    signOut(auth).then(() => { window.location.href = "index.html"; });
}
