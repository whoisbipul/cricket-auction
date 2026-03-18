import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, where, getDocs, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
let auctionRules = null;
let globalCategories = [];

// --- AUTH & ROLE CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentRole = userDoc.data().role;
        
        // Hide/Show Admin tools
        const adminControls = document.getElementById('admin-controls');
        const teamControls = document.getElementById('team-controls');
        if (adminControls && currentRole !== 'admin') adminControls.style.display = 'none';
        if (teamControls && currentRole === 'admin') teamControls.style.display = 'none';

        loadCategories();
    }
});

async function loadCategories() {
    const rulesDoc = await getDoc(doc(db, "settings", "auctionRules"));
    if (rulesDoc.exists()) {
        auctionRules = rulesDoc.data();
        globalCategories = auctionRules.categories;
        const select = document.getElementById('auction-category-select');
        const setupSelect = document.getElementById('player-category');
        
        if (select) {
            select.innerHTML = '<option value="">Category</option>';
            globalCategories.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
        }
        if (setupSelect) {
            setupSelect.innerHTML = '<option value="">Select Category</option>';
            globalCategories.forEach(c => setupSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`);
        }
    }
}

// --- SETUP LOGIC ---
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, email, password); window.location.href = "admin.html"; } catch(e) { alert("Failed"); }
}

export async function saveLeague() {
    const name = document.getElementById('league-name').value;
    const logo = document.getElementById('league-logo').value;
    await setDoc(doc(db, "settings", "leagueInfo"), { leagueName: name, leagueLogo: logo });
    document.getElementById('league-saved-msg').classList.remove('hidden');
    document.getElementById('team-section').classList.remove('hidden');
}

export async function addTeam() {
    const tName = document.getElementById('team-name').value;
    const tShort = document.getElementById('team-short').value;
    await addDoc(collection(db, "teams"), { teamName: tName, teamShort: tShort });
}

export async function saveRules() {
    const rules = { categories: [], purse: document.getElementById('purse-value').value };
    const names = document.getElementsByClassName('cat-name');
    const bases = document.getElementsByClassName('cat-base');
    const incs = document.getElementsByClassName('cat-inc');
    for(let i=0; i<names.length; i++) {
        if(names[i].value) rules.categories.push({ name: names[i].value, basePrice: bases[i].value, increment: incs[i].value });
    }
    await setDoc(doc(db, "settings", "auctionRules"), rules);
    alert("Saved!");
    document.getElementById('player-section').classList.remove('hidden');
    loadCategories();
}

export function updateBasePrice() {
    const cat = document.getElementById('player-category').value;
    const data = globalCategories.find(c => c.name === cat);
    if(data) document.getElementById('player-base-price').value = data.basePrice;
}

export async function addPlayer() {
    const pData = {
        name: document.getElementById('player-name').value,
        category: document.getElementById('player-category').value,
        basePrice: document.getElementById('player-base-price').value,
        source: document.getElementById('player-source').value,
        role: document.getElementById('player-role').value,
        photo: document.getElementById('player-photo').value,
        status: "unsold"
    };
    await addDoc(collection(db, "players"), pData);
    alert("Player Added!");
}

// --- AUCTION ENGINE LOGIC ---
export async function nextPlayer() {
    const cat = document.getElementById('auction-category-select').value;
    if (!cat) return alert("Select Category!");

    const q = query(collection(db, "players"), where("category", "==", cat), where("status", "==", "unsold"));
    const snap = await getDocs(q);
    
    if (snap.empty) return alert("Category Finished!");

    const players = [];
    snap.forEach(d => players.push({ id: d.id, ...d.data() }));
    const p = players[Math.floor(Math.random() * players.length)];

    await setDoc(doc(db, "settings", "activeAuction"), {
        playerId: p.id, name: p.name, photo: p.photo, category: p.category, 
        basePrice: Number(p.basePrice), currentBid: Number(p.basePrice),
        highestBidder: "No Bids", highestBidderId: null, status: "active",
        role: p.role, source: p.source
    });
}

export async function bid() {
    const docRef = doc(db, "settings", "activeAuction");
    const snap = await getDoc(docRef);
    const data = snap.data();
    
    const catRule = globalCategories.find(c => c.name === data.category);
    const inc = Number(catRule.increment);

    await updateDoc(docRef, {
        currentBid: increment(inc),
        highestBidder: currentUser.email,
        highestBidderId: currentUser.uid
    });
}

export async function sellPlayer() {
    const snap = await getDoc(doc(db, "settings", "activeAuction"));
    const data = snap.data();
    if (!data.highestBidderId) return alert("No bids!");

    await updateDoc(doc(db, "players", data.playerId), { status: "sold", soldTo: data.highestBidder, price: data.currentBid });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "sold" });
}

export async function unsoldPlayer() {
    const snap = await getDoc(doc(db, "settings", "activeAuction"));
    const data = snap.data();
    await updateDoc(doc(db, "players", data.playerId), { status: "unsold_box" });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "unsold" });
}

// --- LIVE SYNC ---
if (document.getElementById('display-p-name')) {
    onSnapshot(doc(db, "settings", "activeAuction"), (d) => {
        const data = d.data();
        if (!data) return;
        document.getElementById('display-p-name').innerText = data.name;
        document.getElementById('display-p-img').src = data.photo || "https://via.placeholder.com/250";
        document.getElementById('display-p-base').innerText = "$" + data.basePrice;
        document.getElementById('display-p-current-bid').innerText = "$" + data.currentBid;
        document.getElementById('display-p-bidder').innerText = data.highestBidder;
        document.getElementById('display-p-cat').innerText = data.category;
        document.getElementById('display-p-role').innerText = data.role;
        document.getElementById('display-p-source').innerText = data.source;
        
        const badge = document.getElementById('player-status-badge');
        badge.innerText = data.status.toUpperCase();
        badge.className = "status-" + data.status;
    });
}

export function logout() { signOut(auth).then(() => window.location.href = "index.html"); }
