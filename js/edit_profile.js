// Student Profile Self-Service Editor (Assent Public School)

document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('studentEditProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }
});

window.populateEditProfileForm = function(student) {
  if (!student) return;

  const father = document.getElementById('editFatherName');
  const mother = document.getElementById('editMotherName');
  const gender = document.getElementById('editGender');
  const dob = document.getElementById('editDob');
  const reg = document.getElementById('editRegisterNo');
  const mobile1 = document.getElementById('editMobilePrimary');
  const mobile2 = document.getElementById('editMobileSecondary');
  const address = document.getElementById('editAddress');

  if (father) father.value = student.father_name || '';
  if (mother) mother.value = student.mother_name || '';
  if (gender) gender.value = student.gender || 'Male';
  if (dob) dob.value = student.dob || '';
  if (reg) reg.value = student.register_no || '';
  if (mobile1) mobile1.value = student.mobile_primary || '';
  if (mobile2) mobile2.value = student.mobile_secondary || '';
  if (address) address.value = student.address || '';
};

async function handleProfileUpdate(e) {
  e.preventDefault();

  const currentStudent = typeof window.getCurrentActiveStudent === 'function' ? window.getCurrentActiveStudent() : null;
  if (!currentStudent || !currentStudent.id) {
    alert("Session expired. Please search and select your student record again.");
    return;
  }

  const fatherName = document.getElementById('editFatherName').value.trim();
  const motherName = document.getElementById('editMotherName').value.trim();
  const gender = document.getElementById('editGender').value;
  const dob = document.getElementById('editDob').value.trim();
  const registerNo = document.getElementById('editRegisterNo').value.trim();
  const mobilePrimary = document.getElementById('editMobilePrimary').value.trim();
  const mobileSecondary = document.getElementById('editMobileSecondary').value.trim();
  const address = document.getElementById('editAddress').value.trim();

  // Validate strict DD/MM/YY format
  const dobRegex = /^\d{2}\/\d{2}\/\d{2}$/;
  if (!dobRegex.test(dob)) {
    alert("Invalid Date of Birth format. Please enter strictly as DD/MM/YY (e.g. 15/08/15).");
    return;
  }

  // Validate primary mobile number
  if (!/^\d{10}$/.test(mobilePrimary)) {
    alert("Primary contact number must be exactly 10 digits.");
    return;
  }

  // Validate optional secondary mobile number
  if (mobileSecondary && !/^\d{10}$/.test(mobileSecondary)) {
    alert("Secondary contact number must be exactly 10 digits if provided.");
    return;
  }

  const updatedPayload = {
    father_name: fatherName,
    mother_name: motherName,
    gender: gender,
    dob: dob,
    register_no: registerNo,
    mobile_primary: mobilePrimary,
    mobile_secondary: mobileSecondary || null,
    address: address,
    profile_completed: true,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("students").doc(currentStudent.id).update(updatedPayload);

    // Merge updated fields into current student state
    const refreshedStudent = {
      ...currentStudent,
      ...updatedPayload
    };

    if (typeof window.setCurrentActiveStudent === 'function') {
      window.setCurrentActiveStudent(refreshedStudent);
    }

    alert("Student profile details successfully updated and synchronized.");

    // Automatically switch back to view updated ID card
    if (typeof window.switchStudentTab === 'function') {
      window.switchStudentTab('tabIdCard', document.querySelector('#studentDashboardView .sub-tab-btn'));
    }
  } catch (error) {
    console.error("Profile update failed:", error);
    alert("Failed to save changes: " + error.message);
  }
}
