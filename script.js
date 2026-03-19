import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, where, getDocs, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

let currentUser = null;
let currentRole = null;
let currentTeamId = null;
let globalCategories = [];
let timerInterval = null;

// --- LOGIN ---
export async function loginUser() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try { 
        const userCredential = await signInWithEmailAndPassword(auth, e, p);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data().role;
        
        if(role === 'admin') {
            window.location.href = "admin.html";
        } else {
            window.location.href = "auction.html"; // Teams go straight to the stage
        }
    } catch(err) { alert("Login Error: " + err.message); }
}

// --- ADMIN FUNCTIONS ---
export async function saveLeague() {
    const n = document.getElementById('league-name').value;
    const l = document.getElementById('league-logo').value;
    await setDoc(doc(db, "settings", "leagueInfo"), { leagueName: n, leagueLogo: l });
    document.getElementById('league-inputs').classList.add('hidden');
    document.getElementById('league-saved-msg').classList.remove('hidden');
    document.getElementById('team-section').classList.remove('hidden');
}

export async function addTeam() {
    const n = document.getElementById('team-name').value;
    const s = document.getElementById('team-short').value;
    const purse = (await getDoc(doc(db, "settings", "auctionRules"))).data()?.purse || 10000;
    
    await addDoc(collection(db, "teams"), { 
        teamName: n, 
        teamShort: s, 
        purseBalance: Number(purse),
        playersBought: []
    });
}

// NEW: Create Team Login
export async function createTeamUser() {
    const teamId = document.getElementById('login-team-select').value;
    const password = document.getElementById('team-pass-setup').value;
    const teamName = document.getElementById('login-team-select').options[document.getElementById('login-team-select').selectedIndex].text;
    
    if(!teamId || !password) return alert("Select Team and Set Password");

    // Email will be generated as teamshort@auction.com
    const email = teamName.split(" - ")[0].toLowerCase() + "@auction.com";

    try {
        // This is a temporary way to create users. 
        // Note: As an admin, you will be logged out after creating a user.
        // You'll need to log back in as admin.
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", res.user.uid), {
            role: "team",
            teamId: teamId,
            teamName: teamName,
            email: email
        });
        alert(`Account Created!\nEmail: ${email}\nPassword: ${password}\n(You will be logged out now. Please log back in as Admin.)`);
        logout();
    } catch(e) { alert(e.message); }
}

// (SaveRules and AddPlayer stay same as before)
export async function saveRules() {
    const rules = { categories: [], purse: document.getElementById('purse-value').value };
    const names = document.getElementsByClassName('cat-name');
    const bases = document.getElementsByClassName('cat-base');
    const incs = document.getElementsByClassName('cat-inc');
    for(let i=0; i<names.length; i++) {
        if(names[i].value) rules.categories.push({ name: names[i].value, basePrice: bases[i].value, increment: incs[i].value });
    }
    await setDoc(doc(db, "settings", "auctionRules"), rules);
    alert("Rules Saved!");
    document.getElementById('player-section').classList.remove('hidden');
    syncRules();
}

export async function addPlayer() {
    const pData = {
        name: document.getElementById('player-name').value,
        category: document.getElementById('player-category').value,
        basePrice: document.getElementById('player-base-price').value,
        role: document.getElementById('player-role').value,
        status: "unsold"
    };
    await addDoc(collection(db, "players"), pData);
    document.getElementById('player-name').value = "";
}

export function updateBasePrice() {
    const cat = document.getElementById('player-category').value;
    const data = globalCategories.find(c => c.name === cat);
    if(data) document.getElementById('player-base-price').value = data.basePrice;
}

// --- AUCTION LOGIC ---
export async function nextPlayer() {
    const cat = document.getElementById('auction-category-select').value;
    const q = query(collection(db, "players"), where("category", "==", cat), where("status", "==", "unsold"));
    const snap = await getDocs(q);
    if (snap.empty) return alert("Category Complete!");
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    const p = list[Math.floor(Math.random() * list.length)];
    const endTime = Date.now() + 31000; 

    await setDoc(doc(db, "settings", "activeAuction"), {
        playerId: p.id, name: p.name, category: p.category, 
        basePrice: Number(p.basePrice), currentBid: Number(p.basePrice),
        highestBidder: "No Bids", highestBidderId: null, status: "active",
        role: p.role, timerEnd: endTime, highestBidderTeamId: null
    });
}

export async function bid() {
    if(!currentTeamId && currentRole !== 'admin') return alert("Error: No Team ID");
    
    const ref = doc(db, "settings", "activeAuction");
    const snap = await getDoc(ref);
    const data = snap.data();
    if(data.status !== 'active') return;

    // Check Purse
    const teamSnap = await getDoc(doc(db, "teams", currentTeamId));
    const teamData = teamSnap.data();
    const catRule = globalCategories.find(c => c.name === data.category);
    const nextBidAmount = data.currentBid + Number(catRule.increment);

    if(teamData.purseBalance < nextBidAmount) return alert("Not enough money in Purse!");

    await updateDoc(ref, {
        currentBid: increment(Number(catRule.increment)),
        highestBidder: teamData.teamShort, // Show the Team Name
        highestBidderId: currentUser.uid,
        highestBidderTeamId: currentTeamId,
        timerEnd: 0 
    });
}

export async function sellPlayer() {
    const snap = await getDoc(doc(db, "settings", "activeAuction"));
    const data = snap.data();
    if(!data.highestBidderTeamId) return alert("No bids!");

    // 1. Mark player as sold
    await updateDoc(doc(db, "players", data.playerId), { 
        status: "sold", 
        soldToId: data.highestBidderTeamId, 
        price: data.currentBid 
    });

    // 2. Deduct from team purse
    await updateDoc(doc(db, "teams", data.highestBidderTeamId), {
        purseBalance: increment(-data.currentBid)
    });

    await updateDoc(doc(db, "settings", "activeAuction"), { status: "sold", timerEnd: 0 });
}

export async function unsoldPlayer() {
    const snap = await getDoc(doc(db, "settings", "activeAuction"));
    const data = snap.data();
    await updateDoc(doc(db, "players", data.playerId), { status: "unsold_box" });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "unsold", timerEnd: 0 });
}

// --- SYNC & LISTENERS ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentRole = userDoc.data().role;
        currentTeamId = userDoc.data().teamId || null;
        
        const adminControls = document.getElementById('admin-controls');
        const teamControls = document.getElementById('team-controls');
        if (adminControls && currentRole !== 'admin') adminControls.classList.add('hidden');
        if (teamControls && currentRole === 'admin') teamControls.classList.add('hidden');
        syncRules();
    }
});

async function syncRules() {
    const snap = await getDoc(doc(db, "settings", "auctionRules"));
    if (snap.exists()) {
        globalCategories = snap.data().categories;
        const selA = document.getElementById('auction-category-select');
        const selB = document.getElementById('player-category');
        if(selA) {
            selA.innerHTML = '<option value="">Category</option>';
            globalCategories.forEach(c => selA.innerHTML += `<option value="${c.name}">${c.name}</option>`);
        }
        if(selB) {
            selB.innerHTML = '<option value="">Category</option>';
            globalCategories.forEach(c => selB.innerHTML += `<option value="${c.name}">${c.name}</option>`);
        }
    }
}

// Live Listeners for Grids
if (document.getElementById('teams-display')) {
    onSnapshot(collection(db, "teams"), (snap) => {
        const display = document.getElementById('teams-display');
        const loginSelect = document.getElementById('login-team-select');
        if(display) display.innerHTML = "";
        if(loginSelect) loginSelect.innerHTML = '<option value="">Select Team</option>';
        
        snap.forEach(d => {
            const team = d.data();
            if(display) display.innerHTML += `<div class="team-pill"><strong>${team.teamShort}</strong><br><small>$${team.purseBalance}</small></div>`;
            if(loginSelect) loginSelect.innerHTML += `<option value="${d.id}">${team.teamShort} - ${team.teamName}</option>`;
        });
    });
}

// (Local Timer and Live Sync for Auction stage stay same as previous message)
function startLocalTimer(endTime) {
    if(timerInterval) clearInterval(timerInterval);
    const display = document.getElementById('timer-display');
    timerInterval = setInterval(() => {
        const now = Date.now();
        const distance = endTime - now;
        const seconds = Math.floor(distance / 1000);
        if (distance <= 0) {
            clearInterval(timerInterval);
            display.innerText = "0s";
            if(currentRole === 'admin') autoUnsoldCheck();
        } else {
            display.innerText = seconds + "s";
        }
    }, 1000);
}

async function autoUnsoldCheck() {
    const snap = await getDoc(doc(db, "settings", "activeAuction"));
    if(snap.data().highestBidderId === null && snap.data().status === 'active') unsoldPlayer();
}

if (document.getElementById('display-p-name')) {
    onSnapshot(doc(db, "settings", "activeAuction"), (d) => {
        const data = d.data(); if(!data) return;
        document.getElementById('display-p-name').innerText = data.name;
        document.getElementById('display-p-base').innerText = "$" + data.basePrice;
        document.getElementById('display-p-current-bid').innerText = "$" + data.currentBid;
        document.getElementById('display-p-bidder').innerText = data.highestBidder;
        document.getElementById('display-p-cat').innerText = data.category;
        document.getElementById('display-p-role').innerText = data.role;
        const b = document.getElementById('player-status-badge');
        b.innerText = data.status.toUpperCase();
        b.style.background = data.status === 'sold' ? 'var(--success)' : (data.status === 'unsold' ? 'var(--danger)' : 'var(--accent)');
        const tDisp = document.getElementById('timer-display');
        if (data.timerEnd && data.timerEnd > 0 && data.status === 'active') { startLocalTimer(data.timerEnd); }
        else { if(timerInterval) clearInterval(timerInterval); tDisp.innerText = data.status === 'active' ? "BIDDING" : "PAUSED"; }
    });
}

export function logout() { signOut(auth).then(() => window.location.href = "index.html"); }
