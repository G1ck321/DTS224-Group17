'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('virs_token');
  const role = localStorage.getItem('virs_role');
  
  if (!token || (role !== 'seller' && role !== 'boss')) {
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

function logPayment() {
  const orderId = document.getElementById('pay-order-id').value.trim();
  const amount  = document.getElementById('pay-amount').value.trim();
  const method  = document.getElementById('pay-method').value;
  const ref     = document.getElementById('pay-ref').value.trim();

  if (!orderId || !amount || !method) {
    shakeBtn();
    alert('Please fulfill all mandatory transaction parameters.');
    return;
  }

  // Database-to-UI Translation Layer (Enforces database CHECK constraints)
  let complianceMethod = 'Cash';
  if (method === 'card') complianceMethod = 'POS';
  if (method === 'transfer') complianceMethod = 'Transfer';

  const btn = document.querySelector('.btn-log');
  const txt = document.getElementById('log-btn-text');

  txt.textContent = 'Logging transaction…';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  fetch('http://localhost:5000/api/v1/payments/log', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('virs_token')}`
    },
    body: JSON.stringify({ 
      order_id: orderId, 
      amount_paid: Number(amount), 
      payment_method: complianceMethod, 
      moniepoint_ref: complianceMethod === 'Cash' ? null : ref 
    })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(err => { throw new Error(err.error || 'Ledger insertion rejected.'); });
    }
    return res.json();
  })
  .then(data => {
    btn.disabled = false;
    btn.style.opacity = '1';
    txt.textContent = 'Log payment';

    appendTodayRow(orderId, ref || 'CASH_TX', complianceMethod, amount);

    const success = document.getElementById('log-success');
    if (success) {
      success.style.display = 'block';
      setTimeout(() => success.style.display = 'none', 4000);
    }

    document.getElementById('pay-order-id').value = '';
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-method').value = '';
    document.getElementById('pay-ref').value = '';
  })
  .catch(err => {
    btn.disabled = false;
    btn.style.opacity = '1';
    txt.textContent = 'Log payment';
    alert(`Error: ${err.message}`);
    shakeBtn();
  });
}

function appendTodayRow(orderId, ref, method, amount) {
  const tbody = document.getElementById('today-payments-body');
  if (!tbody) return;
  const now   = new Date();
  const time  = now.toTimeString().slice(0, 5);
  const formatted = Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0 });

  const row = document.createElement('tr');
  row.style.animation = 'slideUp 0.35s ease both';
  row.innerHTML = `
    <td>New Customer Entry</td>
    <td class="mono-cell">#${orderId.replace(/^#/, '')}</td>
    <td class="mono-cell">${ref || '—'}</td>
    <td><span class="method-chip">${method}</span></td>
    <td class="col-right ok fw">&#8358;${formatted}</td>
    <td class="mono-cell">${time}</td>
  `;
  tbody.appendChild(row);
}

function shakeBtn() {
  const btn = document.querySelector('.btn-log');
  if (!btn) return;
  btn.style.animation = 'shake 0.4s ease';
  btn.addEventListener('animationend', () => { btn.style.animation = ''; }, { once: true });
}

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