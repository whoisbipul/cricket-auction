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

// --- AUTH LISTENER ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentRole = userDoc.data().role;
        
        // Hide Admin controls if the user is a team
        const adminBox = document.getElementById('admin-controls');
        if (adminBox && currentRole !== 'admin') adminBox.style.display = 'none';
        
        // Fetch categories for the dropdown if we are on the auction page
        loadCategoriesIntoDropdown();
    }
});

// --- LOAD CATEGORIES FOR AUCTION ---
async function loadCategoriesIntoDropdown() {
    const rulesDoc = await getDoc(doc(db, "settings", "auctionRules"));
    if (rulesDoc.exists()) {
        auctionRules = rulesDoc.data();
        const select = document.getElementById('auction-category-select');
        if(select) {
            select.innerHTML = '<option value="">Select Category</option>';
            auctionRules.categories.forEach(cat => {
                select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
            });
        }
    }
}

// --- START NEXT PLAYER (ADMIN ONLY) ---
export async function nextPlayer() {
    const category = document.getElementById('auction-category-select').value;
    if (!category) { alert("Select a category first!"); return; }

    // 1. Get all unsold players in this category
    const q = query(collection(db, "players"), where("category", "==", category), where("status", "==", "unsold"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) { alert("No more players in this category!"); return; }

    // 2. Pick a random player
    const players = [];
    querySnapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
    const randomPlayer = players[Math.floor(Math.random() * players.size)]; // Tiny fix for index
    const p = players[Math.floor(Math.random() * players.length)];

    // 3. Set this player as the active auction
    await setDoc(doc(db, "settings", "activeAuction"), {
        playerId: p.id,
        name: p.name,
        role: p.role,
        source: p.source,
        category: p.category,
        basePrice: Number(p.basePrice),
        currentBid: Number(p.basePrice),
        highestBidder: "No Bids Yet",
        highestBidderId: null,
        photo: p.photo,
        status: "active",
        timestamp: Date.now()
    });
}

// --- PLACE BID (TEAM ONLY) ---
export async function bid() {
    if (currentRole !== 'admin') {
        // We will add logic here to check team's purse later
    }

    const auctionDoc = await getDoc(doc(db, "settings", "activeAuction"));
    const data = auctionDoc.data();
    
    // Find the increment for this category
    const catRule = auctionRules.categories.find(c => c.name === data.category);
    const inc = Number(catRule.increment);

    await updateDoc(doc(db, "settings", "activeAuction"), {
        currentBid: increment(inc),
        highestBidder: currentUser.email, // We will replace this with Team Name later
        highestBidderId: currentUser.uid
    });
}

// --- SELL/UNSOLD LOGIC ---
export async function sellPlayer() {
    const auctionDoc = await getDoc(doc(db, "settings", "activeAuction"));
    const data = auctionDoc.data();
    if (!data.highestBidderId) { alert("No bids placed!"); return; }

    await updateDoc(doc(db, "players", data.playerId), { status: "sold", soldTo: data.highestBidder, soldPrice: data.currentBid });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "sold" });
    alert("Player Sold!");
}

export async function unsoldPlayer() {
    const auctionDoc = await getDoc(doc(db, "settings", "activeAuction"));
    const data = auctionDoc.data();
    await updateDoc(doc(db, "players", data.playerId), { status: "unsold_box" });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "unsold" });
    alert("Moved to Unsold Box");
}

// --- LIVE LISTENER FOR AUCTION STAGE ---
if (document.getElementById('display-p-name')) {
    onSnapshot(doc(db, "settings", "activeAuction"), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            document.getElementById('display-p-name').innerText = data.name;
            document.getElementById('display-p-role').innerText = data.role;
            document.getElementById('display-p-source').innerText = data.source;
            document.getElementById('display-p-cat').innerText = data.category;
            document.getElementById('display-p-base').innerText = "$" + data.basePrice;
            document.getElementById('display-p-current-bid').innerText = "$" + data.currentBid;
            document.getElementById('display-p-bidder').innerText = data.highestBidder;
            document.getElementById('display-p-img').src = data.photo || 'https://via.placeholder.com/200';
            
            const badge = document.getElementById('player-status-badge');
            badge.innerText = data.status.toUpperCase();
            badge.className = "status-" + data.status;
        }
    });
}

// --- PREVIOUS FUNCTIONS (LOGIN/SETUP) ---
export async function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "admin.html";
    } catch (error) { alert("Login failed"); }
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
    const rules = {
        categories: [],
        purse: document.getElementById('purse-value').value
        // ... rest of rules
    };
    const names = document.getElementsByClassName('cat-name');
    const bases = document.getElementsByClassName('cat-base');
    const incs = document.getElementsByClassName('cat-inc');
    for(let i=0; i<names.length; i++) {
        if(names[i].value) rules.categories.push({ name: names[i].value, basePrice: bases[i].value, increment: incs[i].value });
    }
    await setDoc(doc(db, "settings", "auctionRules"), rules);
    alert("Rules Saved!");
    document.getElementById('player-section').classList.remove('hidden');
}

export async function addPlayer() {
    const pData = {
        name: document.getElementById('player-name').value,
        category: document.getElementById('player-category').value,
        basePrice: document.getElementById('player-base-price').value,
        status: "unsold"
    };
    await addDoc(collection(db, "players"), pData);
    alert("Added!");
}

export function logout() { signOut(auth).then(() => { window.location.href = "index.html"; }); }
