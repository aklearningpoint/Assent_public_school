// Administrator Console & Institutional Expense Engine (Assent Public School)

document.addEventListener('DOMContentLoaded', () => {
  const addTeacherForm = document.getElementById('addTeacherForm');
  if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', handleAddFaculty);
  }

  const addExpenseForm = document.getElementById('addExpenseForm');
  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', handleAddExtraExpense);
  }
});

/* ================= 1. EXPENSE VIEW SWITCHER ================= */
window.switchExpenseView = function(viewId, btn) {
  document.querySelectorAll('.sub-expense-panel').forEach(p => p.style.display = 'none');
  const target = document.getElementById(viewId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('#adminUnlockedWorkspace .deck-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
};

/* ================= 2. INITIALIZE ADMIN MODULE ================= */
window.loadAdminExpenseModule = function() {
  loadFacultyPayrollList();
  loadInstitutionalExpenseLog();
  loadResultPublicationStatus();
};

/* ================= 3. TEACHER PAYROLL ENGINE ================= */
async function handleAddFaculty(e) {
  e.preventDefault();
  const nameInput = document.getElementById('teacherFullName');
  const salaryInput = document.getElementById('teacherMonthlySalary');

  const fullName = nameInput.value.trim().toUpperCase();
  const salary = parseFloat(salaryInput.value);

  if (!fullName || isNaN(salary) || salary < 0) {
    alert("Please provide valid faculty name and monthly salary.");
    return;
  }

  try {
    await db.collection("teachers").add({
      name: fullName,
      salary: salary,
      status: "Active",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    nameInput.value = '';
    salaryInput.value = '';
    alert(`Faculty member "${fullName}" registered with monthly salary ₹${salary}.`);
    loadFacultyPayrollList();
  } catch (err) {
    alert("Failed to add faculty: " + err.message);
  }
}

async function loadFacultyPayrollList() {
  const tbody = document.getElementById('adminTeacherPayrollBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Loading faculty register...</td></tr>';

  try {
    const snap = await db.collection("teachers").orderBy("name").get();
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No faculty recorded yet.</td></tr>';
      return;
    }

    let rowsHtml = '';
    snap.forEach(doc => {
      const data = doc.data();
      rowsHtml += `
        <tr>
          <td><b>${data.name}</b></td>
          <td>₹${data.salary} / month</td>
          <td>
            <button class="primary-action-btn" style="padding: 4px 10px; font-size: 0.75rem;" onclick="disburseSalary('${doc.id}', '${data.name}', ${data.salary})">Disburse</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rowsHtml;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-cell" style="color: var(--danger);">Failed to load faculty: ${err.message}</td></tr>`;
  }
}

window.disburseSalary = async function(teacherId, teacherName, salary) {
  const remark = prompt(`Disburse monthly salary (₹${salary}) to ${teacherName}?\nEnter disbursement remark:`, `Salary payment for ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`);
  if (!remark) return;

  try {
    await db.collection("expenses").add({
      category: "Faculty Salary",
      teacher_id: teacherId,
      recipient: teacherName,
      amount: salary,
      remark: remark,
      date: new Date().toISOString().split('T')[0],
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert(`Disbursement of ₹${salary} logged for ${teacherName}.`);
    loadInstitutionalExpenseLog();
  } catch (err) {
    alert("Failed to disburse salary: " + err.message);
  }
};

/* ================= 4. EXTRA EXPENSE TRACKER ================= */
async function handleAddExtraExpense(e) {
  e.preventDefault();
  const amountInput = document.getElementById('expenseAmount');
  const catInput = document.getElementById('expenseCategory');
  const remarkInput = document.getElementById('expenseRemark');

  const amount = parseFloat(amountInput.value);
  const category = catInput.value;
  const remark = remarkInput.value.trim();

  if (isNaN(amount) || amount <= 0 || !remark) {
    alert("Please enter a valid expense amount and descriptive remark.");
    return;
  }

  try {
    await db.collection("expenses").add({
      category: category,
      amount: amount,
      remark: remark,
      date: new Date().toISOString().split('T')[0],
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    amountInput.value = '';
    remarkInput.value = '';
    alert(`Operational expense of ₹${amount} under "${category}" recorded successfully.`);
    loadInstitutionalExpenseLog();
  } catch (err) {
    alert("Failed to log expense: " + err.message);
  }
}

async function loadInstitutionalExpenseLog() {
  const tbody = document.getElementById('adminExpenseLogBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Loading expense ledger...</td></tr>';

  try {
    const snap = await db.collection("expenses")
      .orderBy("created_at", "desc")
      .limit(20)
      .get();

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No institutional expenses recorded yet.</td></tr>';
      return;
    }

    let rowsHtml = '';
    snap.forEach(doc => {
      const d = doc.data();
      rowsHtml += `
        <tr>
          <td style="font-size: 0.78rem;">${d.date || 'Recent'}</td>
          <td><span style="font-size: 0.78rem; font-weight: 600; color: var(--primary);">${d.category}</span></td>
          <td style="font-size: 0.82rem;">${d.remark || '-'}</td>
          <td><b>₹${d.amount}</b></td>
        </tr>
      `;
    });
    tbody.innerHTML = rowsHtml;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-cell" style="color: var(--danger);">Failed to load expenses: ${err.message}</td></tr>`;
  }
}

/* ================= 5. RESULT PUBLICATION TOGGLE ================= */
async function loadResultPublicationStatus() {
  const toggleBtn = document.getElementById('btnToggleResultPublish');
  if (!toggleBtn) return;

  try {
    const doc = await db.collection("settings").doc("results_control").get();
    const isPublished = doc.exists ? doc.data().published : false;
    updateResultToggleUI(isPublished);
  } catch (err) {
    console.error("Status load error:", err);
  }
}

function updateResultToggleUI(isPublished) {
  const toggleBtn = document.getElementById('btnToggleResultPublish');
  if (!toggleBtn) return;

  if (isPublished) {
    toggleBtn.innerText = "Status: PUBLISHED (Visible)";
    toggleBtn.style.background = "var(--success)";
    toggleBtn.style.color = "#ffffff";
    toggleBtn.dataset.published = "true";
  } else {
    toggleBtn.innerText = "Status: LOCKED (Hidden)";
    toggleBtn.style.background = "var(--danger)";
    toggleBtn.style.color = "#ffffff";
    toggleBtn.dataset.published = "false";
  }
}

window.toggleResultPublishStatus = async function() {
  const toggleBtn = document.getElementById('btnToggleResultPublish');
  const currentState = toggleBtn.dataset.published === "true";
  const newState = !currentState;

  try {
    await db.collection("settings").doc("results_control").set({
      published: newState,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    updateResultToggleUI(newState);
    alert(`Academic results are now officially ${newState ? 'PUBLISHED and visible to students' : 'LOCKED and hidden from students'}.`);
  } catch (err) {
    alert("Failed to toggle publish status: " + err.message);
  }
};
