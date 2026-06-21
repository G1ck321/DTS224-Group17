'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('virs_token');
  const role = localStorage.getItem('virs_role');
  
  if (!token || role !== 'boss') {
    window.location.href = 'sign_in.html';
    return;
  }
  animateMiniProgressBars();
});

function animateMiniProgressBars() {
  document.querySelectorAll('.mini-progress-bar').forEach(bar => {
    const target = bar.style.getPropertyValue('--w') || '0%';
    bar.style.width = '0';
    void bar.offsetWidth;
    bar.style.width = target;
  });
}

function adminAction(type, name) {
  const messages = {
    edit:       `Editing record for ${name}… (Backend connection verified)`,
    refund:     `Refund workflow initialized for ${name}. Ledger tracking active.`,
    delete:     `Drop request for ${name} dispatched to database pool.`,
    restock:    `Restock transaction triggered for ${name}. Inventory modification active.`,
    'edit-stock': `Opening direct stock quantity override adjustment matrix for ${name}.`,
  };

  const icons = {
    edit:         'ti-edit',
    refund:       'ti-rotate-clockwise',
    delete:       'ti-trash',
    restock:      'ti-package',
    'edit-stock': 'ti-edit',
  };

  showToast(icons[type] || 'ti-info-circle', messages[type] || 'Action authorized.');
}

function showToast(iconClass, message) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.innerHTML = `<i class="ti ${iconClass}" aria-hidden="true"></i> ${message}`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}