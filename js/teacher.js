// Faculty Central Workspace Controller (Assent Public School)

window.initTeacherWorkspace = function() {
  // Set default initial tab to Add Student
  if (typeof window.switchTeacherTab === 'function') {
    const firstTabBtn = document.querySelector('#teacherDashboardView .sub-tab-btn');
    window.switchTeacherTab('tabTeacherAddStudent', firstTabBtn);
  }

  // Bind change listeners to dynamic grade filters
  const rosterFilter = document.getElementById('teacherRosterFilterClass');
  if (rosterFilter) {
    rosterFilter.addEventListener('change', () => {
      if (typeof window.loadTeacherRosterList === 'function') {
        window.loadTeacherRosterList();
      }
    });
  }

  const attClassSelect = document.getElementById('attTargetClass');
  const attDateInput = document.getElementById('attRecordDate');
  if (attDateInput && !attDateInput.value) {
    attDateInput.value = new Date().toISOString().split('T')[0];
  }

  if (attClassSelect) {
    attClassSelect.addEventListener('change', () => {
      if (typeof window.loadDailyAttendanceRoster === 'function') {
        window.loadDailyAttendanceRoster();
      }
    });
  }

  if (attDateInput) {
    attDateInput.addEventListener('change', () => {
      if (typeof window.loadDailyAttendanceRoster === 'function') {
        window.loadDailyAttendanceRoster();
      }
    });
  }

  const marksClass = document.getElementById('marksPrepClass');
  const marksTerm = document.getElementById('marksPrepTerm');

  if (marksClass) {
    marksClass.addEventListener('change', () => {
      if (typeof window.setupMarksheetWorkspace === 'function') {
        window.setupMarksheetWorkspace();
      }
    });
  }

  if (marksTerm) {
    marksTerm.addEventListener('change', () => {
      if (typeof window.setupMarksheetWorkspace === 'function') {
        window.setupMarksheetWorkspace();
      }
    });
  }

  // Load baseline roster on launch
  if (typeof window.loadTeacherRosterList === 'function') {
    window.loadTeacherRosterList();
  }
};
