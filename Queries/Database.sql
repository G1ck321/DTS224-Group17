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