USE virs_db;

-- ── 1. PEOPLE (10 Rows) ──
INSERT INTO PEOPLE (people_id, fullname, phone_number, email, people_type) VALUES
(1, 'Admin Chief', '08011111111', 'admin@cu.edu.ng', 'U'),
(2, 'John Seller', '08022222222', 'john@cu.edu.ng', 'U'),
(3, 'Chukwuemeka Adeyemi', '08033333333', 'chukwuemeka@student.cu.edu.ng', 'C'),
(4, 'Funmilayo Okafor', '08044444444', 'funmilayo@student.cu.edu.ng', 'C'),
(5, 'Segun Ojo', '08055555555', 'segun@student.cu.edu.ng', 'C'),
(6, 'Adaeze Nwosu', '08066666666', 'adaeze@student.cu.edu.ng', 'C'),
(7, 'Babatunde Martins', '08077777777', 'babatunde@student.cu.edu.ng', 'C'),
(8, 'Sarah Jenkins', '08088888888', 'sarah@guest.com', 'C'),
(9, 'Michael Obi', '08099999999', 'michael@student.cu.edu.ng', 'C'),
(10, 'Blessing Thomas', '08010101010', 'blessing@student.cu.edu.ng', 'C');

-- ── 2. USER_ACCOUNT (2 Rows) ──
-- BCrypt hashes resolve to the string: password
INSERT INTO USER_ACCOUNT (user_id, username, password_hash, user_role) VALUES
(1, 'ADMIN_01', '$2b$10$EPf9XUq.S/E76B1f6b1Sbu6N4Q.bZ264pEorE.G7F7vU5.M.Pia1.', 'Boss'),
(2, 'SELLER_JOHN', '$2b$10$EPf9XUq.S/E76B1f6b1Sbu6N4Q.bZ264pEorE.G7F7vU5.M.Pia1.', 'Seller');

-- ── 3. CUSTOMER (8 Rows) ──
INSERT INTO CUSTOMER (customer_id, matric_no, telegram_handle, instagram_handle, bank_account_no) VALUES
(3, '24CG000001', '@chukwuemeka_tg', '@chukwu_ig', '0123456789'),
(4, '24CG000002', '@funmi_tg', '@funmi_ig', '2234567890'),
(5, '24CG000003', '@segun_tg', '@segun_ig', '3234567891'),
(6, '24CG000004', '@adaeze_tg', '@adaeze_ig', '4234567892'),
(7, '24CG000005', '@baba_tg', '@baba_ig', '5234567893'),
(8, NULL, '@sarah_guest', NULL, '6234567894'),
(9, '24CG000006', '@mike_tg', '@mike_ig', '7234567895'),
(10, '24CG000007', '@bless_tg', '@bless_ig', '8234567896');

-- ── 4. RESIDENCE_LOG (4 Rows) ──
INSERT INTO RESIDENCE_LOG (customer_id, semester_code, hall_name, room_no) VALUES
(3, '2025_OMEGA', 'Peter Hall', 'D302'),
(4, '2025_OMEGA', 'Esther Hall', 'A302'),
(5, '2025_OMEGA', 'Daniel Hall', 'G105'),
(6, '2025_OMEGA', 'Joseph Hall', 'A107');

-- ── 5. SUPPLIER (1 Row) ──
INSERT INTO SUPPLIER (supplier_id, supplier_name, contact_phone) VALUES
(1, 'Lagos Main Boutique Wholesalers', '014400221');

-- ── 6. PRODUCT (4 Rows) ──
INSERT INTO PRODUCT (product_id, product_name, category, cost_price, selling_price, min_allowable_price, supplier_id) VALUES
(1, 'Corporate Suit — Navy Blue', 'Corporate', 20000.00, 30000.00, 25000.00, 1),
(2, 'Casual Hoodie — Black', 'Casual', 10000.00, 20000.00, 15000.00, 1),
(3, 'Sport Joggers — Grey Melange', 'Sport', 8000.00, 18000.00, 14000.00, 1),
(4, 'Leather Belt — Brown', 'Casual', 3000.00, 5000.00, 4000.00, 1);

-- ── 7. INVENTORY_STOCK (4 Rows) ──
INSERT INTO INVENTORY_STOCK (product_id, physical_qty, allocated_qty) VALUES
(1, 7, 3),
(2, 7, 5),
(3, 2, 2),
(4, 8, 1);

-- ── 8. ORDER_HEADER (3 Rows) ──
INSERT INTO ORDER_HEADER (order_id, customer_id, user_id, total_order_amount, order_status) VALUES
(101, 3, 2, 30000.00, 'Pending'),
(102, 4, 2, 20000.00, 'Pending'),
(103, 5, 2, 18000.00, 'Pending');

-- ── 9. ORDER_LINE (3 Rows) ──
INSERT INTO ORDER_LINE (order_id, product_id, quantity_ordered, price_at_sale) VALUES
(101, 1, 1, 30000.00),
(102, 2, 1, 20000.00),
(103, 3, 1, 18000.00);

-- ── 10. PAYMENT_LEDGER (1 Row) ──
INSERT INTO PAYMENT_LEDGER (payment_id, order_id, amount_paid, moniepoint_ref, payment_method) VALUES
(1, 101, 25000.00, 'MNP-20260606-3412', 'POS');