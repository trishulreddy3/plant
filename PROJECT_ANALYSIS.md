# Solar Plant Monitoring System - Project Analysis

## 📋 Executive Summary

**Microsyslogic Insight Solar** is a comprehensive solar plant monitoring and management system designed for multi-tenant operations with role-based access control. The system provides real-time panel health monitoring, fault detection, repair simulation, and administrative tools for managing multiple solar plants.

**Current Status**: Production-ready with file-based storage, transitioning to MongoDB for scalability.

---

## 🏗️ Architecture Overview

### Technology Stack

#### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.19
- **UI Library**: 
  - Radix UI (headless components)
  - Shadcn UI components
  - Tailwind CSS 3.4.17
- **State Management**: React Context API
- **Routing**: React Router v6.30.1
- **Data Fetching**: TanStack Query 5.83.0
- **Form Handling**: React Hook Form 7.61.1
- **Validation**: Zod 3.25.76

#### Backend
- **Runtime**: Node.js with Express 4.18.2
- **Database**: MongoDB (Mongoose 9.0.2) - **Currently migrating from file-based storage**
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcryptjs 3.0.2
- **Security**: 
  - Helmet.js 8.1.0
  - Express Rate Limit 8.1.0
  - Express Validator 7.2.1
- **Session Management**: Express Session 1.18.2

#### Deployment
- **Frontend**: Netlify (configured in `netlify.toml`)
- **Backend**: Render (configured in `render.yaml`)
- **Development Server**: Vite dev server on port 8080
- **Backend Server**: Express on port 5000

---

## 📁 Project Structure

```
plant-main/
├── backend/
│   ├── companies/              # File-based storage (legacy, migrating to MongoDB)
│   ├── db/                     # MongoDB connection and adapters
│   │   ├── db.js              # Database connection
│   │   └── dataAdapter.js     # Data access layer
│   ├── models/                 # Mongoose schemas
│   │   ├── Plant.js           # Company/Plant schema
│   │   ├── SuperAdmin.js      # Super admin schema
│   │   ├── Ticket.js           # Resolved tickets schema
│   │   ├── LoginCredentials.js
│   │   ├── LoginDetails.js
│   │   ├── NodeFaultStatus.js
│   │   └── LiveData.js
│   ├── middleware/
│   │   └── security.js        # Security middleware
│   ├── services/
│   │   └── solarService.js    # Solar panel logic
│   ├── scripts/                # Utility and migration scripts
│   ├── utils/
│   │   ├── jwtUtils.js        # JWT token management
│   │   └── passwordUtils.js   # Password hashing
│   └── server.js              # Main Express server (2645 lines)
│
├── src/
│   ├── components/
│   │   ├── auth/              # Login components
│   │   ├── common/            # Shared components
│   │   ├── routing/          # Route guards and navigation
│   │   ├── ui/               # Shadcn UI components (52 files)
│   │   ├── UnifiedDashboard.tsx
│   │   └── UnifiedViewTables.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx    # Global authentication state
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── useNavigation.ts
│   ├── lib/
│   │   ├── auth.ts            # Auth utilities
│   │   ├── realFileSystem.ts  # Backend API client (362 lines)
│   │   ├── data.ts
│   │   ├── companySync.ts
│   │   └── utils.ts
│   ├── pages/                 # Route pages
│   │   ├── Welcome.tsx
│   │   ├── UnifiedLogin.tsx
│   │   ├── SuperAdminDashboard.tsx
│   │   ├── PlantAdminDashboard.tsx
│   │   ├── TechnicianDashboard.tsx
│   │   ├── Infrastructure.tsx
│   │   ├── Staff.tsx
│   │   ├── AddStaff.tsx
│   │   ├── ExistingStaffMembers.tsx
│   │   └── ... (20+ pages)
│   └── utils/
│       └── cookieManager.ts
│
├── public/
│   └── images/
│       └── panels/            # Panel status images (good.png, moderate.png, bad.png)
│
├── backend/companies/         # Legacy file storage (being phased out)
└── Configuration files
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── netlify.toml
    └── render.yaml
```

---

## 🔐 Authentication & Authorization

### User Roles

| Role | Access Level | Dashboard Route | Key Permissions |
|------|-------------|-----------------|-----------------|
| **Super Admin** | System-wide | `/super-admin-dashboard` | • View all companies<br>• Create/delete companies<br>• Monitor all plants<br>• Full system access |
| **Plant Admin** | Company-specific | `/plant-admin-dashboard` | • Manage own company<br>• Infrastructure management<br>• Staff management<br>• Table configuration |
| **Technician** | View-only | `/technician-dashboard` | • View panel monitoring<br>• View defects<br>• Resolve tickets<br>• No editing capabilities |
| **Management** | Company-specific | (Embedded in Plant Admin) | • View company data<br>• Limited management |

### Authentication Flow

1. **Login Process** (`src/contexts/AuthContext.tsx:188-244`)
   - Super Admin: Frontend-only check (`admin@pm.com` / `superadmin123`)
   - Plant Admin/Technician: Backend API call to `/api/auth/login`
   - Backend validates against MongoDB (or legacy file system)
   - Returns JWT token and user object
   - Frontend stores user in context and localStorage

2. **Session Management**
   - JWT tokens for API authentication
   - Auto-login component checks localStorage on app load
   - Session expiry handling
   - Auto-logout on company deletion

3. **Route Protection** (`src/components/routing/ProtectedRoute.tsx`)
   - Role-based route guards
   - Automatic redirects for unauthorized access
   - Protected routes require authentication

---

## 📊 Data Architecture

### Current State: Hybrid (File-based → MongoDB Migration)

#### Legacy File System (Being Phased Out)
- **Location**: `backend/companies/{companyName}/`
- **Files**:
  - `plant_details.json` - Plant configuration and panel data
  - `admin.json` - Plant admin credentials
  - `technicians.json` - Technician accounts
  - `management.json` - Management accounts
  - `entries/entries.json` - Unified staff entries

#### MongoDB Schema (Current Primary)

**Company Schema** (`backend/models/Plant.js`):
```javascript
{
  companyId: String (unique),
  companyName: String,
  
  // Embedded Collections
  login_credentials: [UserSchema],      // Staff data
  login_details: [UserSchema],          // Session data
  node_fault_status: [FaultStatusSchema],
  live_data: [LiveDataSchema],          // Solar panel data
  
  // Legacy Structure (for compatibility)
  admin: UserSchema,
  management: [UserSchema],
  technicians: [UserSchema],
  entries: [UserSchema],
  
  // Plant Configuration
  plantDetails: {
    plantPowerKW: Number,
    voltagePerPanel: Number (default: 20),
    currentPerPanel: Number (default: 9.9),
    lastUpdated: Date,
    live_data: []  // Linked to root live_data
  }
}
```

**Live Data Structure**:
```javascript
{
  id: String,
  node: String,              // e.g., "Node-001" or "TBL-0001"
  serialNumber: String,      // Legacy support
  panelCount: Number,
  panelVoltages: [Number],   // Array of panel voltages
  current: Number,           // Series current (same for all panels)
  temperature: Number,
  lightIntensity: Number,
  time: Date
}
```

### Data Synchronization

The system maintains backward compatibility with file-based storage while migrating to MongoDB:

1. **Dual Write**: New data written to both MongoDB and files (during transition)
2. **Read Priority**: MongoDB first, fallback to files
3. **Sync Scripts**: Migration utilities in `backend/scripts/`

---

## ⚡ Real-Time Panel Simulation

### Panel Health States

| State | Health Range | Visual Indicator | Description |
|-------|-------------|------------------|-------------|
| **GOOD** | 50-100% | Blue border | Normal operation |
| **MODERATE** | 20-49% | Orange border | Minor defect, repairing |
| **BAD** | 0-19% | Red border | Critical fault |

### Simulation Logic (`backend/services/solarService.js`)

1. **Series Connection Physics**
   - Panels connected in series
   - **Weakest panel determines current flow**
   - If panel 5 is faulty, panels 5+ show reduced current
   - Voltage health calculated per panel: `(actualVoltage / expectedVoltage) * 100`

2. **Fault Introduction**
   - 80% chance per cycle to introduce fault
   - 40%: Critical fault (health < 20%)
   - 60%: Minor issue (health 20-49%)
   - Only ONE panel per series per cycle

3. **Repair Simulation**
   - Automatic progression over time
   - FAULT (0-19%): +2-5% per cycle (10 seconds)
   - REPAIRING (20-49%): +3-7% per cycle
   - GOOD (≥50%): Maintain good condition

4. **Auto-Refresh** (`backend/server.js`)
   - Runs every 10 seconds
   - Updates all companies' panel data
   - Maintains repair progression state
   - Simulates realistic power generation

### Defect Detection (`src/pages/TechnicianDashboard.tsx`)

- **Voltage-based detection**: Uses `panelVoltages` array to identify defects
- **Natural variation**: ±0.2V considered normal
- **Defect threshold**: Voltage health < 98% flagged as defect
- **Category assignment**:
  - BAD: Voltage health < 50%
  - MODERATE: Voltage health 50-98%

---

## 🔄 API Architecture

### API Client (`src/lib/realFileSystem.ts`)

**Key Features**:
- **Dynamic API URL Resolution**: 
  - Development: `http://localhost:5000/api` or `http://<hostname>:5000/api` (for mobile)
  - Production: `https://plant-9uk7.onrender.com/api`
- **Circuit Breaker Pattern**: Prevents spam when server is down
- **Request Timeout**: 15 seconds
- **Error Handling**: Comprehensive error catching and logging

**Main Functions**:
```typescript
- getAllCompanies(): Promise<CompanyFolder[]>
- createCompanyFolder(companyData): Promise<CompanyFolder>
- getPlantDetails(companyId): Promise<PlantDetails>
- addTableToPlant(companyId, tableData): Promise<void>
- addUserToCompany(companyId, userData): Promise<void>
- updateStaffEntry(companyId, entryId, data): Promise<void>
- deleteStaffEntry(companyId, entryId): Promise<void>
- resolvePanel(companyId, tableId, position, index): Promise<void>
- getResolvedTickets(companyId, filters): Promise<ResolvedTicket[]>
```

### Backend API Endpoints (`backend/server.js`)

#### Company Management
```
GET    /api/companies                    # List all companies
POST   /api/companies                    # Create company
GET    /api/companies/:companyId         # Get company details
DELETE /api/companies/:companyId         # Delete company
```

#### Authentication
```
POST   /api/auth/login                  # User/Admin login
POST   /api/verify-super-admin-password # Verify super admin
```

#### Plant Management
```
GET    /api/companies/:companyId/plant-details
POST   /api/companies/:companyId/tables  # Add table
DELETE /api/companies/:companyId/tables/:tableId
PUT    /api/companies/:companyId/panels/current
PUT    /api/companies/:companyId/panels/resolve
```

#### Staff Management
```
GET    /api/companies/:companyId/entries        # List staff
POST   /api/companies/:companyId/entries        # Add staff
PUT    /api/companies/:companyId/entries/:entryId
DELETE /api/companies/:companyId/entries/:entryId
```

#### Tickets
```
GET    /api/companies/:companyId/tickets        # Get resolved tickets
POST   /api/companies/:companyId/tickets       # Create ticket
```

---

## 🎨 UI/UX Architecture

### Design System

- **Theme**: Glass-morphism design with gradient accents
- **Color Scheme**: 
  - Primary: Blue gradients
  - Success: Green
  - Warning: Orange/Yellow
  - Error: Red
- **Components**: 52 Shadcn UI components
- **Responsive**: Mobile-first with Tailwind breakpoints

### Key Pages

1. **Welcome Page** (`/`)
   - Landing page with role selection
   - Navigation to login pages

2. **Unified Login** (`/login`)
   - Single login form for all roles
   - Company name input
   - Demo credentials display
   - Mobile-responsive

3. **Super Admin Dashboard** (`/super-admin-dashboard`)
   - Company list with metrics
   - Add/delete companies
   - Company monitoring links

4. **Plant Admin Dashboard** (`/plant-admin-dashboard`)
   - Tabbed interface:
     - **Staff** (first tab)
     - **Infrastructure** (second tab)
   - Staff management
   - Infrastructure configuration

5. **Technician Dashboard** (`/technician-dashboard`)
   - Two tabs:
     - **Overall Plant Data**: Unified view tables
     - **Defects**: Defect list with filters
   - Connection status indicator
   - Server check button
   - Logout button
   - Mobile toolbar for controls

### Mobile Responsiveness

- **Login Pages**: 
  - Scaled logos on mobile
  - Responsive demo credentials
  - Hidden floating back buttons on small screens

- **Dashboards**:
  - Sticky headers with adjusted offsets
  - Mobile-friendly card views (replacing tables)
  - Non-sticky tabs on small screens
  - Mobile toolbar for Technician Dashboard

- **Tables**:
  - Desktop: Full table view
  - Mobile: Card-based list view

---

## 🔒 Security Features

### Authentication Security
- JWT token-based authentication
- Bcrypt password hashing
- Session management with expiry
- Role-based access control (RBAC)

### API Security
- **CORS Configuration**: 
  - Allowed origins: localhost, Netlify, Render
  - Credentials enabled
- **Rate Limiting**: Express rate limiter
- **Input Validation**: Express Validator
- **Security Headers**: Helmet.js
- **Request Timeout**: 15 seconds
- **Circuit Breaker**: Prevents cascading failures

### Data Security
- No passwords in API responses
- Company data isolation
- MongoDB connection with authentication
- Environment variable management

---

## 🚀 Deployment Configuration

### Frontend (Netlify)

**Configuration** (`netlify.toml`):
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: `VITE_API_BASE_URL`
- SPA redirects configured

**Build Process**:
1. Vite builds React app
2. TypeScript compilation
3. Asset optimization
4. Output to `dist/` folder

### Backend (Render)

**Configuration** (`render.yaml`):
- Runtime: Node.js
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`
- Port: Environment variable `PORT` (default: 5000)

**Environment Variables**:
- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI` (MongoDB connection string)

### Development Setup

**Frontend**:
```bash
npm install
npm run dev  # Starts on http://localhost:8080
```

**Backend**:
```bash
cd backend
npm install
npm run dev  # Starts on http://localhost:5000
```

**Mobile Development**:
- Frontend dynamically resolves API URL to `http://<hostname>:5000/api`
- Allows mobile devices on same network to connect
- CORS configured to allow local network access

---

## 📈 Key Features

### ✅ Implemented Features

1. **Multi-Tenancy**
   - Multiple companies with isolated data
   - Company-specific authentication
   - Data segregation

2. **Role-Based Access Control**
   - Super Admin, Plant Admin, Technician roles
   - Route-level protection
   - Component-level permissions

3. **Real-Time Panel Monitoring**
   - Live panel health simulation
   - Auto-refresh every 10 seconds
   - Visual status indicators
   - Voltage and current tracking

4. **Fault Detection & Resolution**
   - Automatic fault detection
   - Defect categorization (BAD, MODERATE)
   - Ticket system for resolved defects
   - Panel resolution workflow

5. **Infrastructure Management**
   - Add/remove tables
   - Configure panel counts
   - Plant power settings
   - Table serialization

6. **Staff Management**
   - Add/edit/delete staff members
   - Role assignment (admin, technician, management)
   - Unified entries system
   - Phone number tracking

7. **Responsive Design**
   - Mobile-first approach
   - Tablet and desktop optimized
   - Touch-friendly interfaces
   - Adaptive layouts

8. **Data Persistence**
   - MongoDB integration
   - File-based fallback (legacy)
   - Data synchronization
   - Backup-friendly structure

---

## 🔧 Configuration Management

### Environment Variables

**Frontend** (`.env` or `netlify.toml`):
```env
VITE_API_BASE_URL=https://plant-9uk7.onrender.com/api
```

**Backend** (`.env`):
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://...
JWT_SECRET=...
```

### API URL Resolution (`src/lib/realFileSystem.ts`)

```typescript
export const getApiBaseUrl = () => {
  // 1. Check environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 2. Development mode
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  
  // 3. Production default
  return 'https://plant-9uk7.onrender.com/api';
};
```

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Data Storage Transition**
   - Migrating from file-based to MongoDB
   - Some endpoints still use file system
   - Dual-write during transition period

2. **Mobile Connectivity**
   - Requires same Wi-Fi network for development
   - Backend must be accessible from mobile device
   - CORS configuration for local network

3. **Performance**
   - Auto-refresh every 10 seconds (may be heavy for large plants)
   - No pagination for large datasets
   - File-based storage not scalable

4. **Error Handling**
   - Some error messages could be more user-friendly
   - Circuit breaker resets manually
   - Limited retry logic

### Areas for Improvement

1. **Real-time Updates**
   - WebSocket support for true real-time
   - Server-sent events (SSE)
   - Optimistic UI updates

2. **Caching**
   - React Query caching could be optimized
   - Backend response caching
   - CDN for static assets

3. **Testing**
   - Unit tests for components
   - Integration tests for API
   - E2E tests for critical flows

4. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - Component documentation
   - Deployment runbooks

---

## 📝 Development Workflow

### Adding New Features

1. **Backend**:
   - Add endpoint in `backend/server.js`
   - Update MongoDB schema if needed
   - Add validation and error handling
   - Test with Postman/curl

2. **Frontend**:
   - Add API function in `src/lib/realFileSystem.ts`
   - Create UI components in `src/components/`
   - Add route in `src/App.tsx`
   - Update types if needed

3. **Testing**:
   - Test locally with dev servers
   - Verify mobile responsiveness
   - Check error handling
   - Test authentication/authorization

### Code Patterns

- **Functional Components**: All React components use hooks
- **Context API**: Global state management
- **Service Layer**: API calls centralized in `realFileSystem.ts`
- **TypeScript**: Type safety throughout
- **Component Composition**: Reusable UI components

---

## 🔍 Debugging Tools

### Frontend
- React DevTools
- Browser console logs (emoji-prefixed)
- Network tab for API calls
- Circuit breaker status: `window.getCircuitBreakerStatus()`

### Backend
- Server logs in `backend/server_debug.txt`
- Console logging with timestamps
- Request/response logging middleware
- MongoDB query logging

### Common Debugging Commands

```bash
# Check circuit breaker status
window.getCircuitBreakerStatus()

# Reset circuit breaker
window.resetCircuitBreaker()

# Test API connection
window.testApiConnection()

# View backend logs
tail -f backend/server_debug.txt
```

---

## 📚 Documentation Files

- **DEPLOYMENT.md**: Deployment guide for Netlify and Render
- **WORKFLOW_ANALYSIS.md**: Detailed workflow documentation
- **SECURITY.md**: Security best practices
- **QUICK_DEPLOY.md**: Quick deployment steps

---

## 🎯 Use Cases

1. **Solar Plant Operators**
   - Monitor panel health in real-time
   - View defect reports
   - Track repair progress

2. **Plant Administrators**
   - Configure plant infrastructure
   - Manage staff members
   - Monitor company performance

3. **System Administrators**
   - Manage multiple plants
   - Create/delete companies
   - System-wide monitoring

4. **Technicians**
   - View assigned defects
   - Resolve panel issues
   - Track resolution history

---

## 🔮 Future Enhancements

1. **Real-time Communication**
   - WebSocket integration
   - Push notifications
   - Live chat support

2. **Advanced Analytics**
   - Historical data analysis
   - Performance trends
   - Predictive maintenance

3. **Mobile Apps**
   - Native iOS/Android apps
   - Offline mode
   - Push notifications

4. **Integration**
   - Third-party monitoring systems
   - Weather API integration
   - Energy trading platforms

---

**Generated**: January 2025  
**System**: Microsyslogic Insight Solar  
**Version**: 2.0 (MongoDB Migration)  
**Status**: Production Ready

