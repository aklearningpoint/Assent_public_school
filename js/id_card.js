// Student Identity Card & QR Verification Generator (Assent Public School)

window.renderStudentIdCard = function(student) {
  if (!student) return;

  // Bind Metadata into 9:6 Card Template
  const cardName = document.getElementById('idCardDispName');
  const cardClass = document.getElementById('idCardDispClass');
  const cardRoll = document.getElementById('idCardDispRoll');
  const cardFather = document.getElementById('idCardDispFather');
  const cardDob = document.getElementById('idCardDispDob');
  const cardMobile = document.getElementById('idCardDispMobile');
  const cardAddress = document.getElementById('idCardDispAddress');
  const photoFrame = document.getElementById('idCardPhotoFrame');

  if (cardName) cardName.innerText = student.name || "N/A";
  if (cardClass) cardClass.innerText = student.class || "N/A";
  if (cardRoll) cardRoll.innerText = student.roll_no !== undefined ? student.roll_no : "-";
  if (cardFather) cardFather.innerText = student.father_name || "Not Specified";
  if (cardDob) cardDob.innerText = student.dob || "DD/MM/YY";
  if (cardMobile) cardMobile.innerText = student.mobile_primary || "Not Provided";
  if (cardAddress) cardAddress.innerText = student.address || "Singhia Khurd, Samastipur";

  // Photo Handling
  if (photoFrame) {
    if (student.photo_url) {
      photoFrame.innerHTML = `<img src="${student.photo_url}" alt="Student Photo">`;
    } else {
      photoFrame.innerHTML = `<span class="photo-placeholder-text">STUDENT PHOTO</span>`;
    }
  }

  // Generate Verification QR Code
  generateStudentVerificationQR(student);
};

function generateStudentVerificationQR(student) {
  const qrBox = document.getElementById('studentIdQrCode');
  if (!qrBox) return;

  qrBox.innerHTML = '';

  // Formulate official verification payload
  const payload = `APS-ID|${student.class}|ROLL:${student.roll_no}|REG:${student.register_no || 'NA'}|${student.name}`;
  const encodedPayload = encodeURIComponent(payload);

  // High-reliability direct QR API with graceful offline fallback
  const qrImg = document.createElement('img');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodedPayload}&margin=2`;
  qrImg.alt = "ID Verification QR";
  
  qrImg.onerror = function() {
    // Clean SVG fallback if device is strictly offline
    qrBox.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 100 100" fill="#1e3a8a">
        <rect x="10" y="10" width="30" height="30" fill="#1e3a8a"/>
        <rect x="60" y="10" width="30" height="30" fill="#1e3a8a"/>
        <rect x="10" y="60" width="30" height="30" fill="#1e3a8a"/>
        <rect x="18" y="18" width="14" height="14" fill="#ffffff"/>
        <rect x="68" y="18" width="14" height="14" fill="#ffffff"/>
        <rect x="18" y="68" width="14" height="14" fill="#ffffff"/>
        <rect x="50" y="45" width="10" height="10" fill="#1e3a8a"/>
        <rect x="70" y="65" width="15" height="15" fill="#1e3a8a"/>
      </svg>
    `;
  };

  qrBox.appendChild(qrImg);
}
