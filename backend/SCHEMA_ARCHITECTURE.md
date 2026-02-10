# DATABASE SCHEMA ARCHITECTURE

## Overview
Your database uses a **Hybrid Multi-Schema Architecture**.
- **Public Schema**: Master registry for platform-wide data.
- **Tenant Schemas**: Isolated, high-performance data storage for each company.

---

## 📁 SCHEMA BREAKDOWN

### 1. **`public` Schema** (Global Registry)
**Purpose**: Centralized management and master lists.

#### Tables:
- **`super_admins`**: Platform-level accounts.
- **`companies`**: Registry of all companies with their meta-settings and plant configurations.
- **`users`**: Global registry of all staff members (used for high-level management).
- **`live_data`**: Global backup/registry of monitoring nodes.
- **`tickets`**: Unified issue tracking across all companies.
- **`login_logs`**: Global audit trail for logins.

---

### 2. **`tenant_<companyname>` Schema** (Company-Specific) ⭐ **PRIMARY DATA STORE**
**Purpose**: Complete isolation for operational data.

#### Example: `tenant_sunsolar`

Each tenant schema contains **FOUR** primary tables:

- **`login_credentials`**: 
  - Staff members belonging **only** to this company.
  - Primary source for company-specific logins.
  
- **`login_details`**: 
  - Real-time status tracking (online/offline/blocked).
  - Failed login attempt tracking (Blocked after 3 tries).
  
- **`live_data`**: 
  - Dynamic panel-level data.
  - Features individual columns for up to 20 panels (`p1v`, `p1c`, etc.).
  
- **`fault_tables`**: 
  - Health statuses for every panel (`G`: Good, `M`: Moderate, `B`: Bad).

---

## 🔄 DATA FLOW

### User Login:
1. System validates company exists in `public.companies`.
2. System validates user credentials in `tenant_<company>.login_credentials`.
3. If successful:
   - Updates `tenant_<company>.login_details` (status: active).
   - Creates a record in `public.login_logs`.

### Monitoring View:
1. System queries `tenant_<company>.live_data` for electrical readings.
2. System queries `tenant_<company>.fault_tables` for health statuses.
3. UI combines this data to render the plant layout.

---

## 🎯 BENEFITS
- ✅ **Security**: Data is physically separated by schema.
- ✅ **Performance**: Smaller tables mean faster queries.
- ✅ **Reliability**: A problem in one company's schema doesn't affect others.
- ✅ **Audit Ready**: Global logs allow platform-wide monitoring.
