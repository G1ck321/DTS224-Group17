document.addEventListener('DOMContentLoaded', () => {

  /* ── Animate progress bars ──────────────────────────── */
  document.querySelectorAll('.progress-bar').forEach(bar => {
    // Reset width so animation replays cleanly
    const target = bar.style.getPropertyValue('--w') || '0%';
    bar.style.width = '0';
    void bar.offsetWidth; // force reflow
    bar.style.width = target;
  });

  /* ── Demo: read role from sessionStorage if set ─────── */
  // signin.js can store the role before redirecting.
  // Your team can expand this to carry real user data.
  const role = sessionStorage.getItem('virs_role') || 'student';
  const name = sessionStorage.getItem('virs_name') || 'Chukwuemeka A.';

  const badgeEl = document.getElementById('nav-role-badge');
  const nameEl  = document.getElementById('nav-username');

  if (nameEl)  nameEl.textContent = name;

  if (badgeEl) {
    const labels = { student: 'Student', seller: 'Seller', boss: 'Boss' };
    badgeEl.textContent = labels[role] || 'Student';
  }

});