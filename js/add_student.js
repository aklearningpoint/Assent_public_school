// Fast Student Enrollment & Auto-Roll Generation Engine (Assent Public School)

document.addEventListener('DOMContentLoaded', () => {
  const addStudentForm = document.getElementById('teacherAddStudentForm');
  if (addStudentForm) {
    addStudentForm.addEventListener('submit', handleFastStudentEnrollment);
  }
});

async function handleFastStudentEnrollment(e) {
  e.preventDefault();

  const selectedClass = document.getElementById('teacherEnrollClass').value;
  const rawName = document.getElementById('teacherEnrollName').value.trim();
  const studentName = rawName.toUpperCase();

  if (!studentName) {
    alert("Please enter the full name of the student.");
    return;
  }

  try {
    // 1. Calculate the next sequential roll number for this class
    const classSnapshot = await db.collection("students")
      .where("class", "==", selectedClass)
      .get();

    let maxRollNumber = 0;
    classSnapshot.forEach(doc => {
      const roll = doc.data().roll_no || 0;
      if (roll > maxRollNumber) {
        maxRollNumber = roll;
      }
    });

    const nextRollNumber = maxRollNumber + 1;

    // 2. Insert new student baseline record
    await db.collection("students").add({
      name: studentName,
      class: selectedClass,
      roll_no: nextRollNumber,
      register_no: `APS/2026/${selectedClass.replace(/\s+/g, '')}/${String(nextRollNumber).padStart(3, '0')}`,
      profile_completed: false,
      father_name: "",
      mother_name: "",
      gender: "Male",
      dob: "",
      mobile_primary: "",
      mobile_secondary: null,
      address: "Singhia Khurd, Samastipur",
      monthly_fee: 450,
      fee_status: "Unpaid",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert(`Student "${studentName}" enrolled successfully in ${selectedClass} with Roll Number: ${nextRollNumber}.`);
    document.getElementById('teacherEnrollName').value = '';

    // Synchronize filter dropdown and refresh roster view
    const rosterFilter = document.getElementById('teacherRosterFilterClass');
    if (rosterFilter) {
      rosterFilter.value = selectedClass;
    }

    if (typeof window.loadTeacherRosterList === 'function') {
      window.loadTeacherRosterList();
    }
  } catch (err) {
    console.error("Enrollment failed:", err);
    alert("Failed to enroll student: " + err.message);
  }
}

// Render dynamic class roster list
window.loadTeacherRosterList = async function() {
  const filterSelect = document.getElementById('teacherRosterFilterClass');
  const tbody = document.getElementById('teacherRosterTableBody');
  if (!tbody || !filterSelect) return;

  const targetClass = filterSelect.value;
  tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Retrieving class roster...</td></tr>';

  try {
    const snap = await db.collection("students")
      .where("class", "==", targetClass)
      .get();

    let studentList = [];
    snap.forEach(doc => {
      studentList.push({ id: doc.id, ...doc.data() });
    });

    studentList.sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

    if (studentList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">No students currently enrolled in ${targetClass}.</td></tr>`;
      return;
    }

    let rowsHtml = '';
    studentList.forEach(student => {
      const isComplete = student.profile_completed === true;
      const statusBadge = isComplete
        ? '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.78rem;">Completed</span>'
        : '<span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.78rem;">Pending Self-Fill</span>';

      rowsHtml += `
        <tr>
          <td><b style="color: var(--primary);">${student.roll_no || '-'}</b></td>
          <td><b>${student.name || '-'}</b></td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${student.register_no || '-'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-cell" style="color: var(--danger);">Error loading roster: ${err.message}</td></tr>`;
  }
};
