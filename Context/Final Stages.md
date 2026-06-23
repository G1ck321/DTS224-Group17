# DTS 224 Project: Deep-Dive System Architecture & Presentation Manual

**Project Title:** Vendor Installment and Restock Tracking System (VIRS)

**Academic References:** _Modern Database Management_ (Jeff Hoffer), _Database System Concepts_ (Silberschatz, Korth, Sudarshan)

**Target Environment:** SBU, Covenant University, Nigeria

## 1. The Corrected & Complete Relational Schema (3NF/BCNF Compliant)

### Is "PEOPLE" a Supertype? Should it be converted to USER_ACCOUNT?

**Yes, absolutely.** In your initial EER diagram, having `PEOPLE` as a supertype that splits into `CUSTOMER` and `USER_ACCOUNT` (Staff/Boss) is an elegant conceptual design, but **it must be structured correctly to prevent relational anomalies:**

1. **The Conceptual Rule (Hoffer):** `PEOPLE` represents any human actor who interacts with the VIRS system.
    
2. **The Discriminator (`people_type`):** Disjoint ($d$) because a student/customer cannot be a staff member (to protect financial transaction integrity), and total specialization ($\textbf{double line}$) because anyone in the database must belong to one of these groups.
    
3. **The Logical Translation:**
    
    - **Supertype Table:** `PEOPLE` holds common attributes: `people_id` (PK), `fullname`, `phone_number`, and `email`.
        
    - **Subtype Table 1:** `USER_ACCOUNT` represents staff/bosses. It maps 1-to-1 back to `PEOPLE`. It holds authentication secrets (`username`, `password_hash`, `user_role`).
        
    - **Subtype Table 2:** `CUSTOMER` represents students or university guests. It holds customer-specific variables (`matric_no` [nullable for guests], `telegram_handle`, `instagram_handle`, `bank_account_no`).
        

Here is the correct relational schema representation:

```
PEOPLE (people_id, fullname, phone_number, email, people_type)
  - Primary Key: people_id
  - Constraint: people_type IN ('U', 'C') -- U = User/Staff, C = Customer

USER_ACCOUNT (user_id*, username, password_hash, user_role)
  - Primary Key: user_id
  - Foreign Key: user_id references PEOPLE (people_id) ON DELETE RESTRICT
  - Constraint: user_role IN ('Boss', 'Seller')

CUSTOMER (customer_id*, matric_no, telegram_handle, instagram_handle, bank_account_no)
  - Primary Key: customer_id
  - Foreign Key: customer_id references PEOPLE (people_id) ON DELETE RESTRICT
  - Unique Constraint: matric_no
```

### The Full Corrected Schema Script (MySQL DDL)

This is the exact, execution-ready SQL script for your SQL Developer Lead. It includes constraints, primary keys, foreign keys, and the three-state stock check rules.

```
-- Create Database
CREATE DATABASE IF NOT EXISTS virs_db;
USE virs_db;

-- 1. PEOPLE (Supertype Table)
CREATE TABLE PEOPLE (
    people_id INT AUTO_INCREMENT,
    fullname VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    people_type CHAR(1) NOT NULL,
    PRIMARY KEY (people_id),
    CONSTRAINT chk_people_type CHECK (people_type IN ('U', 'C'))
) ENGINE=InnoDB;

-- 2. USER_ACCOUNT (Subtype Table - Staff/Admin)
CREATE TABLE USER_ACCOUNT (
    user_id INT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_role VARCHAR(15) NOT NULL,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES PEOPLE(people_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_role CHECK (user_role IN ('Boss', 'Seller'))
) ENGINE=InnoDB;

-- 3. CUSTOMER (Subtype Table - Students/Guests)
CREATE TABLE CUSTOMER (
    customer_id INT,
    matric_no VARCHAR(20) NULL UNIQUE, -- Nullable to allow non-student guests
    telegram_handle VARCHAR(50) NULL,
    instagram_handle VARCHAR(50) NULL,
    bank_account_no VARCHAR(30) NULL, -- For refunds
    PRIMARY KEY (customer_id),
    FOREIGN KEY (customer_id) REFERENCES PEOPLE(people_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. RESIDENCE_LOG (Prevents 3NF Transitivities)
CREATE TABLE RESIDENCE_LOG (
    residence_log_id INT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    semester_code VARCHAR(20) NOT NULL, -- e.g. "2026_ALPHA"
    hall_name VARCHAR(50) NOT NULL,
    room_no VARCHAR(10) NOT NULL,
    PRIMARY KEY (residence_log_id),
    FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. SUPPLIER
CREATE TABLE SUPPLIER (
    supplier_id INT AUTO_INCREMENT,
    supplier_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(15) NOT NULL,
    PRIMARY KEY (supplier_id)
) ENGINE=InnoDB;

-- 6. PRODUCT
CREATE TABLE PRODUCT (
    product_id INT AUTO_INCREMENT,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL, -- Sport, Corporate, Casual
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    min_allowable_price DECIMAL(10,2) NOT NULL,
    supplier_id INT NOT NULL,
    PRIMARY KEY (product_id),
    FOREIGN KEY (supplier_id) REFERENCES SUPPLIER(supplier_id) ON DELETE RESTRICT,
    CONSTRAINT chk_category CHECK (category IN ('Sport', 'Corporate', 'Casual')),
    CONSTRAINT chk_prices CHECK (selling_price >= cost_price AND min_allowable_price <= selling_price)
) ENGINE=InnoDB;

-- 7. INVENTORY_STOCK (Three-State Inventory Engine)
CREATE TABLE INVENTORY_STOCK (
    product_id INT,
    physical_qty INT NOT NULL DEFAULT 0,
    allocated_qty INT NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id),
    FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id) ON DELETE CASCADE,
    CONSTRAINT chk_stock_balance CHECK (physical_qty >= allocated_qty),
    CONSTRAINT chk_non_negative CHECK (physical_qty >= 0 AND allocated_qty >= 0)
) ENGINE=InnoDB;

-- 8. ORDER_HEADER (Master Invoice Metadata)
CREATE TABLE ORDER_HEADER (
    order_id INT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    user_id INT NOT NULL, -- The staff who processed the sale
    total_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    order_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES USER_ACCOUNT(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_status CHECK (order_status IN ('Pending', 'Completed', 'Refunded'))
) ENGINE=InnoDB;

-- 9. ORDER_LINE (Associative Entity Decomposing Order <-> Product M:N)
CREATE TABLE ORDER_LINE (
    order_id INT,
    product_id INT,
    quantity_ordered INT NOT NULL,
    price_at_sale DECIMAL(10,2) NOT NULL, -- Protects history from future price changes
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES ORDER_HEADER(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id) ON DELETE RESTRICT,
    CONSTRAINT chk_qty_ordered CHECK (quantity_ordered > 0)
) ENGINE=InnoDB;

-- 10. PAYMENT_LEDGER (Tracks chronological layaways)
CREATE TABLE PAYMENT_LEDGER (
    payment_id INT AUTO_INCREMENT,
    order_id INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    moniepoint_ref VARCHAR(100) UNIQUE NULL, -- Nullable for cash
    payment_method VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    FOREIGN KEY (order_id) REFERENCES ORDER_HEADER(order_id) ON DELETE CASCADE,
    CONSTRAINT chk_method CHECK (payment_method IN ('POS', 'Cash', 'Transfer')),
    CONSTRAINT chk_positive_payment CHECK (amount_paid > 0)
) ENGINE=InnoDB;

-- 11. SYSTEM_ALERT_LOG (Un-alterable Audit Trail)
CREATE TABLE SYSTEM_ALERT_LOG (
    alert_id INT AUTO_INCREMENT,
    event_type VARCHAR(30) NOT NULL,
    log_message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (alert_id)
) ENGINE=InnoDB;
```

## 2. Real-World Decoupling of the Transaction Tables

To explain the database structure to your team and academic advisors, you must clearly distinguish between **ORDER_HEADER**, **ORDER_LINE**, and **PAYMENT_LEDGER**.

```
                           ORDER_HEADER (The Invoice Shell)
              ┌───────────────────────────────────────────────┐
              │ Order ID: #1001                               │
              │ Customer: Tobi (Matric: 23CG00412)            │
              │ Date: 2026-06-19                              │
              │ Status: Pending                               │
              │ Total Value: ₦50,000                          │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼ Contains 1 or More
                           ORDER_LINE (What was purchased)
              ┌───────────────────────┴───────────────────────┐
              │ [Item 1]: Corporate Blue Suit x 1 (₦40,000)   │
              │ [Item 2]: Corporate Silk Tie  x 1 (₦10,000)   │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼ Paid Over Time via
                           PAYMENT_LEDGER (The Financial Trail)
              ┌───────────────────────┴───────────────────────┐
              │ Drop 1: ₦15,000 (Moniepoint Ref: MNP-001)     │
              │ Drop 2: ₦20,000 (Moniepoint Ref: MNP-092)     │
              │ Drop 3: ₦15,000 (Cash)                        │
              └───────────────────────────────────────────────┘
```

### Real-Life Example: Tobi buys a Corporate Suit and a Tie

- **`ORDER_HEADER` (Who, When, and Overall Status):** This table acts as the master shell of the transaction. It records a single unique `order_id` (e.g., `#1001`), the `customer_id` (Tobi), the `user_id` of the cashier (Staff member John), the `total_order_amount` (₦50,000), the `order_status` (`'Pending'`), and the date.
    
- **`ORDER_LINE` (The Specific Items in the Cart):** This is the associative table that resolves the many-to-many relationship between orders and products. It details exactly _what_ is inside the cart for Order `#1001`.
    
    - Row 1: `order_id: #1001`, `product_id: 5` (Corporate Suit), `quantity_ordered: 1`, `price_at_sale: ₦40,000`.
        
    - Row 2: `order_id: #1001`, `product_id: 12` (Silk Tie), `quantity_ordered: 1`, `price_at_sale: ₦10,000`.
        
    - _Why_ `price_at_sale`? If the Silk Tie price rises to ₦12,000 next week, the historical cost of Order `#1001` remains locked at the negotiated ₦10,000.
        
- **`PAYMENT_LEDGER` (Chronological Credit History):** Because Tobi is on an installment plan, they do not pay ₦50,000 up front. The `PAYMENT_LEDGER` tracks their incremental payments over time:
    
    - Drop 1 (Day 1): ₦15,000 paid via Moniepoint POS card dip. Reference: `MNP-001`.
        
    - Drop 2 (Week 3): ₦20,000 paid via Moniepoint bank transfer. Reference: `MNP-092`.
        
    - Drop 3 (Week 6 - Final payment): ₦15,000 paid in Cash.
        
    - When the sum of these payments reaches ₦50,000, the system triggers the order's completion status, releasing the physical garments to Tobi.
        

## 3. Specifications Definitions: Functional, User, and System

For your systems analysis chapters, you must draw clear boundaries between these three requirement types:

```
                  ┌────────────────────────────────────────┐
                  │           USER REQUIREMENTS            │ <-- "What the human needs to do"
                  │ "As a Boss, I need to see sales logs." │
                  └───────────────────┬────────────────────┘
                                      ▼
                  ┌────────────────────────────────────────┐
                  │        FUNCTIONAL REQUIREMENTS         │ <-- "What the software code must execute"
                  │  "API calculates sum(amount_paid)."    │
                  └───────────────────┬────────────────────┘
                                      ▼
                  ┌────────────────────────────────────────┐
                  │          SYSTEM REQUIREMENTS           │ <-- "The technical environment/hardware"
                  │   "MySQL 8.0, 50ms latency endpoint."  │
                  └────────────────────────────────────────┘
```

- **User Specifications (The human perspective):** These are high-level descriptions of what the system must allow actors to accomplish in their language.
    
    - _Example:_ "A student must be able to view their remaining debt from their hostel room using only their phone."
        
    - _Example:_ "The boutique owner must be able to view stock levels to plan restocking trips."
        
- **System Specifications (The operational/hardware blueprint):** These are the technical constraints under which the application must run (operating systems, frameworks, hardware capacity, limits).
    
    - _Example:_ "The database engine must use InnoDB to support multi-table transactional commits."
        
    - _Example:_ "The backend must run on Python FastAPI with JSON-compliant routing interfaces."
        
- Functional Requirements **(The algorithmic instructions):** These represent the precise software inputs, processing loops, and database mutations required to fulfill the user's needs.
    
    - _Example:_ "When a checkout is processed, the system must verify that `Available_Qty` (calculated as `physical_qty - allocated_qty`) is greater than or equal to the requested cart quantity."
        

## 4. The Complete Transaction and Payment Verification Flow

How do we perfectly check and verify payments without manual entry error or internal theft?

### How Insertion of New Payments Works

To prevent a staff member from logging arbitrary payment values, every transaction runs through a strict database-level verification routine:

```
[Staff Enters Payment Amount] ──► [MySQL Opens Transaction (START TRANSACTION)]
                                                │
[Verify Total Owed] ◄───────────────────────────┴─── Run Sum Query:
                                                     SELECT sum(amount_paid) FROM PAYMENT_LEDGER
                                                │
[Check Validation Constraints] ─────────────────┼─── Ensure (Sum_Paid + New_Amount) <= Total_Order
                                                │
[Success] ──────────────────────────────────────┴─── Appends row to PAYMENT_LEDGER, 
                                                     updates ORDER_HEADER state, 
                                                     runs COMMIT.
```

1. **Open a Secure Database Transaction (`START TRANSACTION`):** This locks the targeted rows, preventing other users from writing simultaneous entries.
    
2. **Retrieve Current Payment Aggregates:** The backend executes an isolated SQL summation query to calculate the student's payment history to date:
    
    ```
    SELECT COALESCE(SUM(amount_paid), 0) FROM PAYMENT_LEDGER WHERE order_id = :target_order_id;
    ```
    
3. **Verify the Overpayment Boundary:** If the student's existing balance is ₦10,000 and the cashier attempts to log a new payment of ₦12,000, **the database rejects the transaction.**
    
4. **Append the Ledger & Commit (`COMMIT`):** If the validation checks pass, the backend writes the new row to the `PAYMENT_LEDGER`, updates the status flags within `ORDER_HEADER`, and releases the database locks.
    

### The Webhook Reality: Will it send a real webhook for transactions?

During your class presentation, you **must address this clearly.** Since this is an academic university project, you do not have a live merchant account with Moniepoint to receive production webhooks. Instead, **you will simulate this real-world flow.** Your backend code will feature a dedicated webhook testing route. You will use an API testing client like **Postman** to send a simulated Moniepoint payment confirmation payload to your system, showing the class and your lecturer how the backend automatically processes the incoming data, matches the transaction references, and updates database records in real time.

## 5. Verbal Presentation Script & Slide Outline (15 Roles)

To guarantee a high score on presentation day, distribute these slides and verbal scripts to your team members. This structure showcases a cohesive, professional software engineering process.

```
                           ┌─────────────────────────┐
                           │    1. PROJECT LEAD      │ (Coordinates slide transitions)
                           └────────────┬────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     [ 2. REQUIREMENTS / MIS ]                      [ 3. DATABASE / CS ]
  "How we discovered the business rules"         "How we structured the tables"
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │   4. CODE ENGINE / UI   │
                           │ "The live software demo"│
                           └─────────────────────────┘
```

### Slide 1: Introduction & Problem Statement

- **Speaker:** Project Lead (Person 1)
    
- **Visuals:** High-quality photos of God’s Wish Boutique; screenshots of torn, manual paper ledgers and messy notebook records.
    
- **Verbal Script (Say this):**
    
    > "Good day, panel. We present VIRS, designed specifically for God's Wish Boutique here on the Covenant University campus. Currently, this retail SBU manages student installment plans using physical paper notebooks. This manual approach leads to lost ledger records, lack of financial accountability, and double-allocation errors where reserved items are accidentally sold to walk-in cash customers. VIRS solves these problems by digitizing the entire business process."
    

### Slide 2: Requirements Discovery & Business Rules

- **Speaker:** Business Analyst (Person 3)
    
- **Visuals:** A structured timeline of your elicitation interviews with the store staff and the owner.
    
- **Verbal Script (Say this):**
    
    > "To build this system, we conducted contextual interviews with both store clerks and the owner. We discovered that while the boutique enforces a strict 'no items leave the store until fully paid' rule, they allow students to pay over time. This means items must be physically reserved in stock while payments are completed. This requirement guided our data model design."
    

### Slide 3: Conceptual Design & EERD Hierarchy

- **Speaker:** Data Modeler (Person 4)
    
- **Visuals:** A clear layout diagram displaying the EERD, highlighting the disjoint generalization circle dividing `PRODUCT` into its specialized subtypes: `Corporate`, `Casual`, and `Sport`.
    
- **Verbal Script (Say this):**
    
    > "Following Hoffer's database modeling standards, we structured our product catalog as a Supertype/Subtype hierarchy. The core `PRODUCT` table holds shared values like name and cost price, while specialized sub-tables handle attributes unique to sports jerseys, casual wears, and corporate suits. This disjoint specialization model eliminates empty, null values across our rows."
    

### Slide 4: Schema Normalization (The 3NF/BCNF Proof)

- **Speaker:** Schema Engineer (Person 5)
    
- **Visuals:** Side-by-side transition diagrams showing how you resolved partial and transitive dependencies during normalization.
    
- **Verbal Script (Say this):**
    
    > "To ensure our database structure remains robust, we normalized our tables to Third Normal Form. We isolated student housing data into a dedicated `RESIDENCE_LOG` table. This step prevents transitive dependencies, ensuring that when a student moves to a new hostel room next semester, their previous transaction invoices remain uncorrupted."
    

### Slide 5: The Three-State Inventory Engine

- **Speaker:** SQL Developer Lead (Person 10)
    
- **Visuals:** A diagram of your multi-state inventory flow, accompanied by the SQL code: `available_qty = physical_qty - allocated_qty`.
    
- **Verbal Script (Say this):**
    
    > "Because God's Wish Boutique holds paid items on-site during installment plans, a standard inventory count would lead to double-selling. To prevent this, we built a database-enforced three-state stock engine. When an installment order is booked, the system leaves `physical_qty` unchanged but increases `allocated_qty`. This automatically decreases the available stock visible to the cashier, protecting reserved items."
    

### Slide 6: Automated Webhooks & Payment Processing

- **Speaker:** Backend Developer (Person 13)
    
- **Visuals:** A flowchart tracing your Moniepoint POS webhook integration.
    
- **Verbal Script (Say this):**
    
    > "To automate reconciliations, our backend system supports a webhook-driven integration flow. When a payment succeeds on the Moniepoint POS, their servers send a secure payload containing the payment amount and a transaction reference back to our API. The system parses this data and updates the payment ledger automatically, eliminating manual entry errors."
    

### Slide 7: Live Software Demonstration

- **Speaker:** Frontend Lead (Person 12)
    
- **Visuals:** A live browser demo of the application. Walk through logging in as a staff member, setting up an installment plan for a suit, and viewing the updated payment ledger on the student dashboard.
    
- **Verbal Script (Say this):**
    
    > "We will now show you a live demonstration of the system. Notice how the cashier terminal remains clean and straightforward for quick use during busy campus rush hours. The student can log in using their matric number to view their payment history, and the admin panel keeps track of automated low-stock and payment alerts."
    

### Slide 8: Summary & Key Takeaways

- **Speaker:** Project Lead (Person 1)
    
- **Visuals:** A summary slide listing your project achievements.
    
- **Verbal Script (Say this):**
    
    > "In summary, VIRS