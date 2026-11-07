// Firebase Configuration & Service Initialization
const firebaseConfig = {
  apiKey: "AIzaSyAq9vIJtCIqVl52Pak59DpAgaBhTumtOaI",
  authDomain: "assent-public-school.firebaseapp.com",
  projectId: "assent-public-school",
  storageBucket: "assent-public-school.appspot.com",
  messagingSenderId: "747815981128",
  appId: "1:747815981128:web:6e0d9ad492a952e624c87d"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Enable Local Offline Persistence
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple browser tabs open.');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline storage persistence.');
  }
});

// Network Connectivity Monitor
const netStatusIndicator = document.getElementById('netStatusIndicator');
window.addEventListener('online', () => {
  if (netStatusIndicator) {
    netStatusIndicator.innerText = "🟢 Online";
    netStatusIndicator.style.background = "#166534";
  }
});
window.addEventListener('offline', () => {
  if (netStatusIndicator) {
    netStatusIndicator.innerText = "🟡 Offline Mode";
    netStatusIndicator.style.background = "#854d0e";
  }
});

/* ================= 1. VIEW ROUTING CONTROLLERS ================= */
window.navigateToHome = function() {
  document.getElementById('homePortalView').style.display = 'block';
  document.getElementById('studentLookupView').style.display = 'none';
  document.getElementById('studentDashboardView').style.display = 'none';
  document.getElementById('teacherDashboardView').style.display = 'none';
};

window.showStudentLookupView = function() {
  document.getElementById('homePortalView').style.display = 'none';
  document.getElementById('studentLookupView').style.display = 'block';
  document.getElementById('studentDashboardView').style.display = 'none';
  document.getElementById('teacherDashboardView').style.display = 'none';
};

window.showStudentDashboardView = function() {
  document.getElementById('homePortalView').style.display = 'none';
  document.getElementById('studentLookupView').style.display = 'none';
  document.getElementById('studentDashboardView').style.display = 'block';
  document.getElementById('teacherDashboardView').style.display = 'none';
};

window.showTeacherDashboardView = function() {
  document.getElementById('homePortalView').style.display = 'none';
  document.getElementById('studentLookupView').style.display = 'none';
  document.getElementById('studentDashboardView').style.display = 'none';
  document.getElementById('teacherDashboardView').style.display = 'block';
  
  if (typeof window.initTeacherWorkspace === 'function') {
    window.initTeacherWorkspace();
  }
};

/* ================= 2. SUB-TAB SWITCHING HELPERS ================= */
// Student Workspace Tabs
window.switchStudentTab = function(tabId, btn) {
  document.querySelectorAll('.student-tab-panel').forEach(p => p.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('#studentDashboardView .sub-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
};

// Teacher Workspace Tabs
window.switchTeacherTab = function(tabId, btn) {
  document.querySelectorAll('.teacher-tab-panel').forEach(p => p.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('#teacherDashboardView .sub-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Trigger respective module loaders if present
  if (tabId === 'tabTeacherAttendance' && typeof window.loadDailyAttendanceRoster === 'function') {
    window.loadDailyAttendanceRoster();
  }
  if (tabId === 'tabTeacherMarksheet' && typeof window.setupMarksheetWorkspace === 'function') {
    window.setupMarksheetWorkspace();
  }
  if (tabId === 'tabTeacherAddStudent' && typeof window.loadTeacherRosterList === 'function') {
    window.loadTeacherRosterList();
  }
};

// Student Notice Sub-view Switcher
window.switchNoticeSubView = function(deckId, btn) {
  document.querySelectorAll('.deck-container').forEach(d => d.style.display = 'none');
  const target = document.getElementById(deckId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.deck-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
};
