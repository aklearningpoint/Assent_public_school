// Notices, Examination Programme & Admit Card Engine (Assent Public School)

document.addEventListener('DOMContentLoaded', () => {
  const noticeForm = document.getElementById('noticePublishForm');
  if (noticeForm) {
    noticeForm.addEventListener('submit', handlePublishNotice);
  }
});

/* ================= 1. STUDENT NOTICE FEED ================= */
window.loadStudentNoticesFeed = async function() {
  const feedContainer = document.getElementById('studentNoticeFeed');
  if (!feedContainer) return;

  try {
    const snap = await db.collection("notices")
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    if (snap.empty) {
      feedContainer.innerHTML = '<p class="muted-note">No notices currently published.</p>';
      return;
    }

    let html = '';
    snap.forEach(doc => {
      const data = doc.data();
      const dateStr = data.created_at ? new Date(data.created_at.toDate()).toLocaleDateString('en-GB') : 'Recent';
      html += `
        <div style="background: #f8fafc; border: 1px solid var(--border); border-left: 4px solid var(--primary); padding: 14px 16px; border-radius: 6px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h4 style="margin: 0; color: var(--primary); font-size: 0.98rem;">${data.title}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${dateStr}</span>
          </div>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-main); line-height: 1.5; white-space: pre-wrap;">${data.body}</p>
        </div>
      `;
    });
    feedContainer.innerHTML = html;
  } catch (err) {
    feedContainer.innerHTML = `<p class="muted-note" style="color: var(--danger);">Failed to load announcements: ${err.message}</p>`;
  }
};

/* ================= 2. EXAM PROGRAMME FEED ================= */
window.loadStudentExamProgramme = async function(studentClass) {
  const programmeContainer = document.getElementById('studentProgrammeFeed');
  if (!programmeContainer) return;

  try {
    const snap = await db.collection("exam_programmes")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      programmeContainer.innerHTML = '<p class="muted-note">The current term examination routine has not been announced yet.</p>';
      return;
    }

    const doc = snap.docs[0].data();
    programmeContainer.innerHTML = `
      <div style="background: #f8fafc; border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
          <h4 style="margin: 0; color: var(--primary); font-size: 1.05rem;">Official Routine: ${doc.term}</h4>
          <span style="font-size: 0.8rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Range: ${doc.class_range}</span>
        </div>
        <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-main); white-space: pre-wrap;">${doc.schedule}</div>
      </div>
    `;
  } catch (err) {
    programmeContainer.innerHTML = `<p class="muted-note" style="color: var(--danger);">Unable to fetch examination routine.</p>`;
  }
};

/* ================= 3. ADMIT CARD VIEWER (ON-SCREEN VIEW-ONLY) ================= */
window.loadStudentAdmitCardView = function(student) {
  const admitContainer = document.getElementById('studentAdmitCardView');
  if (!admitContainer || !student) return;

  admitContainer.innerHTML = `
    <div style="border: 2px solid var(--primary); border-radius: 10px; padding: 20px; background: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.06); max-width: 620px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin-bottom: 14px;">
        <h3 style="margin: 0; color: var(--primary); font-size: 1.25rem;">ASSENT PUBLIC SCHOOL</h3>
        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">Singhia Khurd, Samastipur | Official Candidate Admit Card</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.88rem; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px;">
        <div>Candidate Name: <b>${student.name || '-'}</b></div>
        <div>Class: <b>${student.class || '-'}</b></div>
        <div>Roll Number: <b>${student.roll_no || '-'}</b></div>
        <div>Reg No: <b>${student.register_no || 'Pending'}</b></div>
        <div>Father's Name: <b>${student.father_name || 'Verified on Record'}</b></div>
        <div>Exam Center: <b>Assent Public School Campus</b></div>
      </div>

      <div style="font-size: 0.8rem; color: #475569; margin-bottom: 16px; border-left: 3px solid #f59e0b; padding-left: 8px;">
        * Strict sitting roll arrangement applies. Entry to exam hall is verified digitally. No separate paper download required.
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 18px; border-top: 1px dashed var(--border); font-size: 0.8rem;">
        <span>Status: <b style="color: var(--success);">Eligible Candidate</b></span>
        <span style="border-top: 1px solid var(--secondary); padding-top: 4px; font-weight: 700;">Director: Ankur Kumar</span>
      </div>
    </div>
  `;
};

/* ================= 4. TEACHER NOTICE PUBLISHER ================= */
async function handlePublishNotice(e) {
  e.preventDefault();
  const title = document.getElementById('noticeTitleInput').value.trim();
  const body = document.getElementById('noticeBodyInput').value.trim();

  if (!title || !body) {
    alert("Please enter both notice subject and body text.");
    return;
  }

  try {
    await db.collection("notices").add({
      title: title,
      body: body,
      published_by: "Faculty",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Announcement published successfully to student portal.");
    document.getElementById('noticeTitleInput').value = '';
    document.getElementById('noticeBodyInput').value = '';

    if (typeof window.loadStudentNoticesFeed === 'function') {
      window.loadStudentNoticesFeed();
    }
  } catch (err) {
    alert("Failed to publish notice: " + err.message);
  }
}
