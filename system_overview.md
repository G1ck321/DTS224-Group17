# VIRS: Vendor Installment and Restock Tracking System
## System Architecture & Technical Overview

This document provides a comprehensive, beginner-friendly technical overview of the **Vendor Installment and Restock Tracking System (VIRS)** designed for **God's Wish Boutique** (an SBU Sells Unit operating inside Covenant University). 

---

## 1. System Introduction & Core Purpose
Currently, God’s Wish Boutique manages customer installment payments (layaways) manually in physical notebook logs. This manual process introduces data anomalies, risk of identity mismatch, stock double-allocation, and cash leakage. 

VIRS digitizes this workflow. Its main objective is to **minimize outstanding customer debt** while enforcing a strict business rule: **"The boutique holds the items; they cannot leave the store until they are 100% paid for."**

```
                     ┌───────────────────────────┐
                     │ Cashier logs installment  │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │ Item is reserved (Allocated Qty increases) │
             └─────────────┬─────────────┘
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ Customer pays installments over the semester    │
          └─────────────┬─────────────┘
                                   │
                                   ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Balance hits 100% -> Order Completed -> Customer collects    │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Design & 3NF Compliance
The VIRS database is designed to prevent data redundancy and update anomalies. It follows standard relational modeling guidelines (Hoffer Standard).

### A. Supertype/Subtype Hierarchy (disjoint, total specialization)
To prevent empty fields (null-value anomalies) and duplicate data, we represent humans in the system using a **Supertype/Subtype** relationship.
* **Supertype (`PEOPLE`)**: Holds shared details like `fullname`, `phone_number`, and `email`.
* **Subtype 1 (`USER_ACCOUNT`)**: Represents employees who log into the terminal. Holds authentication details (`username`, `password_hash`, `user_role`).
* **Subtype 2 (`CUSTOMER`)**: Represents buyers (students/guests). Holds specific info (`matric_no`, handles, `bank_account_no` for refunds).

```
                      ┌────────────────────────┐
                      │         PEOPLE         │ (Supertype)
                      │  (ID, Name, Phone, Email)
                      └───────────┬────────────┘
                                  │ disjoint (d)
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            ┌──────────────┐            ┌──────────────┐
            │ USER_ACCOUNT │            │   CUSTOMER   │ (Subtypes)
            │ (Role, Hash) │            │ (Matric No)  │
            └──────────────┘            └──────────────┘
```

### B. Shifting Residence (Third Normal Form - 3NF)
In a university environment, students change rooms and halls of residence every semester. If we stored `hall_name` and `room_no` directly in the `CUSTOMER` table, updating a student's room would corrupt/overwrite historical record locations for past semesters.
* **Solution**: We created a separate table `RESIDENCE_LOG` linked to `CUSTOMER` via a foreign key. Each log entry stores the location tagged to a specific `semester_code`. This isolates shifting dependencies, keeping the database in **3NF**.

### C. The Three-State Inventory Engine
To prevent the cashier terminal from showing reserved items as available for new sales (which leads to double-selling), VIRS splits stock metrics into three states:
1. **`physical_qty`**: Total units physically inside the store.
2. **`allocated_qty`**: Units physically in store but legally reserved for active customer installment plans.
3. **`available_qty`**: Dynamic calculated balance of stock open for checkout.
$$\text{available\_qty} = \text{physical\_qty} - \text{allocated\_qty}$$

---

## 3. Backend Feasibility & Design Assessment
The backend uses **Node.js (Express)** with a **MySQL** database. Below is the assessment of backend mechanisms, concurrency, and security.

### A. Concurrency Control via Row-Level Locking
If two cashiers log payments for the same student's order at the exact same moment, a race condition could occur, resulting in incorrect calculations.
* **Mechanism**: When a payment request is received, the backend opens an isolated transaction block and locks the parent order row using `FOR UPDATE`:
  ```sql
  -- The FOR UPDATE clause locks this row until the transaction commits or rolls back
  SELECT total_order_amount, customer_id, order_status 
  FROM ORDER_HEADER 
  WHERE order_id = ? FOR UPDATE;
  ```
* **Assessment**: Highly feasible and necessary. It prevents double-bookings and balance mismatches during campus rush hours.

### B. Database Constraints vs. Application Logic
A potential bottleneck is alignment between database integrity constraints and API logic.
* **Issue**: The database DDL enforces `order_status` constraints:
  ```sql
  CONSTRAINT chk_status CHECK (order_status IN ('Pending', 'Completed', 'Refunded'))
  ```
  However, the backend payment controller initially attempted to update this status to `'Fully Paid'`. This caused a database constraint failure and transaction rollback (HTTP 500 error).
* **Fix**: The backend has been corrected to set the status to `'Completed'` (which matches the database schema rules) while returning user-friendly messages stating completion.

### C. Automated Milestones & Alerts
When a customer’s payment balance crosses $80\%$ of the order total, a background alert is triggered:
```javascript
// Calculate if customer paid 80% or more of total order value
const paymentPercentage = (newTotalPaid / total_order_amount) * 100;
if (paymentPercentage >= 80.0) {
    // Write an entry into the SYSTEM_ALERT_LOG table
    await connection.execute(
        `INSERT INTO SYSTEM_ALERT_LOG (event_type, log_message, timestamp) 
         VALUES ('MILESTONE_80', ?, NOW())`,
        [`Order #${order_id} is ${paymentPercentage.toFixed(1)}% paid.`]
    );
}
```

---

## 4. Diagnostic & Seeding Fixes (main1.py Test Script)
During integration testing, several errors were encountered and successfully resolved:

1. **UnicodeEncodeError (Emoji Output Crashes)**
   * *Problem*: Standard Windows terminal command prompts use regional encodings (like `cp1252`) and crash when Python tries to print UTF-8 emojis (`❌`, `✅`, `ℹ️`).
   * *Fix*: Reconfigured Python's standard output stream to use UTF-8 at script startup:
     ```python
     if sys.platform.startswith('win'):
         sys.stdout.reconfigure(encoding='utf-8')
     ```
2. **Missing Sample Data (Empty Database Tables)**
   * *Problem*: The database tables for orders and lines were empty, leading to database foreign key constraint check failures when the test runner attempted to log a payment for order ID `101`.
   * *Fix*: Re-seeded the database using the complete relational SQL DDL and sample data rows.
3. **Idempotency & Unique Reference Conflicts**
   * *Problem*: Running the test script a second time caused a `Duplicate entry` error because the transaction payload used a static `moniepoint_ref` (`"MNP-PYTHON-TEST-99"`).
   * *Fix*: Appended a dynamic timestamp suffix to the reference in `test/main1.py`:
     ```python
     import time
     payment_payload["moniepoint_ref"] = f"MNP-PYTHON-TEST-{int(time.time())}"
     ```

---

## 5. Minimal UI Changes Related to Backend Needs
To interact with these backend features, the cashier and student user interfaces require only minimal changes:

1. **Unique Reference Inputs (Cashier Dashboard)**
   * When accepting Moniepoint card/transfer payments, the cashier UI must enforce entering a unique POS transaction reference string (e.g., printed on the Moniepoint slip).
2. **Milestone Progress Indication (Student Portal)**
   * The student dashboard should show a progress bar calculated as `(amount_paid / total_order_amount) * 100`. Highlight the progress bar in green once it crosses `80%`, signaling they are approaching full collection eligibility.
3. **Locked Order States (UI Handling)**
   * When the API returns a `400 Bad Request` with an error message indicating the order is completed (e.g., `"Order is already Completed (Fully Paid) and locked"`), the cashier UI must disable the payment input box and hide the "Process Payment" button to prevent submission.
4. **Role-Based Button Hiding**
   * Hide the "Refund" or "Modify Transaction" buttons if the logged-in user's role is `'Seller'`. Only show these buttons when a `'Boss'` account logs in, reflecting the backend authorization middleware controls.
