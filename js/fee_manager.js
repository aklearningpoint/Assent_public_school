// Fee Manager & Dynamic UPI Payment Engine (Assent Public School)

const SCHOOL_UPI_ID = "assentpublic@upi";
const SCHOOL_PAYEE_NAME = "Assent Public School";

const studentPaymentModal = document.getElementById('studentPaymentModal');
const upiQrHolder = document.getElementById('upiQrCodeHolder');
const dispSchoolUpiId = document.getElementById('dispSchoolUpiId');
const feeLedgerBody = document.getElementById('studentFeeLedgerBody');

window.setupStudentFeeState = function(student) {
  if (!student) return;
  if (dispSchoolUpiId) {
    dispSchoolUpiId.innerText = SCHOOL_UPI_ID;
  }
};

window.openPaymentModal = function() {
  const currentStudent = typeof window.getCurrentActiveStudent === 'function' ? window.getCurrentActiveStudent() : null;
  if (!currentStudent) {
    alert("Please log in to your student profile first.");
    return;
  }

  if (studentPaymentModal) {
    studentPaymentModal.classList.add('open');
    generateStudentUpiQr(currentStudent);
    loadDatewiseFeeLedger(currentStudent);
  }
};

window.closePaymentModal = function() {
  if (studentPaymentModal) {
    studentPaymentModal.classList.remove('open');
  }
};

// Generate live dynamic UPI payment QR
function generateStudentUpiQr(student) {
  if (!upiQrHolder) return;
  upiQrHolder.innerHTML = '';

  const studentRoll = student.roll_no || 0;
  const studentClass = student.class || '';
  const dueAmount = student.pending_dues !== undefined ? student.pending_dues : (student.monthly_fee || 450);

  // Valid UPI standard payment URI specification
  const note = `Tuition Fee - ${student.name} (${studentClass} Roll ${studentRoll})`;
  const upiUri = `upi://pay?pa=${encodeURIComponent(SCHOOL_UPI_ID)}&pn=${encodeURIComponent(SCHOOL_PAYEE_NAME)}&am=${dueAmount}&tn=${encodeURIComponent(note)}&cu=INR`;
  const encodedUri = encodeURIComponent(upiUri);

  const qrImg = document.createElement('img');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodedUri}&margin=2`;
  qrImg.alt = "UPI Payment Scanner";

  qrImg.onerror = function() {
    upiQrHolder.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px;">
        Scan via UPI App using ID:<br><b style="color: var(--primary);">${SCHOOL_UPI_ID}</b>
      </div>
    `;
  };

  upiQrHolder.appendChild(qrImg);
}

// Load date-wise transaction and ledger records
async function loadDatewiseFeeLedger(student) {
  if (!feeLedgerBody) return;
  feeLedgerBody.innerHTML = '<tr><td colspan="4" class="empty-cell">Retrieving ledger statement...</td></tr>';

  try {
    const snap = await db.collection("fee_records")
      .where("student_id", "==", student.id)
      .orderBy("date", "desc")
      .get();

    if (snap.empty) {
      // Fallback baseline ledger record
      const defaultMonthly = student.monthly_fee || 450;
      const statusClass = student.fee_status === 'Paid' ? 'badge-status-paid' : 'badge-status-unpaid';
      feeLedgerBody.innerHTML = `
        <tr>
          <td>Current Session</td>
          <td>Monthly Tuition Fee</td>
          <td>₹${defaultMonthly}</td>
          <td><span class="${statusClass}">${student.fee_status || 'Unpaid'}</span></td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    snap.forEach(doc => {
      const data = doc.data();
      let badgeClass = 'badge-status-unpaid';
      if (data.status === 'Paid') badgeClass = 'badge-status-paid';
      if (data.status === 'Partial') badgeClass = 'badge-status-partial';

      rowsHtml += `
        <tr>
          <td>${data.date || 'Recent'}</td>
          <td>${data.particulars || 'Monthly Tuition'}</td>
          <td>₹${data.amount || 0}</td>
          <td><span class="${badgeClass}">${data.status}</span></td>
        </tr>
      `;
    });
    feeLedgerBody.innerHTML = rowsHtml;
  } catch (err) {
    // If complex index is pending, show student root fee parameters
    const defaultMonthly = student.monthly_fee || 450;
    const statusClass = student.fee_status === 'Paid' ? 'badge-status-paid' : 'badge-status-unpaid';
    feeLedgerBody.innerHTML = `
      <tr>
        <td>Current Month</td>
        <td>Tuition Fee Ledger</td>
        <td>₹${defaultMonthly}</td>
        <td><span class="${statusClass}">${student.fee_status || 'Unpaid'}</span></td>
      </tr>
    `;
  }
}
