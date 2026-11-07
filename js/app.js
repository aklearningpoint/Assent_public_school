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

// Offline Persistence (Rural low-connectivity reliability)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
});

// Network Connection Monitor
const netStatus = document.getElementById('netStatus');
window.addEventListener('online', () => {
  netStatus.innerText = "🟢 Online";
  netStatus.style.background = "#166534";
});
window.addEventListener('offline', () => {
  netStatus.innerText = "🟡 Offline Mode";
  netStatus.style.background = "#854d0e";
});

/* ================= 1. VIEW ROUTING & HOME NAVIGATION ================= */
window.navigateHome = function() {
  document.getElementById('portalHomeScreen').style.display = 'grid';
  document.getElementById('studentPortalView').style.display = 'none';
  document.getElementById('teacherPortalView').style.display = 'none';
};

window.openStudentPortal = function() {
  document.getElementById('portalHomeScreen').style.display = 'none';
  document.getElementById('studentPortalView').style.display = 'block';
  document.getElementById('teacherPortalView').style.display = 'none';
};

/* ================= 2. TEACHER AUTHENTICATION (PASSWORD: pass) ================= */
const teacherAuthModal = document.getElementById('teacherAuthModal');
const teacherPassInput = document.getElementById('teacherPassInput');

window.promptTeacherLogin = function() {
  teacherPassInput.value = '';
  teacherAuthModal.classList.add('open');
  setTimeout(() => teacherPassInput.focus(), 100);
};

window.closeTeacherModal = function() {
  teacherAuthModal.classList.remove('open');
};

window.verifyTeacherPassword = function() {
  const entered = teacherPassInput.value.trim();
  if (entered === "pass") {
    closeTeacherModal();
    document.getElementById('portalHomeScreen').style.display = 'none';
    document.getElementById('studentPortalView').style.display = 'none';
    document.getElementById('teacherPortalView').style.display = 'block';
    setupTeacherMarksWorkspace();
  } else {
    alert("Invalid credentials. Please enter the correct faculty password.");
    teacherPassInput.value = '';
    teacherPassInput.focus();
  }
};

teacherPassInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifyTeacherPassword();
});

/* ================= 3. TEACHER WORKSPACE & DUAL MARKS ENGINE ================= */
window.switchTeacherSection = function(secId, btn) {
  document.querySelectorAll('.sub-pill').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.teacher-tab-section').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });

  const target = document.getElementById(secId);
  target.style.display = 'block';
  target.classList.add('active');
  btn.classList.add('active');

  if (secId === 'secAttendance') loadAttendanceWorkspace();
};

let activeTeacherMode = 'student';
window.setTeacherMarksMode = function(mode) {
  activeTeacherMode = mode;
  document.getElementById('btnModeStudent').classList.toggle('active', mode === 'student');
  document.getElementById('btnModeSubject').classList.toggle('active', mode === 'subject');
  document.getElementById('teacherStudentWiseCard').style.display = mode === 'student' ? 'block' : 'none';
  document.getElementById('teacherSubjectWiseCard').style.display = mode === 'subject' ? 'block' : 'none';
  setupTeacherMarksWorkspace();
};

function getSubjectMatrix(cls, term) {
  let list = [];
  if (['Play', 'Nursery', 'LKG'].includes(cls)) {
    list = ['Hindi', 'English', 'Mathematics'];
  } else if (cls === 'UKG') {
    list = ['Hindi', 'English', 'Mathematics', 'EVS'];
  } else {
    list = ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'G.K.'];
  }
  // Term 1 auto-hides Drawing; Term 2 & 3 include Drawing
  if (term !== 'Term 1') {
    list.push('Drawing');
  }
  return list;
}

let cachedFacultyStudents = [];

async function setupTeacherMarksWorkspace() {
  const cls = document.getElementById('teacherClassSelect').value;
  const term = document.getElementById('teacherTermSelect').value;
  const subjects = getSubjectMatrix(cls, term);

  const snap = await db.collection("students").where("class", "==", cls).get();
  cachedFacultyStudents = [];
  snap.forEach(d => cachedFacultyStudents.push({ id: d.id, ...d.data() }));
  cachedFacultyStudents.sort((a, b) => a.roll_no - b.roll_no);

  if (activeTeacherMode === 'student') {
    const sSelect = document.getElementById('teacherStudentSelect');
    if (cachedFacultyStudents.length === 0) {
      sSelect.innerHTML = '<option value="">No enrolled students found</option>';
      document.getElementById('teacherMarksGrid').innerHTML = '<p class="empty-state">No students found for this class.</p>';
      return;
    }
    sSelect.innerHTML = cachedFacultyStudents.map(s => `<option value="${s.id}">Roll ${s.roll_no}: ${s.name}</option>`).join('');
    loadStudentMarksInputs(sSelect.value, subjects, term);
    sSelect.onchange = () => loadStudentMarksInputs(sSelect.value, subjects, term);
  } else {
    const subSelect = document.getElementById('teacherSubjectSelect');
    subSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    loadBulkSubjectSheet(subSelect.value, cls, term);
    subSelect.onchange = () => loadBulkSubjectSheet(subSelect.value, cls, term);
  }
}

async function loadStudentMarksInputs(studentId, subjects, term) {
  const grid = document.getElementById('teacherMarksGrid');
  if (!studentId) return;

  const doc = await db.collection("marks").doc(`${studentId}_${term}`).get();
  const existing = doc.exists ? (doc.data().scores || {}) : {};

  grid.innerHTML = subjects.map(sub => `
    <div class="mark-box">
      <label>${sub}</label>
      <input type="number" min="0" max="100" class="sub-score-input" data-subject="${sub}" value="${existing[sub] !== undefined ? existing[sub] : ''}" placeholder="Max 100">
    </div>
  `).join('');
}

// Mode A: Save & Next Student
document.getElementById('btnTeacherSaveNext').addEventListener('click', async () => {
  const sSelect = document.getElementById('teacherStudentSelect');
  const studentId = sSelect.value;
  const cls = document.getElementById('teacherClassSelect').value;
  const term = document.getElementById('teacherTermSelect').value;

  if (!studentId) return;

  const inputs = document.querySelectorAll('.sub-score-input');
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
    alert("All student marks for this class have been completed.");
  }
});

// Mode B: Bulk Sheet
async function loadBulkSubjectSheet(subject, cls, term) {
  const tbody = document.getElementById('teacherBulkTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Loading sheet...</td></tr>';

  tbody.innerHTML = '';
  for (let s of cachedFacultyStudents) {
    const doc = await db.collection("marks").doc(`${s.id}_${term}`).get();
    const val = doc.exists && doc.data().scores && doc.data().scores[subject] !== undefined ? doc.data().scores[subject] : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-roll">${s.roll_no}</span></td>
      <td><b>${s.name}</b></td>
      <td><input type="number" min="0" max="100" class="bulk-sub-input" data-id="${s.id}" value="${val}"></td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('btnTeacherSaveBulk').addEventListener('click', async () => {
  const sub = document.getElementById('teacherSubjectSelect').value;
  const term = document.getElementById('teacherTermSelect').value;
  const cls = document.getElementById('teacherClassSelect').value;
  const inputs = document.querySelectorAll('.bulk-sub-input');

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
  alert(`Marks for ${sub} successfully recorded.`);
});

document.getElementById('teacherClassSelect').addEventListener('change', setupTeacherMarksWorkspace);
document.getElementById('teacherTermSelect').addEventListener('change', setupTeacherMarksWorkspace);

// Attendance Roster
async function loadAttendanceWorkspace() {
  const cls = document.getElementById('attClassSelect').value;
  const dateInp = document.getElementById('attDateSelect');
  if (!dateInp.value) dateInp.value = new Date().toISOString().split('T')[0];
  const date = dateInp.value;

  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Loading attendance roster...</td></tr>';

  const [sSnap, aDoc] = await Promise.all([
    db.collection("students").where("class", "==", cls).get(),
    db.collection("attendance").doc(`${cls}_${date}`).get()
  ]);

  const existing = aDoc.exists ? aDoc.data().records || {} : {};
  let list = [];
  sSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => a.roll_no - b.roll_no);

  tbody.innerHTML = '';
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No students found in this class.</td></tr>';
    return;
  }

  list.forEach(s => {
    const status = existing[s.id] || 'P';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-roll">${s.roll_no}</span></td>
      <td><b>${s.name}</b></td>
      <td>
        <select onchange="recordAttendance('${cls}', '${date}', '${s.id}', this.value)" style="width: auto;">
          <option value="P" ${status === 'P' ? 'selected' : ''}>Present</option>
          <option value="A" ${status === 'A' ? 'selected' : ''}>Absent</option>
          <option value="L" ${status === 'L' ? 'selected' : ''}>Leave</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.recordAttendance = async function(cls, date, studentId, status) {
  await db.collection("attendance").doc(`${cls}_${date}`).set({
    class: cls,
    date: date,
    records: { [studentId]: status }
  }, { merge: true });
};

document.getElementById('attClassSelect').addEventListener('change', loadAttendanceWorkspace);
document.getElementById('attDateSelect').addEventListener('change', loadAttendanceWorkspace);

/* ================= 4. ADMIN DRAWER (PIN: 1234) ================= */
const adminDrawer = document.getElementById('adminDrawerModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

openSettingsBtn.addEventListener('click', () => adminDrawer.classList.add('open'));
closeSettingsBtn.addEventListener('click', () => adminDrawer.classList.remove('open'));

window.verifyAdminPin = function() {
  const pin = document.getElementById('adminPinInput').value;
  if (pin === "1234") {
    document.getElementById('adminAuthLock').style.display = 'none';
    document.getElementById('adminControlPanel').style.display = 'block';
    loadAdminRoster();
    loadAdminFeeLedger();
  } else {
    alert("Incorrect administrative PIN.");
  }
};

// Quick Admission (Auto-Roll)
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
  alert(`Student enrolled successfully with Roll No: ${maxRoll + 1}`);
  loadAdminRoster();
  loadAdminFeeLedger();
});

// Auto-shift Deletion Logic
async function loadAdminRoster() {
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
      <td><button class="btn btn-danger" style="padding:3px 8px; font-size:0.75rem;" onclick="adminDeleteStudent('${s.id}', '${s.class}', ${s.roll_no}, '${s.name}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.adminDeleteStudent = async function(docId, cls, deletedRoll, name) {
  if (!confirm(`Delete ${name} (Roll: ${deletedRoll})? Subsequent roll numbers will automatically shift up.`)) return;

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
  loadAdminRoster();
  loadAdminFeeLedger();
};

document.getElementById('adminManageClassSelect').addEventListener('change', loadAdminRoster);

// Fee Status
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
