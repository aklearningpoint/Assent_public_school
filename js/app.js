// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAq9vIJtCIqVl52Pak59DpAgaBhTumtOaI",
  authDomain: "assent-public-school.firebaseapp.com",
  projectId: "assent-public-school",
  storageBucket: "assent-public-school.appspot.com",
  messagingSenderId: "747815981128",
  appId: "1:747815981128:web:6e0d9ad492a952e624c87d"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Network Status Indicator
const globalStatus = document.getElementById('globalStatus');
window.addEventListener('online', () => {
  globalStatus.innerText = "🟢 Online";
  globalStatus.style.background = "#166534";
});
window.addEventListener('offline', () => {
  globalStatus.innerText = "🟡 Offline Mode";
  globalStatus.style.background = "#854d0e";
});

// Tab Switcher
window.switchTab = function(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');

  if (tabId === 'tabMarks') setupMarksModule();
  if (tabId === 'tabScorecard') loadScorecards();
  if (tabId === 'tabFees') loadFeeLedger();
};

/* ================= 1. STUDENT DIRECTORY ================= */
const addForm = document.getElementById('addStudentForm');
const filterStudentClass = document.getElementById('filterStudentClass');
const studentTableBody = document.getElementById('studentTableBody');

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cls = document.getElementById('studentClass').value;
  const name = document.getElementById('studentName').value.trim().toUpperCase();
  if (!name) return;

  globalStatus.innerText = "⏳ Saving...";

  try {
    const snap = await db.collection("students").where("class", "==", cls).get();
    let maxRoll = 0;
    snap.forEach(d => {
      const r = d.data().roll_no || 0;
      if (r > maxRoll) maxRoll = r;
    });

    await db.collection("students").add({
      name: name,
      class: cls,
      roll_no: maxRoll + 1,
      profile_completed: false,
      monthly_fee: 450,
      fee_status: "Unpaid",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('studentName').value = '';
    globalStatus.innerText = "🟢 Saved";
    if (filterStudentClass.value !== cls) {
      filterStudentClass.value = cls;
      loadStudents(cls);
    }
  } catch (err) {
    alert("Error: " + err.message);
    globalStatus.innerText = "❌ Error";
  }
});

let unsubStudents = null;
function loadStudents(cls) {
  if (unsubStudents) unsubStudents();
  studentTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading students...</td></tr>';

  unsubStudents = db.collection("students").where("class", "==", cls).onSnapshot(snap => {
    studentTableBody.innerHTML = '';
    if (snap.empty) {
      studentTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Is class me abhi koi student enrolled nahi hai.</td></tr>';
      return;
    }

    let list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => a.roll_no - b.roll_no);

    list.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="badge-roll">${s.roll_no}</span></td>
        <td><b>${s.name}</b></td>
        <td><span style="font-size:0.8rem; color: ${s.profile_completed ? 'green' : '#ea580c'}">${s.profile_completed ? '● Completed' : '○ Self-Fill Pending'}</span></td>
        <td style="text-align:center;"><button class="btn btn-danger" onclick="deleteStudent('${s.id}', '${s.class}', ${s.roll_no}, '${s.name}')">🗑 Delete</button></td>
      `;
      studentTableBody.appendChild(tr);
    });
    globalStatus.innerText = "🟢 Live Connected";
  });
}

window.deleteStudent = async function(docId, cls, deletedRoll, name) {
  if (!confirm(`${name} (Roll: ${deletedRoll}) ko delete karein?\nNeeche ke roll numbers automatic upar shift ho jayenge.`)) return;

  const batch = db.batch();
  batch.delete(db.collection("students").doc(docId));

  const snap = await db.collection("students").where("class", "==", cls).get();
  snap.forEach(d => {
    const r = d.data().roll_no;
    if (r > deletedRoll) {
      batch.update(d.ref, { roll_no: r - 1 });
    }
  });

  await batch.commit();
};

filterStudentClass.addEventListener('change', e => loadStudents(e.target.value));
loadStudents(filterStudentClass.value);

/* ================= 2. DUAL MARKS ENGINE ================= */
let activeMarksMode = 'student';
window.setMarksMode = function(mode) {
  activeMarksMode = mode;
  document.getElementById('btnModeStudent').classList.toggle('active', mode === 'student');
  document.getElementById('btnModeSubject').classList.toggle('active', mode === 'subject');
  document.getElementById('studentWiseContainer').style.display = mode === 'student' ? 'block' : 'none';
  document.getElementById('subjectWiseContainer').style.display = mode === 'subject' ? 'block' : 'none';
  setupMarksModule();
};

function getSubjectsForClass(cls, term) {
  let sub = [];
  if (['Play', 'Nursery', 'LKG'].includes(cls)) {
    sub = ['Hindi', 'English', 'Mathematics'];
  } else if (cls === 'UKG') {
    sub = ['Hindi', 'English', 'Mathematics', 'EVS'];
  } else {
    sub = ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'G.K.'];
  }
  if (term !== 'Term 1') sub.push('Drawing');
  return sub;
}

let classStudents = [];
async function setupMarksModule() {
  const cls = document.getElementById('marksClassSelect').value;
  const term = document.getElementById('marksTermSelect').value;
  const subjects = getSubjectsForClass(cls, term);

  const snap = await db.collection("students").where("class", "==", cls).get();
  classStudents = [];
  snap.forEach(d => classStudents.push({ id: d.id, ...d.data() }));
  classStudents.sort((a, b) => a.roll_no - b.roll_no);

  if (activeMarksMode === 'student') {
    const select = document.getElementById('marksStudentSelect');
    if (classStudents.length === 0) {
      select.innerHTML = '<option value="">No students enrolled</option>';
      document.getElementById('studentMarksFields').innerHTML = '<p class="empty-state">No students found.</p>';
      return;
    }
    select.innerHTML = classStudents.map(s => `<option value="${s.id}">Roll ${s.roll_no}: ${s.name}</option>`).join('');
    loadStudentMarksFields(select.value, subjects, term);
    select.onchange = () => loadStudentMarksFields(select.value, subjects, term);
  } else {
    const subSelect = document.getElementById('bulkSubjectSelect');
    subSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    loadBulkSubjectSheet(subSelect.value, cls, term);
    subSelect.onchange = () => loadBulkSubjectSheet(subSelect.value, cls, term);
  }
}

async function loadStudentMarksFields(studentId, subjects, term) {
  const container = document.getElementById('studentMarksFields');
  if (!studentId) return;

  const doc = await db.collection("marks").doc(`${studentId}_${term}`).get();
  const existing = doc.exists ? (doc.data().scores || {}) : {};

  container.innerHTML = subjects.map(sub => `
    <div class="mark-card">
      <label>${sub}</label>
      <input type="number" min="0" max="100" class="sub-mark-input" data-subject="${sub}" value="${existing[sub] !== undefined ? existing[sub] : ''}" placeholder="Max 100">
    </div>
  `).join('');
}

document.getElementById('btnSaveStudentMarks').addEventListener('click', async () => {
  const studentSelect = document.getElementById('marksStudentSelect');
  const studentId = studentSelect.value;
  const term = document.getElementById('marksTermSelect').value;
  const cls = document.getElementById('marksClassSelect').value;

  if (!studentId) return;

  const inputs = document.querySelectorAll('.sub-mark-input');
  let scores = {};
  let total = 0;
  inputs.forEach(i => {
    const val = parseFloat(i.value) || 0;
    scores[i.dataset.subject] = val;
    total += val;
  });

  await db.collection("marks").doc(`${studentId}_${term}`).set({
    student_id: studentId,
    class: cls,
    term: term,
    scores: scores,
    total_obtained: total,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const currentIndex = studentSelect.selectedIndex;
  if (currentIndex < studentSelect.options.length - 1) {
    studentSelect.selectedIndex = currentIndex + 1;
    studentSelect.dispatchEvent(new Event('change'));
  } else {
    alert("Is class ke sabhi students ke marks complete ho gaye!");
  }
});

async function loadBulkSubjectSheet(subject, cls, term) {
  const tbody = document.getElementById('bulkMarksTableBody');
  tbody.innerHTML = '';

  for (let s of classStudents) {
    const doc = await db.collection("marks").doc(`${s.id}_${term}`).get();
    const mark = doc.exists && doc.data().scores && doc.data().scores[subject] !== undefined ? doc.data().scores[subject] : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-roll">${s.roll_no}</span></td>
      <td><b>${s.name}</b></td>
      <td><input type="number" min="0" max="100" class="bulk-input" data-id="${s.id}" value="${mark}" style="width: 100px;"></td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('btnSaveBulkMarks').addEventListener('click', async () => {
  const sub = document.getElementById('bulkSubjectSelect').value;
  const term = document.getElementById('marksTermSelect').value;
  const cls = document.getElementById('marksClassSelect').value;
  const inputs = document.querySelectorAll('.bulk-input');

  const batch = db.batch();
  inputs.forEach(input => {
    const sid = input.dataset.id;
    const val = parseFloat(input.value) || 0;
    const ref = db.collection("marks").doc(`${sid}_${term}`);
    batch.set(ref, {
      student_id: sid,
      class: cls,
      term: term,
      scores: { [sub]: val },
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  await batch.commit();
  alert(`${sub} ke marks save ho gaye!`);
});

document.getElementById('marksClassSelect').addEventListener('change', setupMarksModule);
document.getElementById('marksTermSelect').addEventListener('change', setupMarksModule);

/* ================= 3. SCORECARD & CLASS RANK MATRIX ================= */
async function loadScorecards() {
  const cls = document.getElementById('scoreClassSelect').value;
  const term = document.getElementById('scoreTermSelect').value;
  const tbody = document.getElementById('scoreTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Computing merit list & ranks...</td></tr>';

  const [snapS, snapM] = await Promise.all([
    db.collection("students").where("class", "==", cls).get(),
    db.collection("marks").where("class", "==", cls).where("term", "==", term).get()
  ]);

  let markMap = {};
  snapM.forEach(d => markMap[d.data().student_id] = d.data().scores || {});

  let results = [];
  const subjects = getSubjectsForClass(cls, term);
  const maxPossible = subjects.length * 100;

  snapS.forEach(d => {
    const s = d.data();
    const scores = markMap[d.id] || {};
    let total = 0;
    subjects.forEach(sub => total += (scores[sub] || 0));
    const pct = maxPossible > 0 ? ((total / maxPossible) * 100).toFixed(1) : 0;

    let grade = 'E';
    if (pct >= 85) grade = 'A+';
    else if (pct >= 70) grade = 'A';
    else if (pct >= 55) grade = 'B';
    else if (pct >= 40) grade = 'C';
    else grade = 'D';

    results.push({ id: d.id, roll_no: s.roll_no, name: s.name, total, pct, grade });
  });

  // Sort by Total Marks for Rank
  results.sort((a, b) => b.total - a.total);
  results.forEach((r, idx) => r.rank = idx + 1);
  results.sort((a, b) => a.roll_no - b.roll_no);

  tbody.innerHTML = '';
  if (results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No records found.</td></tr>';
    return;
  }

  results.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-rank">#${r.rank}</span></td>
      <td><span class="badge-roll">${r.roll_no}</span></td>
      <td><b>${r.name}</b></td>
      <td>${r.total} / ${maxPossible}</td>
      <td><b>${r.pct}%</b></td>
      <td><b>${r.grade}</b></td>
      <td style="text-align:center;"><button class="btn btn-primary" onclick="window.print()">🖨 Print</button></td>
    `;
    studentTableBody && tbody.appendChild(tr);
  });
}

document.getElementById('scoreClassSelect').addEventListener('change', loadScorecards);
document.getElementById('scoreTermSelect').addEventListener('change', loadScorecards);

/* ================= 4. FEE & LEDGER TRACKER ================= */
async function loadFeeLedger() {
  const cls = document.getElementById('feeClassSelect').value;
  const tbody = document.getElementById('feeTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Loading ledger...</td></tr>';

  const snap = await db.collection("students").where("class", "==", cls).get();
  tbody.innerHTML = '';

  let list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => a.roll_no - b.roll_no);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No students found.</td></tr>';
    return;
  }

  list.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-roll">${s.roll_no}</span></td>
      <td><b>${s.name}</b></td>
      <td>₹${s.monthly_fee || 450}</td>
      <td><b style="color: ${s.fee_status === 'Paid' ? 'green' : 'red'}">${s.fee_status || 'Unpaid'}</b></td>
      <td style="text-align:center;">
        <button class="btn btn-primary" onclick="toggleFeeStatus('${s.id}', '${s.fee_status || 'Unpaid'}')">Toggle</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.toggleFeeStatus = async function(id, current) {
  const next = current === 'Paid' ? 'Unpaid' : 'Paid';
  await db.collection("students").doc(id).update({ fee_status: next });
  loadFeeLedger();
};

document.getElementById('feeClassSelect').addEventListener('change', loadFeeLedger);
