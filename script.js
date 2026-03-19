import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, where, getDocs, updateDoc, increment, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { apiKey: "AIzaSyCF5fo4zu4G7qD_wllxSy5cJPp1BTMCPog", authDomain: "cricketauction-dac71.firebaseapp.com", projectId: "cricketauction-dac71", storageBucket: "cricketauction-dac71.firebasestorage.app", messagingSenderId: "767785113298", appId: "1:767785113298:web:bb87d9d2ea845a2a95bf0b", measurementId: "G-GNP2EJ5G6Q" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null, currentRole = null, currentTeamId = null, globalCategories = [], timerInterval = null;

// --- AUTH & LISTENERS ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            currentRole = userDoc.data().role;
            currentTeamId = userDoc.data().teamId || null;
            
            const ac = document.getElementById('admin-controls'), tc = document.getElementById('team-controls');
            if (ac && currentRole !== 'admin') ac.classList.add('hidden');
            if (tc && currentRole === 'admin') tc.classList.add('hidden');

            const teamStatsBox = document.getElementById('my-team-stats');
            const personalSquadSection = document.getElementById('personal-squad-section');
            
            if (currentRole === 'team' && currentTeamId) {
                if(teamStatsBox) teamStatsBox.classList.remove('hidden');
                if(personalSquadSection) personalSquadSection.classList.remove('hidden');
                
                onSnapshot(doc(db, "teams", currentTeamId), (tDoc) => {
                    const tData = tDoc.data();
                    if(document.getElementById('my-team-name')) document.getElementById('my-team-name').innerText = tData.teamShort;
                    if(document.getElementById('my-team-purse')) document.getElementById('my-team-purse').innerText = "$" + tData.purseBalance;
                });
            }
            syncRules();
            syncSquadTracker();
        }
    }
});

// --- SQUAD TRACKER LOGIC ---
function syncSquadTracker() {
    const globalList = document.getElementById('global-sold-list');
    const mySquadList = document.getElementById('my-squad-list');

    // Listener for ALL Sold Players
    const qSold = query(collection(db, "players"), where("status", "==", "sold"));
    onSnapshot(qSold, (snap) => {
        if(globalList) globalList.innerHTML = "";
        if(mySquadList) mySquadList.innerHTML = "";

        snap.forEach(d => {
            const p = d.data();
            
            // 1. Add to Global List
            if(globalList) {
                globalList.innerHTML += `
                    <tr>
                        <td><b>${p.name}</b></td>
                        <td>${p.soldToName || 'Team'}</td>
                        <td style="color:var(--success); font-weight:700;">$${p.price}</td>
                    </tr>
                `;
            }

            // 2. Add to "My Squad" if the ID matches
            if(mySquadList && p.soldToId === currentTeamId) {
                mySquadList.innerHTML += `
                    <tr>
                        <td><b>${p.name}</b></td>
                        <td>${p.role} (${p.category})</td>
                        <td style="color:var(--accent); font-weight:700;">$${p.price}</td>
                    </tr>
                `;
            }
        });
    });
}

// --- SETUP FLOW ---
export async function loginUser() {
    const e = document.getElementById('email').value, p = document.getElementById('password').value;
    try { const res = await signInWithEmailAndPassword(auth, e, p); const uDoc = await getDoc(doc(db, "users", res.user.uid)); if(uDoc.data().role === 'admin') window.location.href="admin.html"; else window.location.href="auction.html"; } catch(err) { alert(err.message); }
}

export async function saveLeague() {
    const n = document.getElementById('league-name').value, l = document.getElementById('league-logo').value;
    await setDoc(doc(db, "settings", "leagueInfo"), { leagueName: n, leagueLogo: l });
    document.getElementById('league-inputs').classList.add('hidden'); document.getElementById('league-saved-msg').classList.remove('hidden'); document.getElementById('team-section').classList.remove('hidden');
}

export async function addTeam() {
    const n = document.getElementById('team-name').value, s = document.getElementById('team-short').value;
    await addDoc(collection(db, "teams"), { teamName: n, teamShort: s, purseBalance: 0 });
}

export async function saveRules() {
    const rules = { categories: [], purse: document.getElementById('purse-value').value };
    const bases = document.getElementsByClassName('cat-base'), incs = document.getElementsByClassName('cat-inc');
    const names = ["Category A", "Category B", "Category C"];
    for(let i=0; i<3; i++) { if(bases[i].value) rules.categories.push({ name: names[i], basePrice: bases[i].value, increment: incs[i].value }); }
    await setDoc(doc(db, "settings", "auctionRules"), rules);
    const ts = await getDocs(collection(db, "teams")); ts.forEach(async (t) => { await updateDoc(doc(db, "teams", t.id), { purseBalance: Number(rules.purse) }); });
    alert("Rules Saved!"); document.getElementById('player-section').classList.remove('hidden'); syncRules();
}

export async function addPlayer() {
    const pData = { name: document.getElementById('player-name').value, category: document.getElementById('player-category').value, basePrice: document.getElementById('player-base-price').value, role: document.getElementById('player-role').value, status: "unsold" };
    await addDoc(collection(db, "players"), pData); document.getElementById('player-name').value = "";
}

export function updateBasePrice() {
    const cat = document.getElementById('player-category').value;
    const d = globalCategories.find(c => c.name === cat); if(d) document.getElementById('player-base-price').value = d.basePrice;
}

export async function createTeamUser() {
    const tid = document.getElementById('login-team-select').value, pass = document.getElementById('team-pass-setup').value, ttxt = document.getElementById('login-team-select').options[document.getElementById('login-team-select').selectedIndex].text;
    const email = ttxt.split(" - ")[0].toLowerCase().trim() + "@auction.com";
    try { const res = await createUserWithEmailAndPassword(auth, email, pass); await setDoc(doc(db, "users", res.user.uid), { role: "team", teamId: tid, email: email }); alert("Created!"); logout(); } catch(e) { alert(e.message); }
}

export async function deleteTeam(id) { if(confirm("Delete?")) await deleteDoc(doc(db, "teams", id)); }
export async function deletePlayer(id) { if(confirm("Delete?")) await deleteDoc(doc(db, "players", id)); }
export async function resetLeague() { if(confirm("Clear?")) { await deleteDoc(doc(db, "settings", "leagueInfo")); location.reload(); } }
export async function resetRules() { if(confirm("Reset?")) { await deleteDoc(doc(db, "settings", "auctionRules")); location.reload(); } }

// --- AUCTION ENGINE ---
export async function nextPlayer() {
    const cat = document.getElementById('auction-category-select').value;
    const q = query(collection(db, "players"), where("category", "==", cat), where("status", "==", "unsold"));
    const snap = await getDocs(q); if (snap.empty) return alert("Empty!");
    const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    const p = list[Math.floor(Math.random() * list.length)];
    const endTime = Date.now() + 31000;
    await setDoc(doc(db, "settings", "activeAuction"), { playerId: p.id, name: p.name, category: p.category, basePrice: Number(p.basePrice), currentBid: Number(p.basePrice), highestBidder: "No Bids", highestBidderId: null, highestBidderTeamId: null, status: "active", role: p.role, timerEnd: endTime });
}

export async function bid() {
    const ref = doc(db, "settings", "activeAuction"); const snap = await getDoc(ref); const data = snap.data();
    const teamSnap = await getDoc(doc(db, "teams", currentTeamId)); const teamData = teamSnap.data();
    const catRule = globalCategories.find(c => c.name === data.category);
    const bidAmount = data.highestBidderId ? data.currentBid + Number(catRule.increment) : data.basePrice;
    if(teamData.purseBalance < bidAmount) return alert("No Money!");
    await updateDoc(ref, { currentBid: bidAmount, highestBidder: teamData.teamShort, highestBidderId: currentUser.uid, highestBidderTeamId: currentTeamId, timerEnd: 0 });
}

export async function sellPlayer() {
    const snap = await getDoc(doc(db, "settings", "activeAuction")); const data = snap.data(); if(!data.highestBidderTeamId) return alert("No bids!");
    await updateDoc(doc(db, "players", data.playerId), { status: "sold", soldToId: data.highestBidderTeamId, soldToName: data.highestBidder, price: data.currentBid, role: data.role, category: data.category });
    await updateDoc(doc(db, "teams", data.highestBidderTeamId), { purseBalance: increment(-data.currentBid) });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "sold", timerEnd: 0 });
}

export async function unsoldPlayer() {
    const snap = await getDoc(doc(db, "settings", "activeAuction")); const data = snap.data();
    await updateDoc(doc(db, "players", data.playerId), { status: "unsold_box" });
    await updateDoc(doc(db, "settings", "activeAuction"), { status: "unsold", timerEnd: 0 });
}

// --- SYNC HELPERS ---
async function syncRules() {
    const snap = await getDoc(doc(db, "settings", "auctionRules"));
    if (snap.exists()) {
        globalCategories = snap.data().categories;
        const selA = document.getElementById('auction-category-select'), selB = document.getElementById('player-category');
        if(selA) { selA.innerHTML = '<option value="">Category</option>'; globalCategories.forEach(c => selA.innerHTML += `<option value="${c.name}">${c.name}</option>`); }
        if(selB) { selB.innerHTML = '<option value="">Category</option>'; globalCategories.forEach(c => selB.innerHTML += `<option value="${c.name}">${c.name}</option>`); }
    }
}

if (document.getElementById('teams-display')) {
    onSnapshot(collection(db, "teams"), (snap) => {
        const d = document.getElementById('teams-display'), l = document.getElementById('login-team-select');
        if(d) d.innerHTML = ""; if(l) l.innerHTML = '<option value="">Select Team</option>';
        snap.forEach(doc => { const t = doc.data(); if(d) d.innerHTML += `<div class="team-pill"><strong>${t.teamShort}</strong><br><small>$${t.purseBalance}</small><br><button class="btn-delete" onclick="handleDeleteTeam('${doc.id}')">Delete</button></div>`; if(l) l.innerHTML += `<option value="${doc.id}">${t.teamShort} - ${t.teamName}</option>`; });
    });
}

if (document.getElementById('players-display')) {
    onSnapshot(collection(db, "players"), (snap) => {
        const d = document.getElementById('players-display'); if(d) d.innerHTML = "";
        snap.forEach(doc => { const p = doc.data(); if(p.status === 'unsold') d.innerHTML += `<div class="team-pill" style="text-align:left;"><strong>${p.name}</strong><br><small>${p.category}</small><br><button class="btn-delete" onclick="handleDeletePlayer('${doc.id}')">Remove</button></div>`; });
    });
}

if (document.getElementById('display-p-name')) {
    onSnapshot(doc(db, "settings", "activeAuction"), (d) => {
        const data = d.data(); if(!data) return;
        document.getElementById('display-p-name').innerText = data.name; document.getElementById('display-p-base').innerText = "$" + data.basePrice; document.getElementById('display-p-current-bid').innerText = "$" + data.currentBid; document.getElementById('display-p-bidder').innerText = data.highestBidder; document.getElementById('display-p-cat').innerText = data.category; document.getElementById('display-p-role').innerText = data.role;
        const b = document.getElementById('player-status-badge'); b.innerText = data.status.toUpperCase(); b.style.background = data.status === 'sold' ? 'var(--success)' : (data.status === 'unsold' ? 'var(--danger)' : 'var(--accent)');
        const tDisp = document.getElementById('timer-display');
        if (data.timerEnd && data.timerEnd > 0 && data.status === 'active') {
             if(timerInterval) clearInterval(timerInterval);
             timerInterval = setInterval(() => { const dist = data.timerEnd - Date.now(); if(dist <= 0) { tDisp.innerText = "0s"; clearInterval(timerInterval); if(currentRole === 'admin' && data.highestBidderId === null) unsoldPlayer(); } else tDisp.innerText = Math.floor(dist/1000) + "s"; }, 1000);
        } else { if(timerInterval) clearInterval(timerInterval); tDisp.innerText = data.status === 'active' ? "BIDDING" : "PAUSED"; }
    });
}

export function logout() { signOut(auth).then(() => window.location.href = "index.html"); }
