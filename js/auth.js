// Authentication & Credential Protection Engine (Assent Public School)

const DEFAULT_FACULTY_PASS = "pass";
const DEFAULT_ADMIN_PASS = "pass";

/* ================= 1. TEACHER PORTAL AUTHENTICATION ================= */
const teacherAuthModal = document.getElementById('teacherAuthModal');
const teacherPasswordInput = document.getElementById('teacherPasswordInput');

window.openTeacherAuthModal = function() {
  if (teacherPasswordInput) {
    teacherPasswordInput.value = '';
    // Block browser caching attributes
    teacherPasswordInput.setAttribute('autocomplete', 'new-password');
  }
  if (teacherAuthModal) {
    teacherAuthModal.classList.add('open');
    setTimeout(() => {
      if (teacherPasswordInput) teacherPasswordInput.focus();
    }, 150);
  }
};

window.closeTeacherModal = function() {
  if (teacherAuthModal) {
    teacherAuthModal.classList.remove('open');
  }
  if (teacherPasswordInput) {
    teacherPasswordInput.value = '';
  }
};

window.verifyTeacherPassword = function() {
  if (!teacherPasswordInput) return;
  const enteredPass = teacherPasswordInput.value.trim();

  if (enteredPass === DEFAULT_FACULTY_PASS) {
    closeTeacherModal();
    if (typeof window.showTeacherDashboardView === 'function') {
      window.showTeacherDashboardView();
    }
  } else {
    alert("Authentication failed: Invalid faculty password. Please verify credentials.");
    teacherPasswordInput.value = '';
    teacherPasswordInput.focus();
  }
};

if (teacherPasswordInput) {
  teacherPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifyTeacherPassword();
    }
  });
}

/* ================= 2. ADMIN DRAWER AUTHENTICATION ================= */
const adminPortalDrawer = document.getElementById('adminPortalDrawer');
const adminPortalBtn = document.getElementById('adminPortalBtn');
const adminAuthLockScreen = document.getElementById('adminAuthLockScreen');
const adminUnlockedWorkspace = document.getElementById('adminUnlockedWorkspace');
const adminPasswordInput = document.getElementById('adminPasswordInput');

if (adminPortalBtn) {
  adminPortalBtn.addEventListener('click', () => {
    if (adminPasswordInput) {
      adminPasswordInput.value = '';
      adminPasswordInput.setAttribute('autocomplete', 'new-password');
    }
    if (adminAuthLockScreen) adminAuthLockScreen.style.display = 'block';
    if (adminUnlockedWorkspace) adminUnlockedWorkspace.style.display = 'none';
    if (adminPortalDrawer) {
      adminPortalDrawer.classList.add('open');
      setTimeout(() => {
        if (adminPasswordInput) adminPasswordInput.focus();
      }, 150);
    }
  });
}

window.closeAdminDrawer = function() {
  if (adminPortalDrawer) {
    adminPortalDrawer.classList.remove('open');
  }
  if (adminPasswordInput) {
    adminPasswordInput.value = '';
  }
};

window.verifyAdminPassword = function() {
  if (!adminPasswordInput) return;
  const enteredPass = adminPasswordInput.value.trim();

  if (enteredPass === DEFAULT_ADMIN_PASS) {
    if (adminAuthLockScreen) adminAuthLockScreen.style.display = 'none';
    if (adminUnlockedWorkspace) adminUnlockedWorkspace.style.display = 'block';

    if (typeof window.loadAdminExpenseModule === 'function') {
      window.loadAdminExpenseModule();
    }
  } else {
    alert("Access Denied: Invalid administrative password.");
    adminPasswordInput.value = '';
    adminPasswordInput.focus();
  }
};

if (adminPasswordInput) {
  adminPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifyAdminPassword();
    }
  });
}
