import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

let globalCategories = []; // To store categories for auto-fill

// --- LOGIN ---
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "admin.html";
    } catch (error) { alert("Login failed"); }
}

// --- STEP 1: SAVE LEAGUE ---
export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;
    if (!name) return;
    try {
        await setDoc(doc(db, "settings", "leagueInfo"), { leagueName: name, leagueLogo: logo });
        document.getElementById('league-saved-msg').classList.remove('hidden');
        document.getElementById('team-section').classList.remove('hidden');
    } catch (e) { alert(e.message); }
}

// --- STEP 2: ADD TEAM ---
export async function addTeam() {
    const tName = document.getElementById('team-name').value;
    const tShort = document.getElementById('team-short').value;
    const tLogo = document.getElementById('team-logo').value;
    const mName = document.getElementById('manager-name').value;
    if (!tName || !tShort) return;
    await addDoc(collection(db, "teams"), { teamName: tName, teamShort: tShort, teamLogo: tLogo, managerName: mName });
    document.getElementById('team-name').value = ""; document.getElementById('team-short').value = "";
}

// --- STEP 3: SAVE RULES & FILL DROPDOWN ---
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
            rules.categories.push({ name: names[i].value, basePrice: bases[i].value, increment: incs[i].value });
        }
    }

    try {
        await setDoc(doc(db, "settings", "auctionRules"), rules);
        globalCategories = rules.categories;
        
        // Fill Player Category Dropdown
        const catSelect = document.getElementById('player-category');
        catSelect.innerHTML = '<option value="">Select Category</option>';
        rules.categories.forEach(cat => {
            catSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        });

        alert("Rules Saved!");
        document.getElementById('player-section').classList.remove('hidden');
        document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { alert(e.message); }
}

// --- STEP 4: PLAYER POOL LOGIC ---
export function updateBasePrice() {
    const selectedCat = document.getElementById('player-category').value;
    const categoryData = globalCategories.find(c => c.name === selectedCat);
    if (categoryData) {
        document.getElementById('player-base-price').value = categoryData.basePrice;
    }
}

export async function addPlayer() {
    const pData = {
        name: document.getElementById('player-name').value,
        source: document.getElementById('player-source').value,
        role: document.getElementById('player-role').value,
        category: document.getElementById('player-category').value,
        basePrice: document.getElementById('player-base-price').value,
        photo: document.getElementById('player-photo').value,
        status: "unsold" // Default status
    };

    if (!pData.name || !pData.category) { alert("Name and Category required"); return; }

    try {
        await addDoc(collection(db, "players"), pData);
        alert(pData.name + " added to pool!");
        document.getElementById('player-name').value = "";
        document.getElementById('player-photo').value = "";
    } catch (e) { alert(e.message); }
}

// --- LIVE LISTENERS ---
if (document.getElementById('teams-display')) {
    onSnapshot(collection(db, "teams"), (snap) => {
        const display = document.getElementById('teams-display');
        display.innerHTML = "";
        snap.forEach(d => {
            display.innerHTML += `<div class="team-pill"><strong>${d.data().teamShort}</strong></div>`;
        });
    });
}

if (document.getElementById('players-display')) {
    onSnapshot(query(collection(db, "players"), orderBy("category")), (snap) => {
        const display = document.getElementById('players-display');
        display.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            display.innerHTML += `
                <div class="player-card">
                    <img src="${p.photo || 'https://via.placeholder.com/60'}" class="p-img">
                    <div class="p-info">
                        <strong>${p.name}</strong>
                        <span>${p.role} | ${p.category} | $${p.basePrice}</span>
                    </div>
                </div>`;
        });
    });
}

export function logout() { signOut(auth).then(() => { window.location.href = "index.html"; }); }
