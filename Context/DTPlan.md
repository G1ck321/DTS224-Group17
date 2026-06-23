Think of it as three layers:

Frontend (React/HTML)
        ↓
Backend (Node/Express)
        ↓
MySQL Database

The frontend should never directly check the database.

Instead:

User clicks button
       ↓
Frontend calls API
       ↓
Backend validates rules
       ↓
Database updates
       ↓
Backend sends response
       ↓
Frontend updates UI


---

Example 1: Student Checks Installment Status

Frontend:

async function checkBalance() {

    const matricNo = "23CD123456";

    const response = await fetch(
        `/api/customers/${matricNo}/status`
    );

    const data = await response.json();

    console.log(data);
}

Backend:

app.get(
    '/api/customers/:matricNo/status',
    getInstallmentStatus
);

Backend Query:

SELECT
    total_order_amount,
    SUM(amount_paid)
FROM ...

Response:

{
  "orderId": 1,
  "total": 10000,
  "paid": 8000,
  "percentage": 80
}

Frontend displays:

80% Paid
Outstanding Balance: ₦2000


---

Example 2: Automatically Detect 80%

After every payment:

await insertPayment();

await checkPaymentStatus();

Check:

const percent =
    (totalPaid / totalAmount) * 100;

If:

percent >= 80

create a notification:

await db.execute(`
INSERT INTO NOTIFICATION_QUEUE(
    customer_id,
    notification_type,
    message
)
VALUES(?,?,?)
`,
[
    customerId,
    'PAYMENT_THRESHOLD',
    'You are 80% complete'
]);


---

Why a Queue?

Never do:

Receive Payment
       ↓
Call Telegram
       ↓
Wait 5 seconds
       ↓
Save Payment

Bad.

Instead:

Receive Payment
       ↓
Save Payment
       ↓
Create Queue Record
       ↓
Respond Immediately

Later:

Background Worker
       ↓
Reads Queue
       ↓
Sends Telegram

This scales.


---

Example Queue Table

CREATE TABLE NOTIFICATION_QUEUE(

    queue_id INT AUTO_INCREMENT,

    customer_id INT,

    message TEXT,

    status VARCHAR(20)
    DEFAULT 'PENDING',

    PRIMARY KEY(queue_id)
);


---

Example 3: Low Stock Alert

Whenever stock changes:

await updateInventory();

await checkLowStock(productId);

Check:

available =
physical_qty -
allocated_qty;

If:

available <= 0

Insert alert:

INSERT INTO SYSTEM_ALERT_LOG(
    event_type,
    log_message
)
VALUES(
    'OUT_OF_STOCK',
    'Corporate Shirt exhausted'
);


---

Admin Dashboard

Frontend calls:

GET /api/alerts

Backend:

SELECT *
FROM SYSTEM_ALERT_LOG
ORDER BY timestamp DESC

Frontend:

Out of Stock:
Corporate Shirt

Installment Completed:
Order #45


---

Example 4: Prevent Pickup Before Full Payment

Suppose seller tries:

POST /pickup/45

Backend:

const paid =
sumPayments(orderId);

const total =
orderTotal(orderId);

if(paid < total){

    return res.status(400).json({
        error:
        "Outstanding balance exists"
    });
}

Only allow:

paid >= total


---

Example 5: Prevent Seller From Refunding

Middleware:

function authorize(role){

    return (req,res,next)=>{

        if(req.user.role !== role){

            return res.status(403).json({
                error:"Forbidden"
            });
        }

        next();
    };
}

Route:

router.post(
    '/refund/:id',
    authorize('Boss'),
    refundOrder
);

Seller gets:

{
  "error":"Forbidden"
}

Boss gets:

{
  "message":"Refund Approved"
}


---

Better Architecture: Let MySQL Help

For some alerts, use database triggers.

Example:

CREATE TRIGGER low_stock_trigger
AFTER UPDATE
ON INVENTORY_STOCK
FOR EACH ROW
BEGIN

IF (
    NEW.physical_qty -
    NEW.allocated_qty
) <= 0 THEN

INSERT INTO SYSTEM_ALERT_LOG(
    event_type,
    log_message
)
VALUES(
    'OUT_OF_STOCK',
    CONCAT(
        'Product ',
        NEW.product_id,
        ' exhausted'
    )
);

END IF;

END;

Now:

Inventory Updated
       ↓
Trigger Fires Automatically
       ↓
Alert Written

No Node code needed.


---

Real-World Architecture

For your project I would split responsibilities:

Frontend
│
├─ Student Portal
├─ Seller Dashboard
└─ Boss Dashboard

Backend
│
├─ Auth Service
├─ Order Service
├─ Payment Service
├─ Inventory Service
├─ Alert Service
└─ Notification Service

Database
│
├─ Business Data
├─ Triggers
├─ Constraints
└─ Audit Logs

A common mistake students make is putting all business rules in the frontend.

Never trust the frontend.

Even if the button is hidden, someone can send requests manually.

The backend must enforce:

Payment completion checks

RBAC checks

Refund authorization

Stock allocation

Pickup authorization

Alert generation


The frontend should mainly display status, collect input, and call APIs. The backend is where the business rules live.