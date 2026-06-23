[[Team]]

#### The Verdict: Which is the bigger problem to solve here?

**Minimizing outstanding customer debt is the critical problem your system must solve.** Because the business operates under a strict **"buyer holds the item/store holds the item until fully paid"** rule, optimizing for turnover speed without complete payment means you are simply moving items from "Retail Shelves" to a "Reserved Storage Bin" without actually receiving the cash. The stock is tied up, can't be sold to others, and generates no cash flow. Your database must protect the store from uncompleted payment cycles, especially given the strict deadlines of the university semester lifecycle.

### 2. State Logic for Inventory: The Reservation Loop

Since items are physically kept in the boutique while being paid for over time, your database cannot use a basic, singular inventory count. Doing so creates a high risk of double-selling. You must implement a **Three-State Inventory Tracking Model**:

1. **`physical_qty`**: The total count of items physically present inside the store room.
    
2. **`allocated_qty`**: The count of items currently tied to active, incomplete student installment plans.
    
3. **`available_qty`**: Calculated dynamically as `physical_qty - allocated_qty`. This is the exact number of items visible to the cashier on the terminal UI for new sales.
    

When a student initiates an installment plan, the item does not leave the store. Instead, the database increases `allocated_qty` and decreases `available_qty`. It stays locked in this state until the final installment is paid, changing the item state to `Collected` and subtracting it from `physical_qty`.

### 3. Moniepoint POS Integration and Automation Chaining

Relying on manual reconciliation—where a student pays via a physical Moniepoint terminal and the cashier manually enters the amount into the web application—introduces risk. It allows for manual entry errors or internal cash leakage.

#### The Automation Architecture

To chain these actions cleanly without a complex custom Android build, use a **Webhook-Driven Verification Flow**:

```
[Web App Terminal] ──► Generates Unique Payment Reference (e.g., WB-2026-001)
         │
[Student Pays via Card/Transfer] ──► Moniepoint Merchant Smart POS Device
         │
[Moniepoint Servers] ──► Sends Instant JSON Webhook Payload to Your Backend API
         │
[FastAPI/Flask Backend] ──► Validates Reference ──► Automatically Appends to Payments Table
```

1. **The Reference Variable:** When a customer makes a payment, the seller types a unique Order/Installment ID into the Moniepoint POS transaction reference field before dipping the card.
    
2. **The Backend Webhook Receiver:** Your FastAPI or Flask backend exposes an endpoint (e.g., `/api/v1/moniepoint-webhook`). The moment a transaction succeeds, Moniepoint’s developer server sends a secure message containing the payment reference, the exact amount paid, and a success status code.
    
3. **Automated Processing:** Your database receives this background message, automatically pairs it with the correct customer ledger, and updates the payment balance instantly without the cashier manually altering any payment values.
    

### 4. Database Normalization & University Identity Traps

#### The Surrogate Key (`unique_id`) Recommendation

**Yes, a surrogate system-generated `unique_id` (like an auto-incrementing integer or UUID) is highly advisable.** Do not use the student's `matric_no` as your database table primary key. In a university environment, staff members also buy items (and do not have matric numbers), and some students may mistype their numbers during registration. Use an internal identifier for connections, and apply a `UNIQUE` constraint index on `matric_no` as an alternative lookup candidate.

#### Fixing the "Changing Room Number" Anomaly (First Principles)

If you place `hall_of_residence` and `room_number` directly inside the `Customers` table, you create a major data anomaly. When a student changes rooms next semester and you overwrite their profile data, **your historical installment receipt logs for past semesters will point to the wrong location.**

To achieve **Third Normal Form (3NF)** compliance, separate identity from residence:

SQL

```
-- Core Identity Table (Stable Data)
CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    matric_no VARCHAR(20) UNIQUE,
    telegram_handle VARCHAR(50),
    instagram_handle VARCHAR(50),
    bank_account_no VARCHAR(30) -- Kept securely for refund processing
);

-- Historical Location Log Table (Handles Semester Shifting)
CREATE TABLE Customer_Residence (
    residence_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES Customers(customer_id),
    academic_semester VARCHAR(20) NOT NULL, -- e.g., "2026_Alpha", "2026_Omega"
    hall_name VARCHAR(50) NOT NULL,
    room_no VARCHAR(10) NOT NULL
);
```

### 5. Extracted Nouns and Concrete Entity Specification

Your MIS team can structure the official business rules document using these verified entities and attributes:

- **`User / Staff`**: Represents anyone logging into the terminal interface.
    
    - _Attributes:_ `user_id`, `username`, `password_hash`, `role` (`'Boss'`, `'Seller'`).
        
- **`Customer`**: Stores the student or staff buyer profile.
    
    - _Attributes:_ `customer_id`, `fullname`, `matric_no`, `telegram_handle`, `bank_account_no`.
        
- **`Product`**: Represents items available for purchase.
    
    - _Attributes:_ `product_id`, `name`, `current_selling_price`, `cost_price`, `minimum_allowable_price`.
        
- **`Inventory_Stock`**: Tracks the multi-state counts of the goods.
    
    - _Attributes:_ `product_id`, `physical_qty`, `allocated_qty`.
        
- **`Order_Header`**: The master record of a single transaction session.
    
    - _Attributes:_ `order_id`, `customer_id`, `user_id`, `total_amount_due`, `payment_status` (`'Pending'`, `'Completed'`, `'Refunded'`).
        
- **`Payment_Ledger`**: Tracks each separate financial installment drop.
    
    - _Attributes:_ `payment_id`, `order_id`, `amount_collected`, `payment_method` (`'Moniepoint_POS'`, `'Cash'`), `timestamp`.
        
- **`System_Alert_Log`**: The internal unalterable audit trail.
    
    - _Attributes:_ `alert_id`, `event_type` (`'Zero_Stock'`, `'Installment_Completed'`), `description`, `timestamp`.
        

### 6. System Execution Parameters & Business Logic

#### Threshold & Timeline Trigger Logic

To calculate the $80\%$ notification point and check semester deadlines without slowing down execution, run a nightly evaluation script in your database using this logical query framework:

1. **The 80% Trigger Condition:**
    
    $$\frac{\sum(\text{amount\_collected})}{\text{total\_amount\_due}} \ge 0.80$$
    
2. **The Semester Deadline Condition:**
    
    $$\text{CURRENT\_DATE} \ge (\text{semester\_end\_date} - \text{INTERVAL '14 DAYS'})$$
    

When either condition evaluates to true, the system writes a new record into an outbound message queue table, prompting an external Telegram bot API component to dispatch a notification directly to the user's `telegram_handle`.

#### Role-Based Access Control (RBAC) Enforcement

To protect financial records, your backend framework must explicitly check user permissions before running queries:

- **`Seller` permissions:** Restricted to executing `SELECT` queries on product lists, running inventory counts, and processing standard sales logs (`INSERT INTO Payment_Ledger`). Sellers cannot run `UPDATE` or `DELETE` commands on completed financial history tables.
    
- **`Boss` permissions:** Granted full database authorization access. Only accounts flagged with the `Boss` role can modify existing order records, adjust operational configurations, or process customer balance refunds.
    

#### Simple Transaction User Interface (UI) Blueprint

The cashier’s screen must remain highly streamlined to avoid transaction delays during rush hours:

```
┌────────────────────────────────────────────────────────────────────────┐
│  CASHIER TERMINAL VIEW                                  [Role: Seller] │
├────────────────────────────────────────────────────────────────────────┤
│  [ SCAN BARCODE / SELECT ITEM ] -> (Automatically populates price)     │
│                                                                        │
│  Customer Identifier: [ Enter Matric No / Unique ID ]                 │
│                                                                        │
│  Payment Selection:                                                    │
│  ( ) Full Settlement   (•) Installment Plan                            │
│                                                                        │
│  Amount Deposited Today: ₦[ 15,000 ]                                   │
│  Payment Source:         [ Moniepoint POS ]                            │
│                                                                        │
│  ────────────────────────────────────────────────────────────────────  │
│  [ PROCESS TRANSACTION ]  <-- (Single click handles all system updates)│
└────────────────────────────────────────────────────────────────────────┘
```

The system manages the underlying complexity automatically. A single click updates the `allocated_qty` counts, registers the installment record entry, and instantly verifies the payment reference in the backend ledger.
The exact analysis format required to map your data structures correctly—resolving your multi-state stock tracking, shifting hostel room records, and Moniepoint transaction matching—is detailed below.
### Phase 1: The Refined Unstructured Narrative
*This section combines your initial elicitation notes into a comprehensive business narrative. It forms the foundational text for your documentation report.*
> **God’s Wish Boutique** operates as an SBU within Covenant University, selling sports, corporate, and casual wears alongside accessories (belts, ties, caps). The boutique utilizes a Moniepoint POS terminal for processing card/transfer payments and logging daily financial summaries. While the business enforces a strict "No goods leave the store until 100% paid for" rule, it accommodates a multi-payment installment model for student convenience.
> Under this configuration, when a customer places an installment order, the physical item is reserved and securely held by the store, locking that stock unit out of available inventory. Students track their outstanding balance by logging into a dedicated portal using their Matric Number. To secure financial tracking, strict Role-Based Access Control (RBAC) is enforced: Sales employees (Sellers) are permitted to log sales, set item prices, and record incoming installment updates, but only the Admin (the Boss) can modify or delete historical transaction strings or authorize a cash refund if an order is cancelled before item pickup.
> The system tracks extensive student social profiles (Telegram handles, Instagram handles, and Bank Account numbers for refund execution) along with location matrices (Halls of Residence and Room Numbers) which shift at the turn of each academic semester. Automated monitoring conditions trigger background alerts: when a stock line runs dry or an installment profile hits 100% resolution, an immutable internal system log is written to the Admin Dashboard. Additionally, when a student’s payment threshold crosses 80% completion or the system's target semester closing date approaches, an automated message queue triggers a notification out to the customer’s Telegram account.
> 
### Phase 2: Formal Structured Business Rules (Hoffer Standard)
*These rules serve as the translation engine for your Data Modelers. Each rule dictates a specific entity connection and cardinality constraint.*
 1. **Customer Identity:** A **CUSTOMER** may be a student possessing a unique Matric_No, a staff member, or a university visitor. To avoid structural identity duplication and support non-student profiles, each buyer must be assigned an immutable, system-generated Customer_ID.
 2. **Shifting Residence Constraint (3NF Protection):** A **CUSTOMER** may reside in different campus accommodations over time. To prevent transitive tracking dependencies, a **CUSTOMER** can have many historical records in the **RESIDENCE_LOG**, but each specific log entry must belong to exactly one **CUSTOMER** for a designated academic semester.
 3. **Inventory Allocation Logic:** A **PRODUCT** may exist across multiple inventory metrics. Total physical stock counts must be programmatically divided into Available_Qty (visible for open checkout sales) and Allocated_Qty (physically present in the boutique but legally reserved for open student installment contracts).
 4. **Order and Payment Chaining:** A **CUSTOMER** may initiate zero or many **ORDERS**. Each **ORDER** must be handled by exactly one **USER_ACCOUNT** (Staff member) and can be settled through one or many separate line entries in the **PAYMENT_LEDGER**.
 5. **Moniepoint Verification Link:** Each payment recorded through a physical card terminal must write an explicit tracking row to the **PAYMENT_LEDGER** containing a unique POS_Transaction_Reference string, preventing manual entry errors or double-logging anomalies.
 6. **Authorization Thresholds (RBAC):** An **ORDER** or **PAYMENT_LEDGER** entry can only be updated or deleted by a **USER_ACCOUNT** flagged with the security role of 'Boss'. Accounts flagged as 'Seller' are restricted to executing database insertion commands (INSERT) for new payments and item allocations.
 7. **System Auditing Ledger:** Every instances of low stock (0 items available) or completed installment actions (100\% payment parity) must automatically record exactly one unalterable event log entry into the **SYSTEM_ALERT_LOG**.
### Phase 3: Entity Identification & Relationship Specification Matrix
*This structural chart identifies the role of each table and specifies exactly how your Schema Engineers should link them via Foreign Keys.*

| Entity Name          | Entity Type                  | Primary/Surrogate Key            | Core Operational Purpose                                                                     |
| -------------------- | ---------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| **USER_ACCOUNT**     | Strong                       | user_id (Internal Serial)        | Stores authentication credentials and role flags ('Boss', 'Seller') for terminal management. |
| **CUSTOMER**         | Strong                       | customer_id (Surrogate UUID/Int) | Centralizes stable student/staff identifiers, contact vectors, and refund bank data.         |
| **RESIDENCE_LOG**    | Weak (Dependent on Customer) | residence_log_id (Serial)        | Tracks shifting hostel locations (hall_name, room_no) tagged to specific academic semesters. |
| **PRODUCT**          | Strong                       | product_id (Serial)              | Main directory catalog for clothing items, styles, and core base price definitions.          |
| **INVENTORY_STOCK**  | Associative / Extension      | product_id (FK to Product)       | Manages the three-state quantity system balances (physical_qty, allocated_qty).              |
| **ORDER_HEADER**     | Strong                       | order_id (Serial)                | Master ledger tracking total liability due, fulfillment milestones, and ownership.           |
| **PAYMENT_LEDGER**   | Weak (Dependent on Order)    | payment_id (Serial)              | Chronological list of payment amounts dropped, linked to the Moniepoint reference indicator. |
| **SYSTEM_ALERT_LOG** | Strong (Audit Trail)         | alert_id (Serial)                | Immutable append-only log capturing automated backend business event instances.              |
### Phase 4: System Data Dictionary & Attribute Blueprint
*This is the precise technical specification sheet for your SQL Developers. Copy this table into your final project report to show normalization compliance.*

| Table Name | Attribute Name | Data Type | Key Type | Constraints / Business Logic |
|---|---|---|---|---|
| **USER_ACCOUNT** | user_id 
 username 
 password_hash 
 user_role | INT 
 VARCHAR(50) 
 VARCHAR(255) 
 VARCHAR(15) | PK 
 UNIQUE 
 NOT NULL 
 NOT NULL | Auto-increment. 
 Login name. 
 Secured string. 
 Restriced to: ['Boss', 'Seller']. |
| **CUSTOMER** | customer_id 
 fullname 
 matric_no 
 telegram_handle 
 instagram_handle 
 bank_account_no | INT 
 VARCHAR(100) 
 VARCHAR(20) 
 VARCHAR(50) 
 VARCHAR(50) 
 VARCHAR(30) | PK 
 None 
 UNIQUE 
 None 
 None 
 None | Surrogate root key. 
 Full legal name. 
 Nullable (for Staff/Visitors). 
 Target for automated alerts. 
 Marketing/Follow-up reference. 
 Used for processing refunds. |
| **RESIDENCE_LOG** | residence_log_id 
 customer_id 
 semester_code 
 hall_name 
 room_no | INT 
 INT 
 VARCHAR(20) 
 VARCHAR(50) 
 VARCHAR(10) | PK 
 FK 
 None 
 None 
 None | Auto-increment. 
 Links back to Customer profile. 
 e.g., '2026_ALPHA'. 
 Specific Hostel Name. 
 Room identifier. |
| **PRODUCT** | product_id 
 product_name 
 category 
 cost_price 
 selling_price 
 min_allowable_price | INT 
 VARCHAR(100) 
 VARCHAR(20) 
 DECIMAL(10,2) 
 DECIMAL(10,2) 
 DECIMAL(10,2) | PK 
 None 
 None 
 None 
 None 
 None | System identifier. 
 e.g., 'Corporate Blue Suit'. 
 Restricted to: ['Sport', 'Corporate', 'Casual']. 
 Wholesale base procurement cost. 
 Standard display tag price. 
 Hard floor limit constraint for Seller discounts. |
| **INVENTORY_STOCK** | product_id 
 physical_qty 
 allocated_qty | INT 
 INT 
 INT | PK / FK 
 None 
 None | Ties directly to Product row. 
 Total physically on ground. 
 Total units reserved for active layaways. 
 *Note: Available_Qty is calculated as physical_qty - allocated_qty.* |
| **ORDER_HEADER** | order_id 
 customer_id 
 user_id 
 total_order_amount 
 order_status 
 created_at | INT 
 INT 
 INT 
 DECIMAL(10,2) 
 VARCHAR(20) 
 TIMESTAMP | PK 
 FK 
 FK 
 None 
 None 
 None | Master invoice tracking serial. 
 Identifies the buying client. 
 Identifies the processing employee. 
 Gross collection financial target value. 
 Restricted to: ['Pending', 'Completed', 'Refunded']. 
 Transaction creation record. |
| **PAYMENT_LEDGER** | payment_id 
 order_id 
 amount_paid 
 moniepoint_ref 
 payment_method 
 timestamp | INT 
 INT 
 DECIMAL(10,2) 
 VARCHAR(100) 
 VARCHAR(20) 
 TIMESTAMP | PK 
 FK 
 None 
 UNIQUE 
 None 
 None | Auto-increment key. 
 Parent order invoice index. 
 Single payment increment amount. 
 Nullable (only populated if via POS card/transfer). 
 Values: ['POS', 'Cash']. 
 Exact moment payment was logged. |
| **SYSTEM_ALERT_LOG** | alert_id 
 event_type 
 log_message 
 timestamp | INT 
 VARCHAR(30) 
 TEXT 
 TIMESTAMP | PK 
 None 
 None 
 None | Append-only tracking integer. 
 e.g., 'ZERO_STOCK', 'PAYMENT_COMPLETED'. 
 Complete data transaction trail description string. 
 Incident capture moment. |
### Step-by-Step Instructions for the Next Phase
Now that your data format is structured, assign the following timeline tasks to your team streams to begin the **Design Phase**:
 * **Step 1 (Data Modelers):** Take the **Entity Matrix** and the **Data Dictionary** parameters above. Open your diagram tool (Draw.io / Lucidchart) and design the physical boxes. Ensure a solid line connects CUSTOMER down to RESIDENCE_LOG and an optional 1-to-many crow's foot links ORDER_HEADER into the PAYMENT_LEDGER rows.
 * **Step 2 (Database Engineers):** Directly map the column labels and strict constraints outlined in the Attribute Blueprint array straight into your base schema definition blueprints.
 * **Step 3 (Backend Developers):** Program your API routes to fetch balances by running target aggregations directly against the payment ledger arrays:
   
   
   Ensure this dynamic logic underpins your consumer tracking dashboard interface screens.
