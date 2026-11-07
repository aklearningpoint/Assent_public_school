// Student Controller & State Manager (Assent Public School)

let currentActiveStudent = null;

document.addEventListener('DOMContentLoaded', () => {
  const lookupForm = document.getElementById('studentLookupForm');
  if (lookupForm) {
    lookupForm.addEventListener('submit', handleStudentLookup);
  }
});

async function handleStudentLookup(e) {
  e.preventDefault();
  const studentClass = document.getElementById('lookupStudentClass').value;
  const rollNumber = parseInt(document.getElementById('lookupStudentRoll').value);

  if (isNaN(rollNumber) || rollNumber < 1) {
    alert("Please enter a valid numeric Roll Number.");
    return;
  }

  try {
    const studentQuery = await db.collection("students")
      .where("class", "==", studentClass)
      .where("roll_no", "==", rollNumber)
      .limit(1)
      .get();

    if (studentQuery.empty) {
      alert(`No record found for Roll No: ${rollNumber} in ${studentClass}. Please verify your class and roll number.`);
      return;
    }

    const studentDoc = studentQuery.docs[0];
    currentActiveStudent = {
      id: studentDoc.id,
      ...studentDoc.data()
    };

    renderStudentDashboard(currentActiveStudent);
    if (typeof window.showStudentDashboardView === 'function') {
      window.showStudentDashboardView();
    }
  } catch (error) {
    console.error("Student Lookup Error:", error);
    alert("An error occurred while connecting to the database: " + error.message);
  }
}

function renderStudentDashboard(student) {
  // Bind Header Profile Details
  const dispName = document.getElementById('dispStudentName');
  const dispClass = document.getElementById('dispStudentClass');
  const dispRoll = document.getElementById('dispStudentRoll');
  const dispReg = document.getElementById('dispStudentReg');

  if (dispName) dispName.innerText = student.name || "N/A";
  if (dispClass) dispClass.innerText = student.class || "N/A";
  if (dispRoll) dispRoll.innerText = student.roll_no || "N/A";
  if (dispReg) dispReg.innerText = student.register_no || "Pending";

  // Trigger ID Card Renderer
  if (typeof window.renderStudentIdCard === 'function') {
    window.renderStudentIdCard(student);
  }

  // Populate Edit Details Profile Form
  if (typeof window.populateEditProfileForm === 'function') {
    window.populateEditProfileForm(student);
  }

  // Load Notices & Examination Suite
  if (typeof window.loadStudentNoticesFeed === 'function') {
    window.loadStudentNoticesFeed();
  }
  if (typeof window.loadStudentExamProgramme === 'function') {
    window.loadStudentExamProgramme(student.class);
  }
  if (typeof window.loadStudentAdmitCardView === 'function') {
    window.loadStudentAdmitCardView(student);
  }

  // Load Results Module
  if (typeof window.loadStudentResultsFeed === 'function') {
    window.loadStudentResultsFeed(student);
  }

  // Load Student Fee Ledger & Payment Scanner
  if (typeof window.setupStudentFeeState === 'function') {
    window.setupStudentFeeState(student);
  }

  // Reset to first tab
  if (typeof window.switchStudentTab === 'function') {
    window.switchStudentTab('tabIdCard', document.querySelector('#studentDashboardView .sub-tab-btn'));
  }
}

window.getCurrentActiveStudent = function() {
  return currentActiveStudent;
};

window.setCurrentActiveStudent = function(updatedStudent) {
  currentActiveStudent = updatedStudent;
  renderStudentDashboard(currentActiveStudent);
};
