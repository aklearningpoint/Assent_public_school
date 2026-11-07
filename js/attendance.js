// Daily Attendance Register Controller (Assent Public School)

let cachedAttendanceStudents = [];

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('btnSaveDailyAttendance');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveDailyAttendanceRegister);
  }
});

window.loadDailyAttendanceRoster = async function() {
  const classSelect = document.getElementById('attTargetClass');
  const dateInput = document.getElementById('attRecordDate');
  const tbody = document.getElementById('attendanceRegisterBody');

  if (!classSelect || !dateInput || !tbody) return;

  const targetClass = classSelect.value;
  const targetDate = dateInput.value;

  if (!targetDate) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Please select a valid attendance date.</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Loading class register...</td></tr>';

  try {
    const docId = `${targetClass.replace(/\s+/g, '_')}_${targetDate}`;

    // Parallel fetch: class students roster and existing date attendance record
    const [studentsSnap, attendanceDoc] = await Promise.all([
      db.collection("students").where("class", "==", targetClass).get(),
      db.collection("attendance").doc(docId).get()
    ]);

    cachedAttendanceStudents = [];
    studentsSnap.forEach(doc => {
      cachedAttendanceStudents.push({ id: doc.id, ...doc.data() });
    });

    cachedAttendanceStudents.sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

    if (cachedAttendanceStudents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-cell">No students registered in ${targetClass}.</td></tr>`;
      return;
    }

    const existingRecords = attendanceDoc.exists ? (attendanceDoc.data().records || {}) : null;

    let rowsHtml = '';
    cachedAttendanceStudents.forEach(student => {
      // If records already saved for date, reflect status; default to true (Present) if new register
      const isPresent = existingRecords ? existingRecords[student.id] === 'P' : true;

      rowsHtml += `
        <tr>
          <td><b style="color: var(--primary);">${student.roll_no || '-'}</b></td>
          <td><b>${student.name || '-'}</b></td>
          <td style="text-align: center;">
            <input type="checkbox" class="att-status-checkbox" data-student-id="${student.id}" ${isPresent ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary);">
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error("Attendance fetch error:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="empty-cell" style="color: var(--danger);">Failed to load register: ${err.message}</td></tr>`;
  }
};

async function saveDailyAttendanceRegister() {
  const classSelect = document.getElementById('attTargetClass');
  const dateInput = document.getElementById('attRecordDate');

  if (!classSelect || !dateInput) return;

  const targetClass = classSelect.value;
  const targetDate = dateInput.value;

  if (!targetDate) {
    alert("Please select an attendance date before saving.");
    return;
  }

  const checkboxes = document.querySelectorAll('.att-status-checkbox');
  if (checkboxes.length === 0) {
    alert("No student entries available to save.");
    return;
  }

  let records = {};
  let presentCount = 0;
  let absentCount = 0;

  checkboxes.forEach(cb => {
    const studentId = cb.dataset.studentId;
    if (cb.checked) {
      records[studentId] = 'P';
      presentCount++;
    } else {
      records[studentId] = 'A';
      absentCount++;
    }
  });

  const docId = `${targetClass.replace(/\s+/g, '_')}_${targetDate}`;

  try {
    await db.collection("attendance").doc(docId).set({
      class: targetClass,
      date: targetDate,
      records: records,
      present_count: presentCount,
      absent_count: absentCount,
      total_students: checkboxes.length,
      saved_at: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    alert(`Attendance for ${targetClass} on ${targetDate} saved successfully.\nPresent: ${presentCount} | Absent: ${absentCount}`);
  } catch (err) {
    console.error("Attendance save failed:", err);
    alert("Failed to save attendance register: " + err.message);
  }
}
