let currentRole = 'student';

const labelMap = {
  student: { label: 'Student ID / Matric number', placeholder: 'e.g. 24CG000001' },
  seller:  { label: 'Staff username',             placeholder: 'e.g. SELLER_JOHN'   },
  boss:    { label: 'Admin username',             placeholder: 'e.g. ADMIN_01'          },
};

/* ── Switch role tab ─────────────────────────────────── */
function setTab(role) {
  currentRole = role;

  ['student', 'seller', 'boss'].forEach(r => {
    const el = document.getElementById('tab-' + r);
    el.classList.toggle('active', r === role);
    el.setAttribute('aria-selected', r === role);
  });

  const { label, placeholder } = labelMap[role];
  document.getElementById('id-label').textContent = label;
  document.getElementById('login-id').placeholder = placeholder;
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
  clearError();
}

/* ── Handle form submit ──────────────────────────────── */
function handleSignIn(e) {
  e.preventDefault();
  clearError();

  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;

  if (!id || !pw) {
    showError('Please fill in both fields.');
    return;
  }

  // Animate button to loading state
  const btn  = document.getElementById('signin-btn');
  const text = document.getElementById('btn-text');
  const icon = document.getElementById('btn-icon');

  addRipple(btn, e);
  text.textContent = 'Signing in…';
  icon.className = 'ti ti-loader spinning';
  btn.disabled = true;

  setTimeout(() => {
    btn.disabled = false;
    text.textContent = 'Sign in';
    icon.className = 'ti ti-arrow-right';


    if (currentRole === 'student') {
      window.location.href = 'dashboard.html';
    } else if (currentRole === 'seller') {
      // Your teammate's page — update this href when ready
      window.location.href = 'staff_dashboard.html';
    } else if (currentRole === 'boss') {
      // Your teammate's page — update this href when ready
      window.location.href = 'admin_dashboard.html';
    }
  }, 800);
}

/* ── Quick demo login shortcuts ─────────────────────── */
function quickLogin(role) {
  setTab(role);
  const fills = { student: '24CG000001', seller: 'SELLER_JOHN', boss: 'ADMIN_01' };
  document.getElementById('login-id').value = fills[role];
  document.getElementById('login-pw').value = 'password';

  setTimeout(() => {
    if (role === 'student') window.location.href = 'dashboard.html';
    else if (role === 'seller') window.location.href = 'staff_dashboard.html';
    else if (role === 'boss')   window.location.href = 'admin_dashboard.html';
  }, 300);
}

/* ── Password visibility toggle ─────────────────────── */
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

/* ── Error helpers ───────────────────────────────────── */
function showError(msg) {
  document.getElementById('form-error').textContent = msg;
}

function clearError() {
  document.getElementById('form-error').textContent = '';
}

/* ── Ripple effect ───────────────────────────────────── */
function addRipple(btn, e) {
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