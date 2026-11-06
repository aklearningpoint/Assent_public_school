// 1. FIREBASE INITIALIZATION WITH YOUR REAL KEYS
const firebaseConfig = {
  apiKey: "AIzaSyAq9vIJtCIqVl52Pak59DpAgaBhTumtOaI",
  authDomain: "assent-public-school.firebaseapp.com",
  databaseURL: "https://assent-public-school-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "assent-public-school",
  storageBucket: "assent-public-school.firebasestorage.app",
  messagingSenderId: "747815981128",
  appId: "1:747815981128:web:6e0d9ad492a952e624c87d",
  measurementId: "G-ZV3Z8LBW1E"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2G/Slow network ke liye Offline Persistence Enable karna
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Multiple tabs open, offline persistence single tab me chalegi.");
  } else if (err.code === 'unimplemented') {
    console.warn("Browser offline persistence support nahi karta.");
  }
});

// DOM Elements
const addForm = document.getElementById('addStudentForm');
const studentClassInput = document.getElementById('studentClass');
const studentNameInput = document.getElementById('studentName');
const filterClassSelect = document.getElementById('filterClass');
const tableBody = document.getElementById('studentTableBody');
const syncStatus = document.getElementById('syncStatus');

// Network indicator tracking
window.addEventListener('online', () => { 
  if (syncStatus) {
    syncStatus.innerText = "🟢 Online (Synced)"; 
    syncStatus.style.background = "#dcfce7"; 
  }
});
window.addEventListener('offline', () => { 
  if (syncStatus) {
    syncStatus.innerText = "🟡 Offline Mode (Local Cache Active)"; 
    syncStatus.style.background = "#fef9c3"; 
  }
});

// 2. QUICK ADD STUDENT (Auto-Roll Assignment Logic)
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const selectedClass = studentClassInput.value;
  const name = studentNameInput.value.trim().toUpperCase();

  if (!name) return;

  try {
    // Current class ke sabse bade roll number ko find karna
    const snapshot = await db.collection("students")
      .where("class", "==", selectedClass)
      .orderBy("roll_no", "desc")
      .limit(1)
      .get();

    let nextRoll = 1;
    if (!snapshot.empty) {
      nextRoll = snapshot.docs[0].data().roll_no + 1;
    }

    // New student record save karna
    await db.collection("students").add({
      name: name,
      class: selectedClass,
      roll_no: nextRoll,
      profile_completed: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    studentNameInput.value = '';
    if (filterClassSelect.value !== selectedClass) {
      filterClassSelect.value = selectedClass;
      loadStudentsRealtime(selectedClass);
    }
  } catch (error) {
    console.error("Student add karne me error:", error);
    alert("Bache ko jodne me dikkat aayi. Kripya Firestore Rules aur Internet check karein.");
  }
});

// 3. REALTIME LISTENER WITH LOCAL CACHE (Super-Fast Rendering)
let unsubscribeCurrentClass = null;

function loadStudentsRealtime(selectedClass) {
  if (unsubscribeCurrentClass) unsubscribeCurrentClass();

  tableBody.innerHTML = '<tr><td colspan="4" class="empty">Loading list...</td></tr>';

  unsubscribeCurrentClass = db.collection("students")
    .where("class", "==", selectedClass)
    .orderBy("roll_no", "asc")
    .onSnapshot((snapshot) => {
      tableBody.innerHTML = '';

      if (snapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty">Is class me abhi koi student nahi hai.</td></tr>';
        return;
      }

      snapshot.docs.forEach((doc) => {
        const student = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge-roll">${student.roll_no}</span></td>
          <td><b>${student.name}</b></td>
          <td><span style="font-size: 0.8rem; color: ${student.profile_completed ? 'green' : '#ea580c'};">
            ${student.profile_completed ? '● Completed' : '○ Self-Fill Pending'}
          </span></td>
          <td style="text-align: center;">
            <button class="btn-del" onclick="deleteAndShiftRoll('${doc.id}', '${student.class}', ${student.roll_no}, '${student.name}')">🗑 Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }, (error) => {
      console.error("Firestore read error:", error);
    });
}

// 4. ATOMIC AUTO-SHIFT ON DELETE (Ek Bacha Hatega, Niche Wale Turant Shift Honge)
window.deleteAndShiftRoll = async function(docId, studentClass, deletedRoll, studentName) {
  const confirmAction = confirm(`Kya aap sach me ${studentName} (Roll: ${deletedRoll}) ko delete karna chahte hain?\nIske baad iske niche wale sabhi students ka Roll Number automatic 1 number upar shift ho jayega.`);
  if (!confirmAction) return;

  try {
    const batch = db.batch();

    // 1. Selected student ko delete karo
    const deleteRef = db.collection("students").doc(docId);
    batch.delete(deleteRef);

    // 2. Uske baad wale (Roll > deletedRoll) sabhi bachon ko fetch karo
    const subsequentStudents = await db.collection("students")
      .where("class", "==", studentClass)
      .where("roll_no", ">", deletedRoll)
      .get();

    // 3. Sabka roll number -1 update karo
    subsequentStudents.docs.forEach((doc) => {
      const currentRoll = doc.data().roll_no;
      batch.update(doc.ref, { roll_no: currentRoll - 1 });
    });

    // 4. Atomic execution
    await batch.commit();
  } catch (error) {
    console.error("Delete aur shift karne me dikkat aayi:", error);
    alert("Delete operation fail hua. Kripya dobara koshish karein.");
  }
};

// Filter change handler
filterClassSelect.addEventListener('change', (e) => {
  loadStudentsRealtime(e.target.value);
});

// Initial Load
loadStudentsRealtime(filterClassSelect.value);
