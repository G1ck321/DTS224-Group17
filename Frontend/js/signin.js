let currentRole = 'student';

const labelMap = {
  student: { label: 'Student ID / Matric number', placeholder: 'e.g. 24CG000001' },
  seller:  { label: 'Staff username',             placeholder: 'e.g. SELLER_JOHN'   },
  boss:    { label: 'Admin username',             placeholder: 'e.g. ADMIN_01'      },
};

function setTab(role) {
  currentRole = role;
  ['student', 'seller', 'boss'].forEach(r => {
    const el = document.getElementById('tab-' + r);
    if (el) {
      el.classList.toggle('active', r === role);
      el.setAttribute('aria-selected', r === role);
    }
  });

  const { label, placeholder } = labelMap[role];
  document.getElementById('id-label').textContent = label;
  document.getElementById('login-id').placeholder = placeholder;
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
  clearError();
}

function handleSignIn(e) {
  e.preventDefault();
  clearError();

  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;

  if (!id || !pw) {
    showError('Please fill in both fields.');
    return;
  }

  const btn  = document.getElementById('signin-btn');
  const text = document.getElementById('btn-text');
  const icon = document.getElementById('btn-icon');

  addRipple(btn, e);
  text.textContent = 'Signing in…';
  icon.className = 'ti ti-loader spinning';
  btn.disabled = true;

  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api/v1'
  : 'https://virts-backend.onrender.com/api/v1';
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: id, password: pw })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error('Authentication failed. Check your credentials.');
    }
    return res.json();
  })
  .then(data => {
    // Standardize all browser memory items under uniform storage keys
    localStorage.setItem('virs_token', data.token);
    localStorage.setItem('virs_role', data.user.role.toLowerCase()); 
    localStorage.setItem('virs_username', data.user.username);

    // Dynamic routing driven by secure backend metadata
    if (data.user.role === 'Student' || currentRole === 'student') {
      window.location.href = 'dashboard.html';
    } else if (data.user.role === 'Seller') {
      window.location.href = 'staff_dashboard.html';
    } else if (data.user.role === 'Boss') {
      window.location.href = 'admin_dashboard.html';
    }
  })
  .catch(err => {
    btn.disabled = false;
    if (text) text.textContent = 'Sign in';
    if (icon) icon.className = 'ti ti-arrow-right';
    showError(err.message || 'Could not connect to the authentication server.');
  });
}

function quickLogin(role) {
  setTab(role);
  const fills = { student: '24CG000001', seller: 'SELLER_JOHN', boss: 'ADMIN_01' };
  document.getElementById('login-id').value = fills[role];
  document.getElementById('login-pw').value = 'password';
}

function togglePw() {
  const input = document.getElementById('login-pw');
  const eye   = document.getElementById('pw-eye');
  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'ti ti-eye-off';
  } else {
    input.type = 'password';
    eye.className = 'ti ti-eye';
  }
}

function showError(msg) { document.getElementById('form-error').textContent = msg; }
function clearError() { document.getElementById('form-error').textContent = ''; }

function addRipple(btn, e) {
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x    = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
  const y    = (e.clientY || rect.top  + rect.height / 2) - rect.top  - size / 2;
  const span = document.createElement('span');
  span.className = 'ripple';
  span.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
}