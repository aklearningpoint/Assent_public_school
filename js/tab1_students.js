// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAq9vIJtCIqVl52Pak59DpAgaBhTumtOaI",
  authDomain: "assent-public-school.firebaseapp.com",
  projectId: "assent-public-school",
  storageBucket: "assent-public-school.appspot.com",
  messagingSenderId: "747815981128",
  appId: "1:747815981128:web:6e0d9ad492a952e624c87d"
};

// Initialize
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// DOM References
const addForm = document.getElementById('addStudentForm');
const studentClassInput = document.getElementById('studentClass');
const studentNameInput = document.getElementById('studentName');
const filterClassSelect = document.getElementById('filterClass');
const tableBody = document.getElementById('studentTableBody');
const syncStatus = document.getElementById('syncStatus');

// 1. ADD STUDENT (Query bina index error ke calculate hogi)
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const selectedClass = studentClassInput.value;
  const name = studentNameInput.value.trim().toUpperCase();

  if (!name) return;

  syncStatus.innerText = "⏳ Saving...";

  try {
    const snapshot = await db.collection("students")
      .where("class", "==", selectedClass)
      .get();

    let nextRoll = 1;
    if (!snapshot.empty) {
      let maxRoll = 0;
      snapshot.forEach(doc => {
        const r = doc.data().roll_no || 0;
        if (r > maxRoll) maxRoll = r;
      });
      nextRoll = maxRoll + 1;
    }

    await db.collection("students").add({
      name: name,
      class: selectedClass,
      roll_no: nextRoll,
      profile_completed: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    studentNameInput.value = '';
    syncStatus.innerText = "🟢 Student Added";
    
    if (filterClassSelect.value !== selectedClass) {
      filterClassSelect.value = selectedClass;
      loadStudentsRealtime(selectedClass);
    }
  } catch (error) {
    console.error("Firestore Add Error:", error);
    syncStatus.innerText = "❌ Error Occurred";
    alert("Error: " + error.message);
  }
});

// 2. REALTIME LISTENER (Memory-level sorting taaki query fail na ho)
let unsubscribeCurrentClass = null;

function loadStudentsRealtime(selectedClass) {
  if (unsubscribeCurrentClass) unsubscribeCurrentClass();

  tableBody.innerHTML = '<tr><td colspan="4" class="empty">Loading list...</td></tr>';

  unsubscribeCurrentClass = db.collection("students")
    .where("class", "==", selectedClass)
    .onSnapshot((snapshot) => {
      tableBody.innerHTML = '';

      if (snapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty">Is class me abhi koi student nahi hai.</td></tr>';
        return;
      }

      let studentsList = [];
      snapshot.forEach((doc) => {
        studentsList.push({ id: doc.id, ...doc.data() });
      });

      // Roll number ke mutabiq ascending sort
      studentsList.sort((a, b) => a.roll_no - b.roll_no);

      studentsList.forEach((student) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge-roll">${student.roll_no}</span></td>
          <td><b>${student.name}</b></td>
          <td><span style="font-size: 0.8rem; color: ${student.profile_completed ? 'green' : '#ea580c'};">
            ${student.profile_completed ? '● Completed' : '○ Pending'}
          </span></td>
          <td style="text-align: center;">
            <button class="btn-del" onclick="deleteAndShiftRoll('${student.id}', '${student.class}', ${student.roll_no}, '${student.name}')">🗑 Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
      syncStatus.innerText = "🟢 Realtime Connected";
    }, (error) => {
      console.error("Snapshot error:", error);
      syncStatus.innerText = "❌ Connection Error";
      tableBody.innerHTML = `<tr><td colspan="4" class="empty" style="color:red;">Error: ${error.message}</td></tr>`;
    });
}

// 3. DELETE & AUTO-SHIFT
window.deleteAndShiftRoll = async function(docId, studentClass, deletedRoll, studentName) {
  const confirmAction = confirm(`${studentName} (Roll: ${deletedRoll}) ko delete karein?\nIske baad ke roll numbers automatic shift ho jayenge.`);
  if (!confirmAction) return;

  try {
    const batch = db.batch();
    batch.delete(db.collection("students").doc(docId));

    const subsequent = await db.collection("students")
      .where("class", "==", studentClass)
      .get();

    subsequent.forEach((doc) => {
      const data = doc.data();
      if (data.roll_no > deletedRoll) {
        batch.update(doc.ref, { roll_no: data.roll_no - 1 });
      }
    });

    await batch.commit();
  } catch (error) {
    alert("Delete error: " + error.message);
  }
};

filterClassSelect.addEventListener('change', (e) => {
  loadStudentsRealtime(e.target.value);
});

// Start listening
loadStudentsRealtime(filterClassSelect.value);
