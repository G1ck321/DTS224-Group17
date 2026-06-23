// js/dashboard.js
fetch('https://dts224-group17.onrender.com/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'SELLER_JOHN', password: 'password' })
})
.then(res => res.json())
.then(data => console.log("Server response:", data))
.catch(err => console.error("Network Error:", err));
document.addEventListener('DOMContentLoaded', () => {
  // Guard clause to verify authentication state before loading dashboard components
  const token = localStorage.getItem('virs_token');
  if (!token) {
    window.location.href = 'sign_in.html';
    return;
  }

  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api/v1'
    : 'https://dts224-group17.onrender.com/api/v1';

  // Request structural dashboard arrays from the server
  fetch(`${API_BASE}/auth/student-profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to retrieve secure ledger details.');
    return res.json();
  })
  .then(data => {
    // Populate Student Details Info
    document.getElementById('student-name').textContent = data.profile.fullname;
    document.getElementById('student-matric').textContent = `Matric No: ${data.profile.matric_no}`;
    
    // Populate Residence log data to verify lack of transitivity
    document.getElementById('student-room').textContent = `${data.residence.hall_name}, RM ${data.residence.room_no}`;
    document.getElementById('student-semester').textContent = `Logged Term: ${data.residence.semester_code || 'Current'}`;

    // Render global aggregated financial liability calculation
    const formattedTotalBalance = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })
        .format(data.financials.total_debt_outstanding);
    document.getElementById('outstanding-balance').textContent = formattedTotalBalance;

    // Render detailed installment order row parameters
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = ''; // Wipe placeholder content

    if (data.financials.orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">No installment contracts linked to this account profile.</td></tr>`;
        return;
    }

    data.financials.orders.forEach(order => {
        const tr = document.createElement('tr');
        
        const fmtCurrency = (val) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(val);
        const dateString = new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const statusClass = order.status === 'Completed' ? 'status-completed' : 'status-pending';

        tr.innerHTML = `
            <td style="font-family: 'DM Mono', monospace; font-weight:500;">#${order.order_id}</td>
            <td>${fmtCurrency(order.total_amount)}</td>
            <td style="color:#22c55e;">${fmtCurrency(order.amount_paid)}</td>
            <td style="color:#f97316; font-weight:600;">${fmtCurrency(order.balance_due)}</td>
            <td><span class="status-badge ${statusClass}">${order.status}</span></td>
            <td style="color:#94a3b8; font-size:0.9rem;">${dateString}</td>
        `;
        tbody.appendChild(tr);
    });
  })
  .catch(err => {
    console.error(err);
    alert('Session access expired or database connection failed. Re-authenticating...');
    handleLogout();
  });
});

function handleLogout() {
  localStorage.removeItem('virs_token');
  localStorage.removeItem('virs_role');
  localStorage.removeItem('virs_username');
  window.location.href = 'sign_in.html';
}