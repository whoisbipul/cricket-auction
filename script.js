import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- FIREBASE CONFIG ---
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

// --- LOGIN ---
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
            window.location.href = "admin.html";
        }
    } catch (error) { alert("Login failed"); }
}

// --- STEP 1: SAVE LEAGUE ---
export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;
    if (!name) { alert("Enter League Name"); return; }
    try {
        await setDoc(doc(db, "settings", "leagueInfo"), { leagueName: name, leagueLogo: logo });
        document.getElementById('league-saved-msg').classList.remove('hidden');
        document.getElementById('league-name').disabled = true;
        document.getElementById('league-logo').disabled = true;
        document.getElementById('save-league-btn').style.display = 'none';
        document.getElementById('team-section').classList.remove('hidden');
    } catch (e) { alert("Error: " + e.message); }
}

// --- STEP 2: ADD TEAM ---
export async function addTeam() {
    const tName = document.getElementById('team-name').value;
    const tShort = document.getElementById('team-short').value;
    const tLogo = document.getElementById('team-logo').value;
    const mName = document.getElementById('manager-name').value;
    if (!tName || !tShort) { alert("Fill Name and Short Form"); return; }
    try {
        await addDoc(collection(db, "teams"), { teamName: tName, teamShort: tShort, teamLogo: tLogo, managerName: mName });
        document.getElementById('team-name').value = "";
        document.getElementById('team-short').value = "";
        document.getElementById('team-logo').value = "";
        document.getElementById('manager-name').value = "";
    } catch (e) { console.error(e); }
}

// --- STEP 3: SAVE AUCTION RULES ---
export async function saveRules() {
    const rules = {
        purse: document.getElementById('purse-value').value,
        minPlayers: document.getElementById('min-players').value,
        maxPlayers: document.getElementById('max-players').value,
        minBat: document.getElementById('min-bat').value,
        minBowl: document.getElementById('min-bowl').value,
        minAR: document.getElementById('min-ar').value,
        minWK: document.getElementById('min-wk').value,
        categories: []
    };

    const names = document.getElementsByClassName('cat-name');
    const bases = document.getElementsByClassName('cat-base');
    const incs = document.getElementsByClassName('cat-inc');

    for(let i=0; i<names.length; i++) {
        if(names[i].value) {
            rules.categories.push({
                name: names[i].value,
                basePrice: bases[i].value,
                increment: incs[i].value
            });
        }
    }

    try {
        await setDoc(doc(db, "settings", "auctionRules"), rules);
        alert("Auction Rules Saved!");
        // We will trigger the Player Pool section in the next step
    } catch (e) { alert("Save failed: " + e.message); }
}

// --- LIVE TEAM LISTENER ---
const teamsDisplay = document.getElementById('teams-display');
if (teamsDisplay) {
    onSnapshot(collection(db, "teams"), (snapshot) => {
        teamsDisplay.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const team = doc.data();
            const teamDiv = document.createElement('div');
            teamDiv.className = "team-pill";
            teamDiv.innerHTML = `<img src="${team.teamLogo || 'https://via.placeholder.com/40'}" class="team-logo-small"><strong>${team.teamShort}</strong>`;
            teamsDisplay.appendChild(teamDiv);
        });
    });
}

// --- LOGOUT ---
export function logout() { signOut(auth).then(() => { window.location.href = "index.html"; }); }
