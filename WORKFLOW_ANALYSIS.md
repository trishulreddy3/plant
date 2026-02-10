# Solar Plant Monitoring System - Workflow Analysis

## 📋 Project Overview

**Microsyslogic Insight Solar** is a comprehensive solar plant monitoring and management system with role-based access control, real-time panel health simulation, and file-based data persistence.

---

## 🏗️ System Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **UI**: Radix UI + Tailwind CSS + Shadcn Components
- **Routing**: React Router v6
- **State Management**: React Context API
- **Data Storage**: File-based JSON (backend/companies/)

### Project Structure
```
├── backend/
│   ├── companies/              # Per-company data storage
│   │   ├── {companyName}/
│   │   │   ├── plant_details.json  # Plant config + table data
│   │   │   ├── admin.json          # Plant admin credentials
│   │   │   └── users.json          # User accounts
│   ├── server.js                   # Main Express server
│   └── middleware/                 # Security middleware
├── src/
│   ├── components/
│   │   ├── auth/                   # Login components
│   │   ├── dashboards/             # Role-specific dashboards
│   │   ├── panels/                 # Panel monitoring UI
│   │   └── ui/                     # Reusable UI components
│   ├── contexts/
│   │   └── AuthContext.tsx         # Global auth state
│   ├── lib/
│   │   ├── auth.ts                 # Auth utilities
│   │   └── realFileSystem.ts       # Backend API client
│   └── pages/                      # Route pages
```

---

## 🔐 Authentication & Authorization Flow

### 1. Login Flow

```
Welcome Page (/)
    ↓
Select Login Type
    ├─→ Admin Login (/admin-login)
    │   ├─→ Super Admin (admin@pm.com)
    │   └─→ Plant Admin (company-specific)
    │
    └─→ Technician Login (/technician-login)
        └─→ Technician (company-specific)
```

### 2. Authentication Process

**Frontend (src/contexts/AuthContext.tsx:192-246)**
1. User enters credentials (email, password, company name)
2. Check Super Admin credentials (local)
3. If not Super Admin, call backend API (`/api/auth/login`)
4. Backend validates against company files
5. On success, set user state in context
6. Redirect to role-specific dashboard

**Backend (backend/server.js:794-882)**
1. Validate required fields
2. Find company folder by name
3. Check admin.json first
4. Then check users.json
5. Return user object with role and company info

### 3. Role-Based Access Control

| Role | Access Level | Dashboard | Key Features |
|------|-------------|-----------|--------------|
| **Super Admin** | System-wide | `/super-admin-dashboard` | • View all companies<br>• Create/delete companies<br>• Monitor all plants<br>• User management |
| **Plant Admin** | Company-specific | `/plant-admin-dashboard` | • Manage own company<br>• Infrastructure management<br>• User management<br>• Table configuration |
| **Technician** | View-only | `/technician-dashboard` | • View panel monitoring<br>• No editing capabilities |

---

## 📊 Data Flow Architecture

### File-Based Data Storage

**Location**: `backend/companies/{companyName}/`

**File Structure**:
```json
// plant_details.json
{
  "companyId": "unique-id",
  "companyName": "SolarTech Solutions",
  "voltagePerPanel": 48,
  "currentPerPanel": 104.17,
  "powerPerPanel": 5000,
  "plantPowerKW": 50000,
  "tables": [
    {
      "id": "table-timestamp",
      "serialNumber": "TBL-0001",
      "panelsTop": 20,
      "panelsBottom": 20,
      "topPanels": {
        "voltage": [48.2, 47.8, ...],
        "current": [104.5, 103.2, ...],
        "power": [5038, 4932, ...],
        "health": [98.5, 96.2, ...],
        "states": ["good", "repairing", ...]
      },
      "bottomPanels": { ... }
    }
  ]
}

// admin.json
{
  "email": "admin@company.com",
  "password": "admin123",
  "name": "Admin Name"
}

// users.json
[
  {
    "id": "user-timestamp",
    "email": "user@company.com",
    "password": "user123",
    "role": "user",
    "createdAt": "ISO timestamp"
  }
]
```

### API Client (src/lib/realFileSystem.ts)

**Key Functions**:
- `getAllCompanies()` - Fetch all companies
- `createCompanyFolder()` - Create new company
- `getPlantDetails()` - Get plant data
- `addTableToPlant()` - Add table configuration
- `addUserToCompany()` - Add user account
- `refreshPanelData()` - Trigger panel simulation update

**Features**:
- Circuit breaker pattern for failed requests
- Request timeout (15 seconds)
- Retry logic with exponential backoff
- Environment-based API URL configuration

---

## ⚡ Real-Time Panel Simulation

### Simulation Engine (backend/server.js:117-286)

**Panel States**:
```javascript
GOOD:      Health 50-100% | Blue indicator
REPAIRING: Health 20-49%  | Orange indicator  
FAULT:     Health 0-19%   | Red indicator
```

**Series Connection Logic**:
- Panels connected in series
- **Weakest panel determines current flow**
- If panel 5 is faulty, panels 5+ show same status
- Current limited by lowest health panel

**Repair Simulation**:
```javascript
// Progression over time
FAULT (0-19%):    +2-5% per cycle (10 seconds)
REPAIRING (20-49%): +3-7% per cycle
GOOD (≥50%):      Maintain good condition
```

**Auto-Refresh (server.js:948-1011)**:
- Runs every 10 seconds
- Updates all companies' panel data
- Maintains repair progression state
- Simulates realistic power generation

### Fault Introduction

**Probability**: 80% chance to introduce fault
- **40%**: Critical fault (health < 20%)
- **60%**: Minor issue (health 20-49%)

Only ONE panel gets fault per series per cycle

---

## 🎯 User Workflows

### Super Admin Workflow

**Main Dashboard** (`SuperAdminDashboard.tsx`)
1. View all companies in system
2. See users per company
3. Navigate to company monitor
4. Add new company with configuration
5. Delete companies (with password confirmation)

**Company Management**:
```typescript
// Create Company
POST /api/companies
{
  companyId, companyName, voltagePerPanel,
  currentPerPanel, plantPowerKW,
  adminEmail, adminPassword, adminName
}

// Delete Company  
DELETE /api/companies/:companyId
```

**Company Monitor** (`CompanyMonitor.tsx`):
- View company plant details
- See all tables and panels
- Real-time panel health monitoring
- Drill down to individual panels

### Plant Admin Workflow

**Main Dashboard** (`PlantAdminDashboard.tsx`)
1. **Infrastructure** - Manage plant configuration
2. **Existing Users** - View and manage users
3. **Add New User** - Create user accounts

**Infrastructure Management** (`InfrastructureView.tsx`):
- View/Edit plant power settings
- Configure table layouts
- Add/remove tables
- Adjust panels per table (top/bottom rows)

**User Management** (`UserManagement.tsx`):
- List all users
- Delete users
- Add new users
- Auto-generate passwords

### Technician Workflow

**Dashboard** (`UserDashboard.tsx`):
- View-only panel monitoring
- Real-time data updates
- No editing capabilities
- Visual panel health indicators

**Panel Monitor** (`PanelMonitor.tsx`):
- Display all tables
- Show top and bottom panel rows
- Color-coded health status
- Power generation metrics
- Fault detection and reporting

---

## 🔄 Component Communication Flow

### Context Providers

**AuthContext** (`src/contexts/AuthContext.tsx`):
```typescript
interface AuthContextType {
  user: User | null;
  login: (email, password, companyName) => Promise<boolean>;
  logout: () => void;
  companies: Company[];
  addCompany: (company) => void;
  updateCompany: (id, company) => void;
  updateTableConfig: (companyId, tableNumber, topRow, bottomRow) => void;
  addTable: (companyId, topRow, bottomRow) => void;
  deleteTable: (companyId, tableNumber) => void;
  deleteCompany: (companyId, password) => boolean;
}
```

### Routing Flow

```typescript
// App.tsx - Main Router
<BrowserRouter>
  <AutoLogin>
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/user-login" element={<UserLogin />} />
      
      {/* Super Admin */}
      <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
      <Route path="/add-company" element={<AddCompany />} />
      <Route path="/company-monitor/:companyId" element={<CompanyMonitor />} />
      
      {/* Plant Admin */}
      <Route path="/plant-admin-dashboard" element={<PlantAdminDashboard />} />
      <Route path="/infrastructure" element={<Infrastructure />} />
      <Route path="/add-user" element={<AddUser />} />
      
      {/* User */}
      <Route path="/user-dashboard" element={<UserDashboard />} />
    </Routes>
  </AutoLogin>
</BrowserRouter>
```

### AutoLogin Component (`src/components/AutoLogin.tsx`)

**Purpose**: Check for existing session and redirect
- Checks localStorage for user
- Validates session is still active
- Redirects to appropriate dashboard
- Shows loading spinner during check

---

## 📡 API Endpoints

### Company Management
```
GET    /api/companies                    # List all companies
POST   /api/companies                     # Create company
GET    /api/companies/:companyId          # Get company details
DELETE /api/companies/:companyId          # Delete company
```

### Authentication
```
POST   /api/auth/login                    # User/Admin login
POST   /api/verify-super-admin-password   # Verify super admin password
```

### Plant Management
```
POST   /api/companies/:companyId/tables   # Add table
DELETE /api/companies/:companyId/tables/:tableId/panels/:panelId  # Delete panel
PUT    /api/companies/:companyId/refresh-panel-data  # Refresh simulation
POST   /api/companies/:companyId/tables/:tableId/add-panels       # Add panels
```

### User Management
```
GET    /api/companies/:companyId/users    # List users
POST   /api/companies/:companyId/users    # Add user
GET    /api/companies/:companyId/admin    # Get admin credentials
```

---

## 🎨 UI Component Hierarchy

### Panel Monitoring Components

```
PanelMonitor (Container)
├── System Metrics Display
├── Timer Component
├── Table Grid
│   ├── Table (Repeat for each table)
│   │   ├── Table Header
│   │   ├── Top Row Panels
│   │   │   └── SolarPanel (Repeat)
│   │   ├── Bottom Row Panels
│   │   │   └── SolarPanel (Repeat)
│   │   └── Edit Controls (Admin only)
│   └── Add Table Button (Admin only)
└── Info Dashboard
    ├── Fault List
    ├── Repair Process
    └── System Status
```

### SolarPanel Component (`src/components/panels/SolarPanel.tsx`)

**Visual States**:
- **Blue Border**: Good condition (≥50% health)
- **Orange Border**: Repairing (20-49% health)
- **Red Border**: Fault (<20% health)

**Display Data**:
- Panel ID
- Voltage (V)
- Current (A)
- Power (W)
- Health percentage

---

## 🔧 Configuration Management

### Environment Configuration

**Frontend** (`src/lib/realFileSystem.ts:5-32`):
```typescript
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD) {
    return 'https://solarplant.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};
```

**Backend** (`backend/server.js:7`):
```javascript
const PORT = process.env.PORT || 5000;
```

### CORS Configuration (`backend/server.js:10-42`)

**Allowed Origins**:
- `http://localhost:8080`
- `http://localhost:8081`
- `http://localhost:5173`
- `*.netlify.app`
- `*.onrender.com`

---

## 🔒 Security Features

### Authentication Security
- Session-based authentication
- Role-based access control
- Password verification endpoints
- Auto-logout on session expiry

### API Security
- CORS restrictions
- Request validation
- Error handling with circuit breaker
- Request timeout (15 seconds)

### Data Security
- No passwords in responses
- File-based storage (backup-friendly)
- Company isolation (separate folders)

---

## 🚀 Deployment

### Frontend
- **Platform**: Netlify (or similar)
- **Build**: `npm run build`
- **Output**: `dist/` folder
- **Configuration**: `netlify.toml`

### Backend
- **Platform**: Render (or similar)
- **Port**: Environment variable `PORT`
- **Start**: `node server.js`
- **Auto-refresh**: Enabled (10 seconds)

### Data Persistence
- File-based storage in `backend/companies/`
- Easy backup (copy folder)
- No database required
- JSON format for easy inspection

---

## 📈 Key Features Summary

### ✅ Implemented Features
1. **Multi-tenancy**: Multiple companies with isolated data
2. **Role-based access**: Super Admin, Plant Admin, User
3. **Real-time simulation**: Auto-refreshing panel data
4. **Health monitoring**: Visual status indicators
5. **Repair simulation**: Gradual health restoration
6. **Table management**: Add/remove tables and panels
7. **User management**: Create and manage users
8. **Series connection logic**: Physically accurate simulation
9. **Fault detection**: Automatic fault identification
10. **Responsive UI**: Modern glass-morphism design

### 🎯 Use Cases
- **Solar plant operators**: Monitor panel health
- **Plant administrators**: Configure infrastructure
- **System administrators**: Manage multiple plants
- **Users**: View-only monitoring dashboard

---

## 🔍 Debugging & Troubleshooting

### Circuit Breaker Status
```javascript
// Available in browser console
window.getCircuitBreakerStatus()  // Check failed endpoints
window.resetCircuitBreaker()      // Reset circuit breaker
window.testApiConnection()        // Test API connectivity
```

### Common Issues
1. **Backend not responding**: Check port 5000, verify server running
2. **CORS errors**: Check allowed origins in server.js
3. **Panel data not updating**: Verify auto-refresh interval
4. **Login fails**: Check credentials in company files

### Logging
- Frontend: Console logs with emoji prefixes
- Backend: Request/response logging
- Auto-refresh: Progress indicators

---

## 📝 Development Notes

### Adding New Features
1. Update backend API endpoints in `server.js`
2. Add frontend API calls in `realFileSystem.ts`
3. Create UI components in `src/components/`
4. Add routes in `App.tsx`
5. Update AuthContext if needed

### Code Patterns
- Functional components with hooks
- Context API for global state
- Service layer pattern (`lib/realFileSystem.ts`)
- Component composition
- TypeScript for type safety

---

**Generated**: January 2025  
**System**: Microsyslogic Insight Solar  
**Version**: 1.0

