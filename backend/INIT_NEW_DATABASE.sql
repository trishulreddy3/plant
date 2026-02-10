-- ========================================
-- DATABASE INITIALIZATION SCRIPT
-- Run this in PgAdmin Query Tool when switching to a new database
-- ========================================

-- Step 1: Create all required tables
-- ========================================

-- Companies table (Registry of all companies)
CREATE TABLE IF NOT EXISTS "companies" (
    "companyId" VARCHAR(255) PRIMARY KEY,
    "companyName" VARCHAR(255) NOT NULL,
    "voltagePerPanel" NUMERIC DEFAULT 20,
    "currentPerPanel" NUMERIC DEFAULT 9.9,
    "plantPowerKW" NUMERIC NOT NULL DEFAULT 0,
    "plantDetails" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Super Admins table (Platform administrators)
CREATE TABLE IF NOT EXISTS "super_admins" (
    "id" SERIAL PRIMARY KEY,
    "companyName" VARCHAR(255) NOT NULL DEFAULT 'microsyslogic',
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) DEFAULT 'super_admin'
);

-- Users (Staff) table (Global registry)
CREATE TABLE IF NOT EXISTS "users" (
    "userId" VARCHAR(255) PRIMARY KEY,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "role" VARCHAR(50) DEFAULT 'technician', -- super_admin, admin, plant_admin, technician, management
    "companyId" VARCHAR(255) REFERENCES "companies"("companyId") ON DELETE CASCADE,
    "phoneNumber" VARCHAR(50),
    "accountStatus" VARCHAR(50) DEFAULT 'offline', -- active, blocked, offline
    "isLoggedIn" BOOLEAN DEFAULT FALSE,
    "lastActiveAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Login Logs table (Audit trail)
CREATE TABLE IF NOT EXISTS "login_logs" (
    "id" SERIAL PRIMARY KEY,
    "userId" VARCHAR(255) REFERENCES "users"("userId") ON DELETE CASCADE,
    "loginTime" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "ip" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Live Data table (Global registry for monitoring)
CREATE TABLE IF NOT EXISTS "live_data" (
    "id" VARCHAR(255) PRIMARY KEY,
    "companyId" VARCHAR(255) REFERENCES "companies"("companyId") ON DELETE CASCADE,
    "serialNumber" VARCHAR(255),
    "node" VARCHAR(255) NOT NULL,
    "time" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "temperature" NUMERIC,
    "lightIntensity" NUMERIC,
    "current" NUMERIC DEFAULT 0,
    "panelVoltages" JSONB DEFAULT '[]',
    "panelCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tickets table (Issue tracking)
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" VARCHAR(255) PRIMARY KEY,
    "companyId" VARCHAR(255) REFERENCES "companies"("companyId") ON DELETE CASCADE,
    "trackId" VARCHAR(255),
    "fault" TEXT,
    "reason" TEXT,
    "category" VARCHAR(50) DEFAULT 'MODERATE', -- BAD, MODERATE
    "powerLoss" NUMERIC DEFAULT 0,
    "predictedLoss" NUMERIC,
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "resolvedBy" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 2: Insert Super Admin Account
-- ========================================
-- Password: superadmin@123 (hashed with bcrypt)
-- Email: superadmin@gmail.com
-- Company: microsyslogic

INSERT INTO "super_admins" ("companyName", "email", "password", "role")
VALUES (
    'microsyslogic',
    'superadmin@gmail.com',
    '$2b$10$IM2dCX1TM4uLRQ9YhJKrBeGQCqr4WhwfV512ryY1oTo6pRvokb.92',
    'super_admin'
)
ON CONFLICT ("email") DO NOTHING;

-- Verification
SELECT * FROM "super_admins";

