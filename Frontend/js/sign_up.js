// js/signup.js
let chosenRole = 'student';

const schemaMap = {
  student: { label: 'Student ID / Matric number', placeholder: 'e.g. 24CG000001', backendRole: 'Student' },
  seller:  { label: 'Staff username',             placeholder: 'e.g. SELLER_JOHN',   backendRole: 'Seller' },
  boss:    { label: 'Admin username',             placeholder: 'e.g. ADMIN_01',      backendRole: 'Boss' },
};

function setSignupRole(role) {
  chosenRole = role;
  ['student', 'seller', 'boss'].forEach(r => {
    const el = document.getElementById('tab-' + r);
    if (el) {
      el.classList.toggle('active', r === role);
      el.setAttribute('aria-selected', r === role);
    }
  });

  const { label, placeholder } = schemaMap[role];
  document.getElementById('id-label').textContent = label;
  document.getElementById('signup-id').placeholder = placeholder;
  clearNotification();
}

function handleSignUp(e) {
  e.preventDefault();
  clearNotification();

  const id = document.getElementById('signup-id').value.trim();
  const pw = document.getElementById('signup-pw').value;

  if (!id) {
    showNotification('Username/ID field is required.', '#ef4444');
    return;
  }

  const btn = document.getElementById('signup-btn');
  const text = document.getElementById('btn-text');
  const icon = document.getElementById('btn-icon');

  text.textContent = 'Registering profile…';
  if (icon) icon.className = 'ti ti-loader spinning';
  btn.disabled = true;

  // Seamless environment switching logic matching signin.js
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api/v1'
    : 'https://dts224-group17.onrender.com/api/v1';

  const payload = {
    username: id,
    role: schemaMap[chosenRole].backendRole
  };

  // Only append password property if user typed a value, otherwise server falls back to 'password'
  if (pw) {
    payload.password = pw;
  }

  fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(async res => {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    return data;
  })
  .then(data => {
    showNotification('Account created successfully! Redirecting to sign in...', '#22c55e');
    setTimeout(() => {
      window.location.href = 'sign_in.html';
    }, 2000);
  })
  .catch(err => {
    btn.disabled = false;
    if (text) text.textContent = 'Create Account';
    if (icon) icon.className = 'ti ti-user-plus';
    showNotification(err.message, '#ef4444');
  });
}

function toggleRegisterPw() {
  const input = document.getElementById('signup-pw');
  const eye = document.getElementById('pw-eye');
  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'ti ti-eye-off';
  } else {
    input.type = 'password';
    eye.className = 'ti ti-eye';
  }
}

function showNotification(msg, color) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.style.color = color;
}

function clearNotification() {
  document.getElementById('form-error').textContent = '';
}