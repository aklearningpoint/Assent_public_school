// Exam Routine Planner & Timetable Publisher (Assent Public School)

document.addEventListener('DOMContentLoaded', () => {
  const routineForm = document.getElementById('examRoutinePlannerForm');
  if (routineForm) {
    routineForm.addEventListener('submit', handlePublishExamProgramme);
  }
});

async function handlePublishExamProgramme(e) {
  e.preventDefault();

  const term = document.getElementById('plannerTerm').value;
  const classRange = document.getElementById('plannerClassRange').value.trim();
  const scheduleDetails = document.getElementById('plannerScheduleDetails').value.trim();

  if (!classRange || !scheduleDetails) {
    alert("Please provide both target class range and timetable schedule details.");
    return;
  }

  try {
    await db.collection("exam_programmes").add({
      term: term,
      class_range: classRange,
      schedule: scheduleDetails,
      published_by: "Faculty Administration",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert(`Examination programme for ${term} published successfully to Student Portal.`);
    document.getElementById('plannerClassRange').value = '';
    document.getElementById('plannerScheduleDetails').value = '';

    // Refresh student feed if currently open
    if (typeof window.loadStudentExamProgramme === 'function') {
      window.loadStudentExamProgramme(classRange);
    }
  } catch (err) {
    console.error("Exam programme publish error:", err);
    alert("Failed to publish examination programme: " + err.message);
  }
}
