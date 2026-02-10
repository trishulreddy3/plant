-- ========================================
-- QUICK SUPER ADMIN RESTORE
-- Copy and paste this entire script into PgAdmin Query Tool
-- ========================================

-- This script ONLY restores the Super Admin account
-- Use this if tables already exist but Super Admin is missing

-- Clear existing Super Admin (if any)
DELETE FROM "super_admins" WHERE email = 'superadmin@gmail.com';

-- Insert Super Admin
-- Email: superadmin@gmail.com
-- Password: superadmin@123
-- Company: microsyslogic
INSERT INTO "super_admins" ("companyName", "email", "password", "role")
VALUES (
    'microsyslogic',
    'superadmin@gmail.com',
    '$2b$10$IM2dCX1TM4uLRQ9YhJKrBeGQCqr4WhwfV512ryY1oTo6pRvokb.92',
    'super_admin'
);

-- Verify
SELECT 
    id, 
    "companyName", 
    email, 
    role,
    'Password is hashed with bcrypt' as password_note
FROM "super_admins" 
WHERE email = 'superadmin@gmail.com';

-- Expected: 1 row returned with microsyslogic / superadmin@gmail.com / super_admin
