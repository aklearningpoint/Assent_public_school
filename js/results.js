// Academic Results Calculation & Publish Control Engine (Assent Public School)

// Helper: Compute applicable subject list and max marks
function getSyllabusRuleSet(studentClass, term) {
  let list = [];
  const cls = (studentClass || '').trim();

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
    // Class 1 to Class 5
    list = [
      { name: 'Hindi', max: 100 },
      { name: 'English', max: 100 },
      { name: 'Mathematics', max: 100 },
      { name: 'Science', max: 100 },
      { name: 'Social Studies', max: 100 }
    ];
  }

  // Drawing is added in Term 2 and Annual Exam for 50 marks; excluded in Term 1
  if (term === 'Term 2' || term === 'Annual') {
    list.push({ name: 'Drawing', max: 50 });
  }

  return list;
}

// Letter Grade Evaluation
function determineLetterGrade(percentage) {
  if (percentage >= 85) return { grade: 'A+', remark: 'Outstanding' };
  if (percentage >= 70) return { grade: 'A', remark: 'Excellent' };
  if (percentage >= 55) return { grade: 'B', remark: 'Good' };
  if (percentage >= 40) return { grade: 'C', remark: 'Satisfactory' };
  return { grade: 'D', remark: 'Needs Improvement' };
}

window.loadStudentResultsFeed = async function(student) {
  const container = document.getElementById('studentResultFeedContainer');
  if (!container || !student) return;

  container.innerHTML = '<p class="muted-note">Connecting to examination records...</p>';

  try {
    // 1. Check Global Institutional Results Publish Status
    const settingDoc = await db.collection("settings").doc("results_control").get();
    const isPublished = settingDoc.exists ? settingDoc.data().published : false;

    if (!isPublished) {
      container.innerHTML = `
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔒</div>
          <h4 style="margin: 0 0 6px 0; color: #92400e; font-size: 1.1rem;">Results Under Institutional Review</h4>
          <p style="margin: 0; font-size: 0.88rem; color: #b45309; line-height: 1.5;">
            Official marksheets for this term are currently confidential and pending publication by the administration. Please check back after administrative notification.
          </p>
        </div>
      `;
      return;
    }

    // 2. Fetch Marks for Student
    const marksSnap = await db.collection("marks")
      .where("student_id", "==", student.id)
      .get();

    if (marksSnap.empty) {
      container.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 20px; text-align: center;">
          <p class="muted-note" style="margin: 0;">No examination records uploaded for this student yet.</p>
        </div>
      `;
      return;
    }

    let termMarksMap = {};
    marksSnap.forEach(doc => {
      const d = doc.data();
      termMarksMap[d.term] = d.scores || {};
    });

    const termSequence = [
      { key: 'Term 1', label: 'Term 1 (Half Yearly)' },
      { key: 'Term 2', label: 'Term 2' },
      { key: 'Annual', label: 'Annual Examination' }
    ];

    let html = '';

    termSequence.forEach(tObj => {
      const scores = termMarksMap[tObj.key];
      const subjects = getSyllabusRuleSet(student.class, tObj.key);

      html += `
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 18px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            <h4 style="margin: 0; color: var(--primary); font-size: 1.05rem;">${tObj.label}</h4>
      `;

      if (!scores) {
        html += `
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">EVALUATION PENDING</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 6px 0 0 0;">Evaluation scores have not been published for this term.</p>
        </div>
        `;
        return;
      }

      let obtainedTotal = 0;
      let maximumTotal = 0;

      let tableRows = '';
      subjects.forEach(sub => {
        const val = scores[sub.name] !== undefined ? scores[sub.name] : '-';
        if (typeof val === 'number') obtainedTotal += val;
        maximumTotal += sub.max;

        tableRows += `
          <tr>
            <td>${sub.name}</td>
            <td style="width: 100px;">${sub.max}</td>
            <td style="width: 120px;"><b>${val}</b></td>
          </tr>
        `;
      });

      const percentage = maximumTotal > 0 ? ((obtainedTotal / maximumTotal) * 100).toFixed(1) : 0;
      const grade = determineLetterGrade(percentage);

      html += `
            <span style="font-size: 0.82rem; background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 4px; font-weight: 700;">
              Grade: ${grade.grade} (${grade.remark})
            </span>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Maximum</th>
                  <th>Marks Obtained</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                <tr style="background: #f1f5f9; font-weight: bold;">
                  <td>Consolidated Total</td>
                  <td>${maximumTotal}</td>
                  <td>${obtainedTotal} (${percentage}%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="muted-note" style="color: var(--danger);">Failed to load academic results: ${err.message}</p>`;
  }
};
