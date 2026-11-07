// Marksheet Preparation & Evaluation Engine (Assent Public School)

let activeTeacherEntryMode = 'rollwise';
let cachedMarksStudents = [];

window.setTeacherEntryMode = function(mode) {
  activeTeacherEntryMode = mode;
  const btnRoll = document.getElementById('btnModeRollWise');
  const btnSubject = document.getElementById('btnModeSubjectWise');
  const rollContainer = document.getElementById('marksModeRollWiseContainer');
  const subjectContainer = document.getElementById('marksModeSubjectWiseContainer');

  if (btnRoll) btnRoll.classList.toggle('active', mode === 'rollwise');
  if (btnSubject) btnSubject.classList.toggle('active', mode === 'subjectwise');
  if (rollContainer) rollContainer.style.display = mode === 'rollwise' ? 'block' : 'none';
  if (subjectContainer) subjectContainer.style.display = mode === 'subjectwise' ? 'block' : 'none';

  setupMarksheetWorkspace();
};

function getTeacherSubjectList(targetClass, term) {
  let list = [];
  const cls = (targetClass || '').trim();

  if (cls === 'Play' || cls === 'Nursery') {
    list = [
      { name: 'Hindi', max: 100 },
      { name: 'English', max: 100 },
      { name: 'Mathematics', max: 100 }
    ];
  } else if (cls === 'UKG') {
    list = [
      { name: 'Hindi', max: 100 },
      { name: 'English', max: 100 },
      { name: 'Mathematics', max: 100 },
      { name: 'EVS', max: 100 }
    ];
  } else {
    list = [
      { name: 'Hindi', max: 100 },
      { name: 'English', max: 100 },
      { name: 'Mathematics', max: 100 },
      { name: 'Science', max: 100 },
      { name: 'Social Studies', max: 100 }
    ];
  }

  if (term === 'Term 2' || term === 'Annual') {
    list.push({ name: 'Drawing', max: 50 });
  }

  return list;
}

window.setupMarksheetWorkspace = async function() {
  const cls = document.getElementById('marksPrepClass').value;
  const term = document.getElementById('marksPrepTerm').value;
  const subjects = getTeacherSubjectList(cls, term);

  // Fetch student roster for the selected class
  const snap = await db.collection("students")
    .where("class", "==", cls)
    .get();

  cachedMarksStudents = [];
  snap.forEach(doc => {
    cachedMarksStudents.push({ id: doc.id, ...doc.data() });
  });
  cachedMarksStudents.sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

  if (activeTeacherEntryMode === 'rollwise') {
    const studentPicker = document.getElementById('marksStudentPicker');
    if (cachedMarksStudents.length === 0) {
      studentPicker.innerHTML = '<option value="">No enrolled students found</option>';
      document.getElementById('marksDynamicSubjectInputs').innerHTML = '<p class="muted-note">No students found in this class.</p>';
      return;
    }

    studentPicker.innerHTML = cachedMarksStudents.map(s => 
      `<option value="${s.id}">Roll ${s.roll_no}: ${s.name}</option>`
    ).join('');

    studentPicker.onchange = () => loadStudentScoreInputs(studentPicker.value, subjects, term);
    loadStudentScoreInputs(studentPicker.value, subjects, term);
  } else {
    const subjectPicker = document.getElementById('marksSubjectPicker');
    subjectPicker.innerHTML = subjects.map(s => 
      `<option value="${s.name}">${s.name} (Max: ${s.max})</option>`
    ).join('');

    subjectPicker.onchange = () => loadBulkSubjectMatrix(subjectPicker.value, cls, term, subjects);
    loadBulkSubjectMatrix(subjectPicker.value, cls, term, subjects);
  }
};

/* ================= MODE 1: STUDENT-WISE (SAVE & NEXT) ================= */
async function loadStudentScoreInputs(studentId, subjects, term) {
  const container = document.getElementById('marksDynamicSubjectInputs');
  if (!studentId || !container) return;

  const doc = await db.collection("marks").doc(`${studentId}_${term}`).get();
  const existingScores = doc.exists ? (doc.data().scores || {}) : {};

  container.innerHTML = subjects.map(sub => `
    <div class="subject-input-box">
      <label>${sub.name} (Max ${sub.max})</label>
      <input type="number" min="0" max="${sub.max}" class="marks-input-field" 
        data-subject="${sub.name}" data-max="${sub.max}" 
        value="${existingScores[sub.name] !== undefined ? existingScores[sub.name] : ''}" 
        placeholder="Enter 0-${sub.max}">
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const btnSaveNext = document.getElementById('btnSaveRollMarksNext');
  if (btnSaveNext) {
    btnSaveNext.addEventListener('click', saveStudentMarksAndNext);
  }

  const btnSaveBulk = document.getElementById('btnSaveBulkSubjectMarks');
  if (btnSaveBulk) {
    btnSaveBulk.addEventListener('click', saveBulkSubjectMarks);
  }
});

async function saveStudentMarksAndNext() {
  const studentPicker = document.getElementById('marksStudentPicker');
  const cls = document.getElementById('marksPrepClass').value;
  const term = document.getElementById('marksPrepTerm').value;
  const studentId = studentPicker.value;

  if (!studentId) return;

  const inputs = document.querySelectorAll('.marks-input-field');
  let scores = {};
  let totalObtained = 0;

  for (let inp of inputs) {
    const subName = inp.dataset.subject;
    const maxVal = parseFloat(inp.dataset.max);
    const enteredVal = inp.value.trim();

    if (enteredVal !== '') {
      const numVal = parseFloat(enteredVal);
      if (isNaN(numVal) || numVal < 0 || numVal > maxVal) {
        alert(`Invalid score for ${subName}. Value must be between 0 and ${maxVal}.`);
        inp.focus();
        return;
      }
      scores[subName] = numVal;
      totalObtained += numVal;
    }
  }

  try {
    await db.collection("marks").doc(`${studentId}_${term}`).set({
      student_id: studentId,
      class: cls,
      term: term,
      scores: scores,
      total_obtained: totalObtained,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Auto-advance to next student
    const currentIndex = studentPicker.selectedIndex;
    if (currentIndex < studentPicker.options.length - 1) {
      studentPicker.selectedIndex = currentIndex + 1;
      studentPicker.dispatchEvent(new Event('change'));
    } else {
      alert("Evaluation saved. All students in this class have been completed.");
    }
  } catch (err) {
    alert("Failed to save marks: " + err.message);
  }
}

/* ================= MODE 2: BULK SUBJECT MATRIX ================= */
async function loadBulkSubjectMatrix(subjectName, targetClass, term, subjects) {
  const tbody = document.getElementById('bulkMarksTableBody');
  if (!tbody) return;

  const currentSubObj = subjects.find(s => s.name === subjectName) || { max: 100 };
  tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Loading subject sheet...</td></tr>';

  let rowsHtml = '';
  for (let student of cachedMarksStudents) {
    const doc = await db.collection("marks").doc(`${student.id}_${term}`).get();
    const existingVal = (doc.exists && doc.data().scores && doc.data().scores[subjectName] !== undefined)
      ? doc.data().scores[subjectName]
      : '';

    rowsHtml += `
      <tr>
        <td><b style="color: var(--primary);">${student.roll_no}</b></td>
        <td><b>${student.name}</b></td>
        <td>
          <input type="number" min="0" max="${currentSubObj.max}" class="bulk-mark-input" 
            data-student-id="${student.id}" data-max="${currentSubObj.max}" 
            value="${existingVal}" placeholder="Max ${currentSubObj.max}">
        </td>
        <td>${currentSubObj.max}</td>
      </tr>
    `;
  }

  tbody.innerHTML = rowsHtml || '<tr><td colspan="4" class="empty-cell">No students registered in this class.</td></tr>';
}

async function saveBulkSubjectMarks() {
  const subjectPicker = document.getElementById('marksSubjectPicker');
  const targetClass = document.getElementById('marksPrepClass').value;
  const term = document.getElementById('marksPrepTerm').value;
  const selectedSubject = subjectPicker.value;

  const inputs = document.querySelectorAll('.bulk-mark-input');
  if (inputs.length === 0) return;

  const batch = db.batch();

  for (let inp of inputs) {
    const sId = inp.dataset.studentId;
    const maxVal = parseFloat(inp.dataset.max);
    const enteredVal = inp.value.trim();

    if (enteredVal !== '') {
      const numVal = parseFloat(enteredVal);
      if (isNaN(numVal) || numVal < 0 || numVal > maxVal) {
        alert(`Invalid score entered. Values must be between 0 and ${maxVal}.`);
        inp.focus();
        return;
      }

      const ref = db.collection("marks").doc(`${sId}_${term}`);
      batch.set(ref, {
        student_id: sId,
        class: targetClass,
        term: term,
        scores: { [selectedSubject]: numVal },
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  try {
    await batch.commit();
    alert(`Bulk marks for "${selectedSubject}" saved successfully for all students.`);
  } catch (err) {
    alert("Failed to commit bulk marks: " + err.message);
  }
}
