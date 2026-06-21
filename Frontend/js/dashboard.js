document.addEventListener('DOMContentLoaded', () => {
  // Guard clause to prevent anonymous route browsing
  const token = localStorage.getItem('virs_token');
  if (!token) {
    window.location.href = 'sign_in.html';
    return;
  }

  /* ── Animate progress bars ──────────────────────────── */
  document.querySelectorAll('.progress-bar').forEach(bar => {
    const target = bar.style.getPropertyValue('--w') || '0%';
    bar.style.width = '0';
    void bar.offsetWidth; 
    bar.style.width = target;
  });

  /* ── Recover authenticated browser metadata ─────────── */
  const role = localStorage.getItem('virs_role') || 'student';
  const username = localStorage.getItem('virs_username') || 'Student Account';

  const badgeEl = document.getElementById('nav-role-badge');
  const nameEl  = document.getElementById('nav-username');

  if (nameEl) nameEl.textContent = username;

  if (badgeEl) {
    const labels = { student: 'Student', seller: 'Seller', boss: 'Boss' };
    badgeEl.textContent = labels[role] || 'Student';
  }
});