'use strict';

document.addEventListener('DOMContentLoaded', () => {
  animateMiniProgressBars();
});

/* ── Animate mini bars ───────────────────────────────── */
function animateMiniProgressBars() {
  document.querySelectorAll('.mini-progress-bar').forEach(bar => {
    const target = bar.style.getPropertyValue('--w') || '0%';
    bar.style.width = '0';
    void bar.offsetWidth;
    bar.style.width = target;
  });
}

/* ── Admin action handler (edit / refund / delete) ──── */
function adminAction(type, name) {
  const messages = {
    edit:       `Editing record for ${name}… (connect to backend to enable real edits)`,
    refund:     `Refund process started for ${name}. Awaiting confirmation.`,
    delete:     `Delete request for ${name} queued. Confirm in a real backend.`,
    restock:    `Restock order triggered for ${name}. Log the delivery when it arrives.`,
    'edit-stock': `Stock adjustment panel for ${name} — connect to backend.`,
  };

  const icons = {
    edit:         'ti-edit',
    refund:       'ti-rotate-clockwise',
    delete:       'ti-trash',
    restock:      'ti-package',
    'edit-stock': 'ti-edit',
  };

  showToast(icons[type] || 'ti-info-circle', messages[type] || 'Action triggered.');
}

/* ── Toast notification ──────────────────────────────── */
let toastTimer = null;

function showToast(iconClass, message) {
  const toast = document.getElementById('admin-toast');
  toast.innerHTML = `<i class="ti ${iconClass}" aria-hidden="true"></i> ${message}`;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* Inject shake keyframe shared with staff */
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;
document.head.appendChild(style);