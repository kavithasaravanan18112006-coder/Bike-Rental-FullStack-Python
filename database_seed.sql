-- BikeRental demo database setup + seed data
-- SQLite version: matches the current FastAPI/SQLAlchemy project.
-- Safe to run more than once: demo rows are inserted only when missing.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) DEFAULT 'Customer',
    status VARCHAR(30) DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bikes (
    id INTEGER PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    number VARCHAR(50) NOT NULL,
    type VARCHAR(60) NOT NULL,
    location VARCHAR(120) NOT NULL,
    battery INTEGER DEFAULT 100,
    status VARCHAR(30) DEFAULT 'Available',
    price FLOAT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY,
    booking_code VARCHAR(40) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    bike_id INTEGER NOT NULL,
    customer VARCHAR(120) NOT NULL,
    start_date DATE NOT NULL,
    hours INTEGER NOT NULL,
    pickup_location VARCHAR(120) NOT NULL,
    total FLOAT NOT NULL,
    status VARCHAR(30) DEFAULT 'Confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bike_id) REFERENCES bikes(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    reference VARCHAR(120) NOT NULL,
    method VARCHAR(30) DEFAULT 'Demo',
    amount FLOAT NOT NULL,
    status VARCHAR(30) DEFAULT 'Paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY,
    bike_id INTEGER NOT NULL,
    issue VARCHAR(255) NOT NULL,
    priority VARCHAR(30) DEFAULT 'Medium',
    status VARCHAR(30) DEFAULT 'Open',
    reported_on DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (bike_id) REFERENCES bikes(id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bike_id INTEGER NOT NULL,
    rating FLOAT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bike_id) REFERENCES bikes(id)
);

-- Admin login: admin@bikerental.com / Admin@123
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, created_at)
VALUES (1, 'Admin User', 'admin@bikerental.com',
'436ef25ddf579ac2b9eebec4b5492dfe:5a07c0af294e2c678eacd93801bd11e757cfebc8f8b1892d912c3121687008f1',
'Admin', 'Active', '2026-09-29 09:00:00');

-- Demo customer: customer@bikerental.com / Customer@123
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, created_at)
VALUES (2, 'Demo Customer', 'customer@bikerental.com',
'9546f2703446b6bb04783c89b9ae8d53:43ae25ab9a80f14275c69d7041a02d478610851ee6079fc0dcf49d8aebd7e2d5',
'Customer', 'Active', '2026-09-29 09:05:00');

INSERT OR IGNORE INTO bikes (id, code, number, type, location, battery, status, price) VALUES
(1, 'BR-001', 'HR26 AB 1234', 'Electric Bike', 'Anna Nagar', 75, 'Available', 180),
(2, 'BR-002', 'TN09 CD 5678', 'City Bike', 'T. Nagar', 60, 'Available', 150),
(3, 'BR-003', 'KA05 EF 9012', 'Electric Bike', 'Nungambakkam', 80, 'On Ride', 220),
(4, 'BR-004', 'MH12 GH 3456', 'Mountain Bike', 'Velachery', 55, 'Available', 200),
(5, 'BR-005', 'TN07 IJ 7890', 'City Bike', 'Adyar', 90, 'Maintenance', 160),
(6, 'BR-006', 'TN10 KL 2468', 'Electric Bike', 'Anna Nagar', 88, 'Available', 220);

INSERT OR IGNORE INTO bookings
(id, booking_code, user_id, bike_id, customer, start_date, hours, pickup_location, total, status, created_at)
SELECT 1, '#BK1001', 2, 1, 'Demo Customer', '2026-09-29', 2, 'Anna Nagar', 360, 'Paid', '2026-09-29 09:30:00'
WHERE EXISTS (SELECT 1 FROM users WHERE id=2)
  AND EXISTS (SELECT 1 FROM bikes WHERE id=1);

INSERT OR IGNORE INTO bookings
(id, booking_code, user_id, bike_id, customer, start_date, hours, pickup_location, total, status, created_at)
SELECT 2, '#BK1002', 2, 2, 'Demo Customer', '2026-09-30', 3, 'T. Nagar', 450, 'Confirmed', '2026-09-29 10:15:00'
WHERE EXISTS (SELECT 1 FROM users WHERE id=2)
  AND EXISTS (SELECT 1 FROM bikes WHERE id=2);

INSERT INTO payments (booking_id, reference, method, amount, status, created_at)
SELECT b.id, 'PAY-DEMO-1001', 'UPI Demo', 360, 'Paid', '2026-09-29 09:35:00'
FROM bookings b
WHERE b.booking_code='#BK1001'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.reference='PAY-DEMO-1001');

INSERT INTO notifications (user_id, title, message, is_read, created_at)
SELECT 1, 'New booking received', 'Demo Customer booked HR26 AB 1234 for 2 hours.', 0, '2026-09-29 09:30:00'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=1 AND title='New booking received' AND message='Demo Customer booked HR26 AB 1234 for 2 hours.');

INSERT INTO notifications (user_id, title, message, is_read, created_at)
SELECT 1, 'Payment completed', 'Payment PAY-DEMO-1001 was completed successfully.', 0, '2026-09-29 09:35:00'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=1 AND title='Payment completed' AND message='Payment PAY-DEMO-1001 was completed successfully.');

INSERT INTO notifications (user_id, title, message, is_read, created_at)
SELECT 1, 'Low battery alert', 'Bike TN07 IJ 7890 battery is below the recommended level.', 0, '2026-09-29 09:45:00'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=1 AND title='Low battery alert');

INSERT INTO notifications (user_id, title, message, is_read, created_at)
SELECT 1, 'Maintenance reminder', 'Bike TN07 IJ 7890 is scheduled for maintenance.', 1, '2026-09-29 10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=1 AND title='Maintenance reminder');

INSERT INTO notifications (user_id, title, message, is_read, created_at)
SELECT 2, 'Booking confirmed', '#BK1001 confirmed for HR26 AB 1234.', 0, '2026-09-29 09:30:00'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=2 AND title='Booking confirmed' AND message='#BK1001 confirmed for HR26 AB 1234.');

INSERT INTO notifications (user_id, title, message, is_read, created_at)
SELECT 2, 'Payment successful', 'Payment of ₹360.00 recorded.', 0, '2026-09-29 09:35:00'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=2 AND title='Payment successful' AND message='Payment of ₹360.00 recorded.');

INSERT INTO maintenance (bike_id, issue, priority, status, reported_on)
SELECT 5, 'Brake inspection and battery check', 'High', 'Open', '2026-09-29'
WHERE NOT EXISTS (SELECT 1 FROM maintenance WHERE bike_id=5 AND issue='Brake inspection and battery check');

INSERT INTO maintenance (bike_id, issue, priority, status, reported_on)
SELECT 3, 'Routine service after rental', 'Medium', 'Scheduled', '2026-09-29'
WHERE NOT EXISTS (SELECT 1 FROM maintenance WHERE bike_id=3 AND issue='Routine service after rental');

INSERT INTO reviews (user_id, bike_id, rating, comment, created_at)
SELECT 2, 1, 5, 'Smooth ride and easy pickup.', '2026-09-29 09:40:00'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE user_id=2 AND bike_id=1 AND comment='Smooth ride and easy pickup.');

INSERT INTO reviews (user_id, bike_id, rating, comment, created_at)
SELECT 2, 2, 4, 'Good city bike for short trips.', '2026-09-29 10:20:00'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE user_id=2 AND bike_id=2 AND comment='Good city bike for short trips.');

-- Keep the booking demo bike available for further testing.
UPDATE bikes SET status='Available' WHERE code IN ('BR-001','BR-002','BR-004','BR-006');

-- Useful verification queries:
-- SELECT * FROM users;
-- SELECT * FROM bikes;
-- SELECT * FROM bookings;
-- SELECT * FROM payments;
-- SELECT * FROM notifications ORDER BY created_at DESC;
-- SELECT * FROM maintenance;
-- SELECT * FROM reviews;
