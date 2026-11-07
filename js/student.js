// Student Portal Dedicated Logic (Assent Public School)

document.addEventListener('DOMContentLoaded', () => {
  const btnSearch = document.getElementById('btnSearchStudent');
  const lookupRoll = document.getElementById('lookupRoll');

  if (btnSearch) {
    btnSearch.addEventListener('click', executeStudentLookup);
  }

  if (lookupRoll) {
    lookupRoll.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeStudentLookup();
    });
  }
});

// Subject Matrix Helper
function getStudentSubjects(cls, term) {
  let sub = [];
  if (['Play', 'Nursery', 'LKG'].includes(cls)) {
    sub = ['Hindi', 'English', 'Mathematics'];
  } else if (cls === 'UKG') {
    sub = ['Hindi', 'English', 'Mathematics', 'EVS'];
  } else {
    sub = ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'G.K.'];
  }
  if (term !== 'Term 1') {
    sub.push('Drawing');
  }
  return sub;
}

// Grade Calculator
function calculateGrade(percentage) {
  if (percentage >= 85) return { grade: 'A+', remark: 'Outstanding' };
  if (percentage >= 70) return { grade: 'A', remark: 'Excellent' };
  if (percentage >= 55) return { grade: 'B', remark: 'Good' };
  if (percentage >= 40) return { grade: 'C', remark: 'Satisfactory' };
  return { grade: 'D', remark: 'Needs Improvement' };
}

async function executeStudentLookup() {
  const cls = document.getElementById('lookupClass').value;
  const rollInput = document.getElementById('lookupRoll').value.trim();
  const roll = parseInt(rollInput);
  const container = document.getElementById('studentDetailContainer');

  if (!rollInput || isNaN(roll) || roll < 1) {
    alert("Please enter a valid Roll Number.");
    return;
  }

  container.style.display = 'block';
  container.innerHTML = '<p class="muted-text">Fetching academic records...</p>';

  try {
    // 1. Fetch Student Record
    const studentQuery = await db.collection("students")
      .where("class", "==", cls)
      .where("roll_no", "==", roll)
      .limit(1)
      .get();

    if (studentQuery.empty) {
      container.innerHTML = `
        <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626;">
          <b>Record Not Found:</b> No student enrolled with Roll No. <b>${roll}</b> in <b>${cls}</b>. Please verify the credentials.
        </div>
      `;
      return;
    }

    const studentDoc = studentQuery.docs[0];
    const studentData = studentDoc.data();
    const studentId = studentDoc.id;

    // 2. Fetch All Students in Class (To calculate live Class Rank)
    const allClassStudentsSnap = await db.collection("students")
      .where("class", "==", cls)
      .get();

    // 3. Fetch All Marks for this Class
    const allClassMarksSnap = await db.collection("marks")
      .where("class", "==", cls)
      .get();

    let studentMarksMap = {};
    allClassMarksSnap.forEach(doc => {
      const d = doc.data();
      if (!studentMarksMap[d.student_id]) studentMarksMap[d.student_id] = {};
      studentMarksMap[d.student_id][d.term] = d.scores || {};
    });

    // Compute Term 1, Term 2, Term 3 Totals for Current Student
    const currentStudentScores = studentMarksMap[studentId] || {};

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.4rem; color: var(--primary); margin-bottom: 4px;">${studentData.name}</h2>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin: 0;">
            Class: <b>${studentData.class}</b> &nbsp;|&nbsp; 
            Roll No: <b>${studentData.roll_no}</b> &nbsp;|&nbsp; 
            Scholar Status: <b>Regular</b>
          </p>
        </div>
        <div>
          <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background: ${studentData.fee_status === 'Paid' ? '#dcfce7' : '#fee2e2'}; color: ${studentData.fee_status === 'Paid' ? '#166534' : '#dc2626'};">
            Tuition: ${studentData.fee_status || 'Unpaid'}
          </span>
        </div>
      </div>
      <h3 style="margin-bottom: 12px; font-size: 1.05rem;">Examination Evaluations</h3>
    `;

    const terms = ['Term 1', 'Term 2', 'Term 3'];
    let termsRecordedCount = 0;

    terms.forEach(term => {
      const scores = currentStudentScores[term];
      const subjects = getStudentSubjects(cls, term);
      const termTitle = term === 'Term 1' ? 'Term 1 (Half Yearly)' : term === 'Term 3' ? 'Term 3 (Annual)' : 'Term 2';

      html += `
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="color: var(--primary); font-size: 0.95rem; margin: 0;">${termTitle}</h4>
      `;

      if (!scores || Object.keys(scores).length === 0) {
        html += `<span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">PENDING EVALUATION</span></div>
                 <p style="font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 0 0;">Evaluation scores have not been published for this term yet.</p>
                 </div>`;
        return;
      }

      termsRecordedCount++;

      // Compute Total and Rank for this Term
      let termTotal = 0;
      subjects.forEach(sub => {
        const val = scores[sub];
        if (typeof val === 'number') termTotal += val;
      });

      const maxPossible = subjects.length * 100;
      const percentage = maxPossible > 0 ? ((termTotal / maxPossible) * 100).toFixed(1) : 0;
      const gradeInfo = calculateGrade(percentage);

      // Calculate Rank within Class for this specific term
      let classRankArray = [];
      allClassStudentsSnap.forEach(sDoc => {
        const sid = sDoc.id;
        const sScores = (studentMarksMap[sid] && studentMarksMap[sid][term]) || {};
        let stTotal = 0;
        subjects.forEach(sub => {
          if (typeof sScores[sub] === 'number') stTotal += sScores[sub];
        });
        classRankArray.push({ id: sid, total: stTotal });
      });

      classRankArray.sort((a, b) => b.total - a.total);
      const studentRankIndex = classRankArray.findIndex(item => item.id === studentId);
      const termRank = studentRankIndex !== -1 ? studentRankIndex + 1 : '-';

      html += `
            <span style="font-size: 0.8rem; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: bold;">
              Class Rank: #${termRank}
            </span>
          </div>

          <div class="table-responsive">
            <table style="font-size: 0.82rem; margin-top: 6px;">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style="width: 100px;">Max Marks</th>
                  <th style="width: 120px;">Marks Obtained</th>
                </tr>
              </thead>
              <tbody>
      `;

      subjects.forEach(sub => {
        const val = scores[sub] !== undefined ? scores[sub] : '-';
        html += `
          <tr>
            <td>${sub}</td>
            <td>100</td>
            <td><b>${val}</b></td>
          </tr>
        `;
      });

      html += `
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td>Consolidated Score</td>
                <td>${maxPossible}</td>
                <td>${termTotal} (${percentage}%) &nbsp;|&nbsp; Grade: <span style="color: #1e40af;">${gradeInfo.grade}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      `;
    });

    html += `
      <div class="btn-right" style="margin-top: 14px;">
        <button class="btn btn-primary" onclick="window.print()">🖨 Print Official Scorecard</button>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error("Student Lookup Error:", error);
    container.innerHTML = `
      <div style="padding: 12px; background: #fef2f2; color: #dc2626; border-radius: 6px;">
        An unexpected error occurred while fetching data: ${error.message}
      </div>
    `;
  }
}
