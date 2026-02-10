# 🔐 Security Vulnerability & Prevention Report

This document summarizes the critical security vulnerabilities identified in the Solar Plant Monitor application and the specific technical measures implemented to mitigate them.

---

## 🚀 Executive Summary
The backend has been hardened with a multi-layered security architecture, including **Role-Based Access Control (RBAC)**, **IDOR Protection**, **Input Sanitization**, and **Rate Limiting**. All critical API endpoints are now shielded against unauthorized access and data manipulation.

---

## 🛡️ Vulnerabilities & Mitigations

### 1. Vertical Privilege Escalation
*   **The Vulnerability**: Standard users could potentially access administrative API endpoints (like company creation or staff deletion) by guessing the URL, as there were no server-side checks.
*   **Prevention**: Implemented **Role-Based Access Control (RBAC)**.
*   **How**: Added an `authorize` middleware that checks the `role` field within the decrypted JWT token. Routes are now explicitly locked (e.g., `router.delete('/...', protect, authorize('super_admin'), ...)`).

### 2. Horizontal Privilege Escalation (IDOR)
*   **The Vulnerability**: An authenticated user from "Company A" could fetch or modify data from "Company B" by simply changing the `companyId` in the API request parameters.
*   **Prevention**: Implemented **Cross-Company Access Validation**.
*   **How**: Created the `checkCompanyAccess` middleware. It compares the `companyId` in the request URL with the `companyId` stored in the user's authenticated token. If they don't match, access is denied with a `403 Forbidden` error.

### 3. Session Fixation & Hijacking
*   **The Vulnerability**: Attackers could "fix" a session ID or use an old token to remain logged in indefinitely.
*   **Prevention**: **JWT Rotation & DB-Level Session tracking**.
*   **How**: 
    1.  The system generates a fresh JWT upon every login.
    2.  Added an `isLoggedIn` flag in the `User` database table. The `protect` middleware now verifies this flag on every request. If an admin logs a user out or deletes a company, the session is invalidated server-side immediately.

### 4. Mass Assignment (Overposting)
*   **The Vulnerability**: Attackers could inject hidden fields (like `isAdmin: true` or `role: 'super_admin'`) into profile update requests to upgrade their own permissions.
*   **Prevention**: **Explicit Field Extraction**.
*   **How**: Refactored controllers to use **Destructuring** for incoming data (e.g., `const { name, email } = req.body`). This ensures that even if an attacker sends extra fields, they are ignored by the server and never saved to the database.

### 5. Insecure Deserialization & XSS
*   **The Vulnerability**: Malicious scripts or serialized objects could be sent in request bodies to execute code on the server or browser.
*   **Prevention**: **Global Input Sanitization**.
*   **How**: Integrated `sanitizeInput` middleware that recursively scans all incoming JSON, Query, and Param data. It strips out `<script>`, `javascript:`, and `onEvent` handlers using regex before the data reaches any logic.

### 6. NoSQL & SQL Injection
*   **The Vulnerability**: Attackers could use database operators (like `{"$gt": ""}` or `' OR 1=1`) to bypass login or fetch all records.
*   **Prevention**: **ORM Parameterization & Type Validation**.
*   **How**: 
    1.  Used **Sequelize ORM**, which automatically parameterizes all queries.
    2.  Implemented `express-validator` schemas for login and registration to ensure inputs match expected types (strings/emails) before being sent to the database.

### 7. Brute-Force & Denial of Service (DoS)
*   **The Vulnerability**: Attackers could spam the login endpoint to crack passwords or crash the server.
*   **Prevention**: **Tiered Rate Limiting**.
*   **How**: Added `express-rate-limit`:
    *   **Login**: Max 5 attempts per 15 mins.
    *   **General API**: Max 100 requests per 15 mins.

---

## 🛠️ Security Stack Summary
| Feature | Technology | Status |
| :--- | :--- | :--- |
| Security Headers | **Helmet.js** | Enabled |
| Encryption | **Bcrypt.js** (10+ rounds) | Enabled |
| Token Auth | **JWT** (JSON Web Tokens) | Enabled |
| Input Validation | **Express-Validator** | Enabled |
| Sanitization | **Custom Regex Middleware** | Enabled |
| Rate Limiting | **Express-Rate-Limit** | Enabled |

---

## 🚦 How to Maintain Security
1.  **Restart the Backend**: Any changes to `server.js` require a restart (`node server.js`) to apply the new middleware.
2.  **Environment Variables**: Ensure `JWT_SECRET` in your `.env` is a high-entropy random string.
3.  **HTTPS**: Always deploy the backend with an SSL certificate to protect tokens in transit.
