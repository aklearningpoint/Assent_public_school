// Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "AIzaSyAq9vIJtCIqVl52Pak59DpAgaBhTumtOaI",
  authDomain: "assent-public-school.firebaseapp.com",
  projectId: "assent-public-school",
  storageBucket: "assent-public-school.appspot.com",
  messagingSenderId: "747815981128",
  appId: "1:747815981128:web:6e0d9ad492a952e624c87d"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Offline Persistence Enable (Rural low-connectivity protection)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support persistence');
  }
});

// Network Status
const netStatus = document.getElementById('netStatus');
window.addEventListener('online', () => {
  netStatus.innerText = "🟢 Online";
  netStatus.style.background = "#166534";
});
window.addEventListener('offline', () => {
  netStatus.innerText = "🟡 Offline Mode";
  netStatus.style.background = "#854d0e";
});

/* ================= 1. DUAL PORTAL SWITCHING ================= */
window.switchPortal = function(portal) {
  document.querySelectorAll('.portal-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.portal-view').forEach(v => v.classList.remove('active'));

  if (portal === 'student') {
    document.getElementById('tabStudentBtn').classList.add('active');
    document.getElementById('studentPortalView').classList.add('active');
  } else {
    document.getElementById('tabTeacherBtn').classList.add('active');
    document.getElementById('teacherPortalView').classList.add('active');
    setupTeacherMarksView();
  }
};

window.switchTeacherSection = function(secId, btn) {
  document.querySelectorAll('.sub-pill').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.teacher-section').forEach(s => s.classList.remove('active'));
  document.getElementById(secId).classList.add('active');
  btn.classList.add('active');

  if (secId === 'secAttendance') loadAttendanceSheet();
};

/* ================= 2. SYLLABUS MATRIX LOGIC ================= */
function getSubjects(cls, term) {
  let sub = [];
  if (['Play', 'Nursery', 'LKG'].includes(cls)) {
    sub = ['Hindi', 'English', 'Mathematics'];
  } else if (cls === 'UKG') {
    sub = ['Hindi', 'English', 'Mathematics', 'EVS'];
  } else {
    sub = ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'G.K.'];
  }
  // Term 1 me Drawing auto-hide rehti hai, Term 2 aur Term 3 me enable hoti hai
  if (term !== 'Term 1') {
    sub.push('Drawing');
  }
  return sub;
}

/* ================= 3. STUDENT PORTAL (LOOKUP & SCORECARD) ================= */
window.lookupStudent = async function() {
  const cls = document.getElementById('lookupClass').value;
  const roll = parseInt(document.getElementById('lookupRoll').value);
  const card = document.getElementById('studentProfileCard');

  if (!roll || isNaN(roll)) {
    alert("Kripya Roll Number darj karein.");
    return;
  }

  card.style.display = 'block';
  card.innerHTML = '<p class="muted-text">Data fetch ho raha hai...</p>';

  try {
    const sSnap = await db.collection("students")
      .where("class", "==", cls)
      .where("roll_no", "==", roll)
      .limit(1)
      .get();

    if (sSnap.empty) {
      card.innerHTML = `<p style="color:red; font-weight:bold;">Roll No: ${roll} (${cls}) ka koi record nahi mila.</p>`;
      return;
    }

    const sDoc = sSnap.docs[0];
    const sData = sDoc.data();

    // Fetch marks across terms
    const mSnap = await db.collection("marks").where("student_id", "==", sDoc.id).get();
    let termScores = {};
    mSnap.forEach(d => {
      termScores[d.data().term] = d.data().scores || {};
    });

    let html = `
      <div style="border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin-bottom: 14px;">
        <h2 style="margin:0;">${sData.name}</h2>
        <p style="color:var(--text-muted); margin:4px 0 0 0;">Class: <b>${sData.class}</b> | Roll No: <b>${sData.roll_no}</b> | Fee Status: <b style="color:${sData.fee_status === 'Paid' ? 'green' : 'red'};">${sData.fee_status || 'Unpaid'}</b></p>
      </div>
      <h3>Examination Performance:</h3>
    `;

    ['Term 1', 'Term 2', 'Term 3'].forEach(term => {
      const scores = termScores[term];
      const subs = getSubjects(cls, term);
      html += `<div style="margin-bottom:14px; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid var(--border);">
        <h4 style="color:var(--primary); margin-bottom:6px;">${term} ${term === 'Term 1' ? '(Half Yearly)' : term === 'Term 3' ? '(Annual)' : ''}</h4>`;

      if (!scores) {
        html += `<p style="font-size:0.85rem; color:var(--text-muted);">Is term ke marks abhi update nahi huye hain.</p></div>`;
        return;
      }

      let total = 0;
      html += `<table style="font-size:0.82rem; margin-top:6px;"><thead><tr><th>Subject</th><th>Marks</th><th>Max</th></tr></thead><tbody>`;
      subs.forEach(sub => {
        const val = scores[sub] !== undefined ? scores[sub] : '-';
        if (typeof val === 'number') total += val;
        html += `<tr><td>${sub}</td><td><b>${val}</b></td><td>100</td></tr>`;
      });
      const pct = subs.length > 0 ? ((total / (subs.length * 100)) * 100).toFixed(1) : 0;
      html += `<tr><td><b>Total</b></td><td colspan="2"><b>${total} / ${subs.length * 100} (${pct}%)</b></td></tr>`;
      html += `</tbody></table></div>`;
    });

    html += `<div class="btn-right"><button class="btn btn-primary" onclick="window.print()">🖨 Print Scorecard</button></div>`;
    card.innerHTML = html;
  } catch (err) {
    card.innerHTML = `<p style="color:red;">Error fetching record: ${err.message}</p>`;
  }
};

/* ================= 4. TEACHER PORTAL (DUAL MARKS & ATTENDANCE) ================= */
let teacherMode = 'student';
window.setMarksMode = function(mode) {
  teacherMode = mode;
  document.getElementById('btnModeStudent').classList.toggle('active', mode === 'student');
  document.getElementById('btnModeSubject').classList.toggle('active', mode === 'subject');
  document.getElementById('teacherStudentWiseCard').style.display = mode === 'student' ? 'block' : 'none';
  document.getElementById('teacherSubjectWiseCard').style.display = mode === 'subject' ? 'block' : 'none';
  setupTeacherMarksView();
};

let cachedClassStudents = [];

async function setupTeacherMarksView() {
  const cls = document.getElementById('teacherClassSelect').value;
  const term = document.getElementById('teacherTermSelect').value;
  const subjects = getSubjects(cls, term);

  const snap = await db.collection("students").where("class", "==", cls).get();
  cachedClassStudents = [];
  snap.forEach(d => cachedClassStudents.push({ id: d.id, ...d.data() }));
  cachedClassStudents.sort((a, b) => a.roll_no - b.roll_no);

  if (teacherMode === 'student') {
    const sSelect = document.getElementById('teacherStudentSelect');
    if (cachedClassStudents.length === 0) {
      sSelect.innerHTML = '<option value="">Class me koi student nahi hai</option>';
      document.getElementById('teacherMarksGrid').innerHTML = '<p class="empty-state">No students found.</p>';
      return;
    }
    sSelect.innerHTML = cachedClassStudents.map(s => `<option value="${s.id}">Roll ${s.roll_no}: ${s.name}</option>`).join('');
    loadSingleStudentFields(sSelect.value, subjects, term);
    sSelect.onchange = () => loadSingleStudentFields(sSelect.value, subjects, term);
  } else {
    const subSelect = document.getElementById('teacherSubjectSelect');
    subSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    loadBulkSubjectSheet(subSelect.value, cls, term);
    subSelect.onchange = () => loadBulkSubjectSheet(subSelect.value, cls, term);
  }
}

async function loadSingleStudentFields(studentId, subjects, term) {
  const grid = document.getElementById('teacherMarksGrid');
  if (!studentId) return;

  const doc = await db.collection("marks").doc(`${studentId}_${term}`).get();
  const existing = doc.exists ? (doc.data().scores || {}) : {};

  grid.innerHTML = subjects.map(sub => `
    <div class="mark-box">
      <label>${sub}</label>
      <input type="number" min="0" max="100" class="t-mark-input" data-subject="${sub}" value="${existing[sub] !== undefined ? existing[sub] : ''}" placeholder="Max 100">
    </div>
  `).join('');
}

// Mode A: Save & Next
document.getElementById('btnTeacherSaveNext').addEventListener('click', async () => {
  const sSelect = document.getElementById('teacherStudentSelect');
  const studentId = sSelect.value;
  const cls = document.getElementById('teacherClassSelect').value;
  const term = document.getElementById('teacherTermSelect').value;

  if (!studentId) return;

  const inputs = document.querySelectorAll('.t-mark-input');
  let scores = {};
  let total = 0;
  inputs.forEach(inp => {
    const v = parseFloat(inp.value) || 0;
    scores[inp.dataset.subject] = v;
    total += v;
  });

  await db.collection("marks").doc(`${studentId}_${term}`).set({
    student_id: studentId,
    class: cls,
    term: term,
    scores: scores,
    total_obtained: total,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const curIdx = sSelect.selectedIndex;
  if (curIdx < sSelect.options.length - 1) {
    sSelect.selectedIndex = curIdx + 1;
    sSelect.dispatchEvent(new Event('change'));
  } else {
    alert("Is class ke sabhi students ke marks complete ho gaye!");
  }
});

// Mode B: Bulk Save
async function loadBulkSubjectSheet(subject, cls, term) {
  const tbody = document.getElementById('teacherBulkTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Loading sheet...</td></tr>';

  tbody.innerHTML = '';
  for (let s of cachedClassStudents) {
    const doc = await db.collection("marks").doc(`${s.id}_${term}`).get();
    const val = doc.exists && doc.data().scores && doc.data().scores[subject] !== undefined ? doc.data().scores[subject] : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-roll">${s.roll_no}</span></td>
      <td><b>${s.name}</b></td>
      <td><input type="number" min="0" max="100" class="t-bulk-input" data-id="${s.id}" value="${val}"></td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('btnTeacherSaveBulk').addEventListener('click', async () => {
  const sub = document.getElementById('teacherSubjectSelect').value;
  const term = document.getElementById('teacherTermSelect').value;
  const cls = document.getElementById('teacherClassSelect').value;
  const inputs = document.querySelectorAll('.t-bulk-input');

  const batch = db.batch();
  inputs.forEach(inp => {
    const sid = inp.dataset.id;
    const v = parseFloat(inp.value) || 0;
    const ref = db.collection("marks").doc(`${sid}_${term}`);
    batch.set(ref, {
      student_id: sid,
      class: cls,
      term: term,
      scores: { [sub]: v },
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  await batch.commit();
  alert(`${sub} ke sabhi marks save ho gaye!`);
});

document.getElementById('teacherClassSelect').addEventListener('change', setupTeacherMarksView);
document.getElementById('teacherTermSelect').addEventListener('change', setupTeacherMarksView);

// Attendance Module
async function loadAttendanceSheet() {
  const cls = document.getElementById('attClassSelect').value;
  const dateInp = document.getElementById('attDateSelect');
  if (!dateInp.value) dateInp.value = new Date().toISOString().split('T')[0];
  const date = dateInp.value;

  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Loading roster...</td></tr>';

  const [sSnap, aDoc] = await Promise.all([
    db.collection("students").where("class", "==", cls).get(),
    db.collection("attendance").doc(`${cls}_${date}`).get()
  ]);

  const existingAtt = aDoc.exists ? aDoc.data().records || {} : {};
  let list = [];
  sSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => a.roll_no - b.roll_no);

  tbody.innerHTML = '';
  list.forEach(s => {
    const status = existingAtt[s.id] || 'P';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-roll">${s.roll_no}</span></td>
      <td><b>${s.name}</b></td>
      <td>
        <select onchange="saveAttendanceRecord('${cls}', '${date}', '${s.id}', this.value)" style="width: auto;">
          <option value="P" ${status === 'P' ? 'selected' : ''}>Present</option>
          <option value="A" ${status === 'A' ? 'selected' : ''}>Absent</option>
          <option value="L" ${status === 'L' ? 'selected' : ''}>Leave</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.saveAttendanceRecord = async function(cls, date, studentId, status) {
  await db.collection("attendance").doc(`${cls}_${date}`).set({
    class: cls,
    date: date,
    records: { [studentId]: status }
  }, { merge: true });
};

document.getElementById('attClassSelect').addEventListener('change', loadAttendanceSheet);
document.getElementById('attDateSelect').addEventListener('change', loadAttendanceSheet);

/* ================= 5. ADMIN DRAWER (⚙️ SETTINGS PANEL) ================= */
const adminDrawer = document.getElementById('adminDrawerModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

openSettingsBtn.addEventListener('click', () => {
  adminDrawer.classList.add('open');
});

closeSettingsBtn.addEventListener('click', () => {
  adminDrawer.classList.remove('open');
});

window.verifyAdminPin = function() {
  const pin = document.getElementById('adminPinInput').value;
  if (pin === "1234") {
    document.getElementById('adminAuthLock').style.display = 'none';
    document.getElementById('adminControlPanel').style.display = 'block';
    loadAdminStudentRoster();
    loadAdminFeeLedger();
  } else {
    alert("Galat PIN! Default PIN: 1234");
  }
};

// Admin Student Add (Auto-Roll)
document.getElementById('adminAddStudentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cls = document.getElementById('adminNewClass').value;
  const name = document.getElementById('adminNewName').value.trim().toUpperCase();
  if (!name) return;

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
    monthly_fee: 450,
    fee_status: "Unpaid",
    created_at: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById('adminNewName').value = '';
  alert(`Student Enrolled! Roll No: ${maxRoll + 1}`);
  loadAdminStudentRoster();
  loadAdminFeeLedger();
});

// Admin Manage Roster & Auto-Shift Delete
async function loadAdminStudentRoster() {
  const cls = document.getElementById('adminManageClassSelect').value;
  const tbody = document.getElementById('adminStudentList');
  tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

  const snap = await db.collection("students").where("class", "==", cls).get();
  let list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => a.roll_no - b.roll_no);

  tbody.innerHTML = '';
  list.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${s.roll_no}</b></td>
      <td>${s.name}</td>
      <td><button class="btn btn-danger" style="padding:2px 6px; font-size:0.75rem;" onclick="adminDeleteStudent('${s.id}', '${s.class}', ${s.roll_no}, '${s.name}')">🗑 Del</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.adminDeleteStudent = async function(docId, cls, deletedRoll, name) {
  if (!confirm(`${name} (Roll: ${deletedRoll}) ko delete karein?\nNeeche ke sabhi roll numbers automatic 1 number shift ho jayenge.`)) return;

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
  loadAdminStudentRoster();
  loadAdminFeeLedger();
};

document.getElementById('adminManageClassSelect').addEventListener('change', loadAdminStudentRoster);

// Admin Fee Ledger
async function loadAdminFeeLedger() {
  const cls = document.getElementById('adminManageClassSelect').value;
  const tbody = document.getElementById('adminFeeList');
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

  const snap = await db.collection("students").where("class", "==", cls).get();
  let list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => a.roll_no - b.roll_no);

  tbody.innerHTML = '';
  list.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.roll_no}</td>
      <td>${s.name}</td>
      <td>₹${s.monthly_fee || 450}</td>
      <td><button class="btn" style="padding:2px 6px; font-size:0.75rem; background:${s.fee_status === 'Paid' ? '#dcfce7' : '#fee2e2'}; color:${s.fee_status === 'Paid' ? 'green' : 'red'};" onclick="toggleFeeStatus('${s.id}', '${s.fee_status || 'Unpaid'}')">${s.fee_status || 'Unpaid'}</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.toggleFeeStatus = async function(docId, current) {
  const next = current === 'Paid' ? 'Unpaid' : 'Paid';
  await db.collection("students").doc(docId).update({ fee_status: next });
  loadAdminFeeLedger();
};
