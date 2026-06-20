'use strict';

document.addEventListener('DOMContentLoaded', () => {
  animateMiniProgressBars();
});

/* ── Animate all mini bars on load ──────────────────── */
function animateMiniProgressBars() {
  document.querySelectorAll('.mini-progress-bar').forEach(bar => {
    const target = bar.style.getPropertyValue('--w') || '0%';
    bar.style.width = '0';
    void bar.offsetWidth;
    bar.style.width = target;
  });
}

/* ── Log payment form handler ────────────────────────── */
function logPayment() {
  const orderId = document.getElementById('pay-order-id').value.trim();
  const amount  = document.getElementById('pay-amount').value.trim();
  const method  = document.getElementById('pay-method').value;
  const ref     = document.getElementById('pay-ref').value.trim();

  // Basic validation
  if (!orderId || !amount || !method || !ref) {
    shakeBtn();
    return;
  }

  const btn = document.querySelector('.btn-log');
  const txt = document.getElementById('log-btn-text');

  // Loading state
  txt.textContent = 'Logging…';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  setTimeout(() => {
    btn.disabled = false;
    btn.style.opacity = '1';
    txt.textContent = 'Log payment';

    // Append to today's table
    appendTodayRow(orderId, ref, method, amount);

    // Show success message
    const success = document.getElementById('log-success');
    success.classList.add('visible');
    setTimeout(() => success.classList.remove('visible'), 4000);

    // Clear form
    document.getElementById('pay-order-id').value = '';
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-method').value = '';
    document.getElementById('pay-ref').value = '';

  }, 800);
}

/* ── Append a new row to the today's payments table ─── */
function appendTodayRow(orderId, ref, method, amount) {
  const tbody = document.getElementById('today-payments-body');
  const now   = new Date();
  const time  = now.toTimeString().slice(0, 5);

  const formatted = Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0 });

  const row = document.createElement('tr');
  row.style.animation = 'slideUp 0.35s ease both';
  row.innerHTML = `
    <td>—</td>
    <td class="mono-cell">#${orderId.replace(/^#/, '')}</td>
    <td class="mono-cell">${ref}</td>
    <td><span class="method-chip">${capitalize(method)}</span></td>
    <td class="col-right ok fw">&#8358;${formatted}</td>
    <td class="mono-cell">${time}</td>
  `;
  tbody.appendChild(row);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ── Shake button on validation error ───────────────── */
function shakeBtn() {
  const btn = document.querySelector('.btn-log');
  btn.style.animation = 'shake 0.4s ease';
  btn.addEventListener('animationend', () => { btn.style.animation = ''; }, { once: true });
}

/* Inject shake keyframe */
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-5px); }
    40%,80% { transform: translateX(5px); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;
document.head.appendChild(style);