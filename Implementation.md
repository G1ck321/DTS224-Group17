# Signup Feature — Updated Implementation Plan
**DTS224 Group 17 · VIRTS** · All decisions resolved ✅

---

## Decisions Locked In

| Question | Answer |
|---|---|
| Matric required at signup? | ✅ **Yes — mandatory** |
| Password for students? | ✅ **Yes — stored in CUSTOMER table (schema migration needed)** |
| Hall of residence at signup? | ❌ **No — optional, added from dashboard later** |
| After signup redirect? | ✅ **Sign-in page with success message** |
| Can lecturers/guests register? | ✅ **Yes — matric_no is required, but non-students won't use signup** |
| Admin/Seller signup? | ❌ **Never — provisioned by seeding only (security)** |

---

## Schema Change Required

One column must be added to `CUSTOMER`:

```sql
ALTER TABLE CUSTOMER
  ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
```

> [!NOTE]
> Existing seeded rows get an empty string — they won't be able to log in (expected, since they're test fixtures). Only users who go through the signup form will have real bcrypt hashes.

---

## How Student Login Works

The frontend already has three tabs: **STUDENT | SELLER | ADMIN**. The login payload will now include the `role` field so the backend knows which table to query:

```js
// signin.js sends:
{ username: "24CG000001", password: "pass123", role: "student" }
```

The backend branches on `role`:
- `student` → `JOIN PEOPLE + CUSTOMER WHERE matric_no = ?`
- `seller` / `boss` → `USER_ACCOUNT WHERE username = ?` (existing logic, unchanged)

JWT payload for students: `{ customer_id, matric_no, user_role: 'Student' }`

---

## Proposed Changes

### Database

#### [MODIFY] `Queries/Database.sql`
- Add `password_hash VARCHAR(255) NOT NULL DEFAULT ''` to `CUSTOMER` table definition

#### [NEW] `Queries/Migration_AddPasswordHash.sql`
- `ALTER TABLE CUSTOMER ADD COLUMN password_hash ...` — run once on live DB

---

### Backend — Controllers

#### [MODIFY] [authControllers.js](file:///c:/Users/User/Downloads/lap/DTS224/Backend/src/controllers/authControllers.js)
- **Add** `registerCustomer`:
  - Required fields: `fullname`, `email`, `phone_number`, `matric_no`, `password`
  - Transaction: `INSERT INTO PEOPLE (people_type='C')` → `INSERT INTO CUSTOMER (with bcrypt hash)`
  - 409 on duplicate `email` or `matric_no`
  - Audit log entry in `SYSTEM_ALERT_LOG`
- **Update** `loginUser`:
  - Accept `role` in request body
  - If `role === 'student'`: query `CUSTOMER JOIN PEOPLE WHERE matric_no = ?`
  - Else: existing `USER_ACCOUNT` query
  - Return unified JWT with `user_role` field

#### [NEW] `Backend/src/controllers/customerController.js`
- `getMyOrders`: GET — returns all orders for the logged-in student
  - Aggregates payments per order → total paid, balance, progress %
  - Includes product names from ORDER_LINE JOIN PRODUCT
  - Query: `ORDER_HEADER JOIN PAYMENT_LEDGER JOIN ORDER_LINE JOIN PRODUCT WHERE customer_id = ?`

---

### Backend — Routes

#### [MODIFY] [auth.js](file:///c:/Users/User/Downloads/lap/DTS224/Backend/src/routes/auth.js)
- Add: `router.post('/register', registerCustomer)`

#### [NEW] `Backend/src/routes/customers.js`
- `router.get('/me/orders', authorize('Student'), getMyOrders)`

#### [MODIFY] [app.js](file:///c:/Users/User/Downloads/lap/DTS224/Backend/src/app.js)
- Mount: `app.use('/api/v1/customers', customerRoutes)`

---

### Frontend — New Files

#### [NEW] `Frontend/HTML/sign_up.html`
- Same two-column layout as `sign_in.html`
- Left panel: branding + "Who signs up?" context bullets
- Right panel: registration form
  - Full name, Email, Phone, Matric No, Password, Confirm Password
- Link back to sign-in

#### [NEW] `Frontend/js/signup.js`
- `handleSignUp(e)` → validates → POST `/api/v1/auth/register`
- Client-side: matric format check (`/^\d{2}[A-Z]{2}\d{6}$/`), password match, required fields
- On success: show tick message → 2s → redirect to `sign_in.html`
- On error (409 duplicate, 400 missing): show inline error

#### [NEW] `Frontend/css/signup.css`
- Extends `signin.css` classes — same layout tokens
- Multi-column form grid for wider fields

---

### Frontend — Modified Files

#### [MODIFY] [sign_in.html](file:///c:/Users/User/Downloads/lap/DTS224/Frontend/HTML/sign_in.html)
- Add "Don't have an account? **Register →**" link below demo chips

#### [MODIFY] [signin.js](file:///c:/Users/User/Downloads/lap/DTS224/Frontend/js/signin.js)
- Include `role: currentRole` in the login `fetch` body
- Update success handler: student JWT now returns `user_role: 'Student'`

#### [MODIFY] [dashboard.html](file:///c:/Users/User/Downloads/lap/DTS224/Frontend/HTML/dashboard.html)
- Replace static hardcoded order cards with a dynamic container (`id="orders-container"`)
- Replace hardcoded metric values with `id`-tagged spans (total owed, paid, active count)
- Add loading skeleton state

#### [MODIFY] [dashboard.js](file:///c:/Users/User/Downloads/lap/DTS224/Frontend/js/dashboard.js)
- On load: fetch `GET /api/v1/customers/me/orders` with Bearer token
- Render orders dynamically, calculate summary metrics
- Display empty state if no orders

---

## Verification Plan

### API tests (extend main1.py)
```
POST /api/v1/auth/register    → 201 Created
POST /api/v1/auth/register    → 409 Conflict (duplicate matric)
POST /api/v1/auth/register    → 400 Bad Request (missing fields)
POST /api/v1/auth/login       → 200 + JWT (student, role=student)
GET  /api/v1/customers/me/orders → 200 + orders array (student JWT)
GET  /api/v1/customers/me/orders → 403 Forbidden (seller JWT)
```

### Manual
1. Open `sign_in.html` → see "Register →" link → navigate to `sign_up.html`
2. Fill form → submit → success → redirects to sign-in
3. Sign in as new student → dashboard loads real order data (or empty state)
4. Try duplicate matric → form shows conflict error
