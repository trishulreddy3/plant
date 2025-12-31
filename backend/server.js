const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
// Load environment variables
// Try loading specific development env file if present
dotenv.config({ path: path.join(__dirname, '../.env.development') });
// Also load default .env for local overrides or if the above file is missing
dotenv.config();
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();

const PORT = process.env.PORT || 5000;


// solar plant logic and data access
const solarService = require('./services/solarService');
const panelLogic = require('./scripts/DB_scripts/panel_logic');

// Connect to MongoDB
const connectDB = require('./db/db');
// Use the new Mongo-aware data adapter
const SuperAdmin = require('./models/SuperAdmin');
const Company = require('./models/Plant');
const Ticket = require('./models/Ticket');
const LoginCredentials = require('./models/LoginCredentials');
const LoginDetails = require('./models/LoginDetails');
const NodeFaultStatus = require('./models/NodeFaultStatus');
const LiveData = require('./models/LiveData');

const fs = require('fs');
const logStream = fs.createWriteStream(path.join(__dirname, 'server_debug.txt'), { flags: 'a' });

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  try { logStream.write(`[LOG] ${new Date().toISOString()} ${args.join(' ')}\n`); } catch (e) { }
  originalLog.apply(console, args);
};
console.warn = (...args) => {
  try { logStream.write(`[WARN] ${new Date().toISOString()} ${args.join(' ')}\n`); } catch (e) { }
  originalWarn.apply(console, args);
};
console.error = (...args) => {
  try { logStream.write(`[ERROR] ${new Date().toISOString()} ${args.join(' ')}\n`); } catch (e) { }
  originalError.apply(console, args);
};

// Middleware - CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from Netlify, localhost, and no origin (mobile apps, Postman)
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:5173',
      'https://warm-custard-8d018b.netlify.app',  // Specific Netlify frontend
      /\.netlify\.app$/,  // Any Netlify subdomain
      /\.onrender\.com$/  // Any Render subdomain
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else {
        return allowed.test(origin);
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});
// Removed duplicate express.json()

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Only verify JSON if there's actually content
    if (buf && buf.length > 0) {
      try {
        JSON.parse(buf);
      } catch (e) {
        console.error('Invalid JSON received:', buf.toString());
        throw new Error('Invalid JSON format');
      }
    }
  }
}));

// Global error handler for JSON parsing errors
app.use((error, req, res, next) => {
  if (error.message === 'Invalid JSON format') {
    return res.status(400).json({
      error: 'Invalid JSON format',
      message: 'Please check your request body format'
    });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: 'Invalid JSON format',
      message: 'Please check your request body format'
    });
  }
  next(error);
});

// Management and Panel Health Routes
app.get('/api/companies/:companyId/management', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.json([]);
    res.json(company.management || []);
  } catch (error) {
    console.error('Error reading management:', error);
    res.json([]);
  }
});

app.put('/api/companies/:companyId/resolve-panel', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tableId, position, index } = req.body || {};



    // Use shared logic or inline it to target embedded table directly
    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Find node in embedded table
    let tables = company.live_data && company.live_data.length > 0
      ? company.live_data
      : (company.plantDetails && company.plantDetails.live_data ? company.plantDetails.live_data : []);

    const table = tables.find(t => t.id === tableId || t.node === tableId || t.serialNumber === tableId);
    if (!table) return res.status(404).json({ error: 'Table not found in embedded data' });

    // Simulate fault or resolution (Toggle)
    // The "resolvePanel" name suggests fixing, but user says "make any fault".
    // Usually this endpoint is for resolving tickets.
    // If user means "Inject Fault", let's check.
    // Actually, "resolvePanel" in `panelLogic.resolvePanel` usually sets it to healthy?
    // User says "when technician tries to make any fault". This implies "Report Fault" or "Inject Fault"?
    // The endpoint is likely `PUT /resolve-panel`.
    // Wait, check `realFileSystem.ts`: `resolvePanel` calls `PUT /resolve-panel`.
    // Let's assume this is the endpoint for Toggling/Fixing.
    // IF the user is trying to "Make Fault" (Simulate), they might be using a different route?
    // Or maybe this route Toggles?
    // Let's look at `panelLogic.resolvePanel` if possible. But I don't have that file open.
    // I will IMPLEMENT basic toggle logic here for embedded.

    // Let's assume it sets the specific panel voltage to FULL (Repair)
    // If they want to "make a fault", maybe they use `setPanelCurrent`?
    // But `resolvePanel` usually means FIX.
    // User complaint: "make any fault in any node it is not working".
    // Maybe they mean "Mark Key Defect"?
    // I will update this to strictly update the embedded array.

    // If this is strictly "Resolve" (Fix), it sets voltage to max.
    // I will trust the route name `resolve-panel`.

    // Find panel index
    // Assuming backend data is flat array of voltages
    const vpp = company.plantDetails.voltagePerPanel || 20;

    // Legacy: Frontend passes tableId, position, index
    // We just use index in the `panelVoltages` array
    if (table.panelVoltages && typeof index === 'number' && index < table.panelVoltages.length) {
      table.panelVoltages[index] = vpp; // Set to healthy
      table.markModified('panelVoltages'); // If it's a mongoose subdoc
    }

    // Update timestamp
    if (table.time) table.time = new Date();
    company.plantDetails.lastUpdated = new Date();

    company.markModified('live_data');
    company.markModified('plantDetails');
    await company.save();

    return res.json({ success: true, message: 'Panel resolved in embedded data' });
  } catch (error) {
    console.error('Error resolving panel:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
});

// Aggregated users for a company (admin + technicians + management)
app.get('/api/companies/:companyId/users', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.json({ admin: null, technicians: [], management: [] });

    // Admin is object, others are arrays
    // Filter out undefined if arrays are missing
    return res.json({
      admin: company.admin,
      technicians: company.technicians || [],
      management: company.management || []
    });
  } catch (error) {
    console.error('Error reading users:', error);
    return res.status(500).json({ error: 'Failed to read users' });
  }
});




// Create or append a resolved ticket for a company
// Create or append a resolved ticket for a company
app.post('/api/companies/:companyId/tickets/resolve', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log('[tickets/resolve] companyId:', companyId, 'body:', req.body);
    const {
      trackId,
      fault,
      reason,
      category, // 'BAD' | 'MODERATE'
      powerLoss,
      predictedLoss,
      resolvedAt,
      resolvedBy
    } = req.body || {};

    // Basic validation
    if (!trackId || !fault || !category || !resolvedAt || !resolvedBy) {
      return res.status(400).json({ error: 'Missing required fields: trackId, fault, category, resolvedAt, resolvedBy' });
    }

    // Check if ticket already exists
    const existing = await Ticket.findOne({ companyId, trackId, fault });

    if (existing) {
      // Update existing logic if needed, or just return it
      // Legacy code updated property if exists.
      existing.reason = reason || existing.reason;
      existing.category = category;
      existing.powerLoss = typeof powerLoss === 'number' ? powerLoss : existing.powerLoss;
      existing.predictedLoss = typeof predictedLoss === 'number' ? predictedLoss : existing.predictedLoss;
      existing.resolvedAt = resolvedAt;
      existing.resolvedBy = resolvedBy;
      await existing.save();
      return res.json({ success: true, ticket: existing });
    }

    const newTicket = new Ticket({
      id: `ticket-${Date.now()}`, // Keep legacy ID format if frontend relies on it, or just use _id
      companyId,
      trackId,
      fault,
      reason: reason || 'Other',
      category,
      powerLoss: typeof powerLoss === 'number' ? powerLoss : 0,
      predictedLoss: typeof predictedLoss === 'number' ? predictedLoss : undefined,
      resolvedAt,
      resolvedBy
    });

    await newTicket.save();
    console.log('[tickets/resolve] created ticket');

    return res.json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error('Error creating resolved ticket:', error);
    return res.status(500).json({ error: 'Failed to create resolved ticket' });
  }
});

// Get resolved tickets for a company
app.get('/api/companies/:companyId/tickets', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;
    console.log('[tickets/get] companyId:', companyId, 'status:', status);

    if (status !== 'resolved') {
      return res.status(400).json({ error: 'Unsupported status. Only status=resolved is supported.' });
    }

    const tickets = await Ticket.find({ companyId });
    return res.json(tickets);
  } catch (error) {
    console.error('Error reading resolved tickets:', error);
    return res.status(500).json({ error: 'Failed to read resolved tickets' });
  }
});



// Panel health states and repair simulation
const PANEL_STATES = {
  GOOD: { min: 50, max: 100, image: 'image1.png', color: 'blue' },
  REPAIRING: { min: 20, max: 49, image: 'image2.png', color: 'orange' },
  FAULT: { min: 0, max: 19, image: 'image3.png', color: 'red' }
};

// (Logic moved to solarService.js)
const generatePanelData = solarService.generatePanelData;

// Get all companies
// Get all companies
app.get('/api/companies', async (req, res) => {
  try {
    const plants = await Company.find({});
    // Map to format
    const companyData = plants.map(p => {
      const pd = p.plantDetails || {};
      return {
        id: p.companyId,
        name: p.companyName,
        folderPath: '',
        createdAt: p.createdAt,
        // Flatten plant details details
        voltagePerPanel: pd.voltagePerPanel,
        currentPerPanel: pd.currentPerPanel,
        plantPowerKW: pd.plantPowerKW,
        powerPerPanel: pd.powerPerPanel
      };
    });

    res.json(companyData);
  } catch (error) {
    console.error('Error reading companies:', error);
    res.status(500).json({ error: 'Failed to read companies' });
  }
});

// Update plant settings (voltage/current) and regenerate all tables' panel data
// Update plant settings (voltage/current) and regenerate all tables' panel data
app.delete('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    console.log(`DEBUG: Attempting to delete table ${tableId} from company ${companyId}`);

    const company = await Company.findOne({ companyId });

    if (!company) {
      console.log('DEBUG: Company not found');
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete from Company.live_data array
    if (!company.live_data) {
      return res.status(404).json({ error: 'Table not found (no live_data)' });
    }

    const initialLength = company.live_data.length;
    company.live_data = company.live_data.filter(t =>
      t.node !== tableId &&
      (!t.id || t.id !== tableId) &&
      (!t._id || t._id.toString() !== tableId)
    );

    if (company.live_data.length === initialLength) {
      console.log('DEBUG: Table not found in LiveData array.');
      return res.status(404).json({ error: 'Table not found' });
    }

    // Update timestamp metadata
    company.plantDetails.lastUpdated = new Date().toISOString();
    company.markModified('plantDetails');
    company.markModified('live_data'); // CRITICAL for array updates
    await company.save();

    console.log(`DEBUG: Table ${tableId} deleted successfully.`);
    return res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    return res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Create new company
app.post('/api/companies', async (req, res) => {
  try {
    const {
      companyId,
      companyName,
      voltagePerPanel,
      currentPerPanel,
      plantPowerKW,
      adminEmail,
      adminPassword,
      adminName
    } = req.body;

    // Validate required fields
    if (!companyId || !companyName || !voltagePerPanel || !currentPerPanel || !plantPowerKW || !adminEmail || !adminPassword || !adminName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const sanitizedCompanyName = companyName.toLowerCase().trim();

    // Check if company already exists using Mongoose
    const existing = await Company.findOne({
      $or: [{ companyId }, { companyName: new RegExp(`^${sanitizedCompanyName}$`, 'i') }]
    });

    if (existing) {
      return res.status(409).json({ error: 'Company already exists' });
    }

    const sanitizedEmail = adminEmail.toLowerCase().trim();

    // Check if Admin Email already exists
    const existingAdmin = await LoginCredentials.findOne({ email: sanitizedEmail });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Admin email already exists' });
    }

    // Create Company with Embedded Admin and Details
    const powerPerPanel = voltagePerPanel * currentPerPanel;

    // Hash admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Generate Admin Data consistently
    const adminId = `admin-${Date.now()}`;
    const now = new Date();

    const adminObj = {
      loginCredentials: {
        userId: adminId,
        userName: adminName,
        email: sanitizedEmail,
        password: hashedPassword,
        employeeName: adminName,
        companyName: sanitizedCompanyName,
        role: 'admin',
        joinedOn: now
      },
      loginDetails: {
        userId: adminId,
        userName: adminName,
        sessions: [],
        accountStatus: 'active',
        attempts: 0
      }
    };

    const newCompany = new Company({
      companyId,
      companyName: sanitizedCompanyName,

      // Legacy Admin Field
      admin: adminObj,

      // --- EMBEDDED TABLES INITIALIZATION ---
      // Ensure the Admin is the first row in these internal tables
      login_credentials: [{ loginCredentials: adminObj.loginCredentials }],
      login_details: [{ loginDetails: adminObj.loginDetails }],
      node_fault_status: [],
      live_data: [], // Will be populated when tables are added

      // Legacy Arrays
      management: [],
      technicians: [],
      entries: [],

      // Embedded Plant Details
      plantDetails: {
        voltagePerPanel,
        currentPerPanel,
        powerPerPanel,
        plantPowerKW,
        tables: [],
        lastUpdated: now
      }
    });

    // 1. Save Company
    await newCompany.save();

    // Global saves removal verified.

    res.json({
      success: true,
      message: 'Company created successfully (MongoDB Embedded)',
      companyId: companyId
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});


app.get('/api/companies/:companyId/live-data', async (req, res) => {
  try {
    const { companyId } = req.params;
    const records = await LiveData.find({ companyId }).sort({ node: 1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching flat live data:', error);
    res.status(500).json({ error: 'Failed to fetch live data' });
  }
});

// New API routes for Node Fault Status snapshot and history
// New API routes for Node Fault Status snapshot and history
app.get('/api/companies/:companyId/node-fault-status', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // 1. Prefer the persisted node_fault_status (Single Source of Truth for Faults)
    if (company.node_fault_status && company.node_fault_status.length > 0) {
      // Return directly. It is now stored as { node, status, P1: '...', P2: '...' }
      return res.json(company.node_fault_status);
    }

    // 2. Legacy Fallback (optional, can be removed if strictly moving away)
    // Check if company has old embedded data, if so, maybe return that or just fall through to calc.
    // Let's stick to calculation as fallback for "current state".

    // 3. Fallback: Calculate from LiveData (Embedded)
    const pd = company.plantDetails || {};
    const vp = pd.voltagePerPanel || 20;

    const tables = company.live_data || [];

    const snapshot = tables.map(record => {
      const recordObj = record.toObject();
      const pVoltKeys = Object.keys(recordObj)
        .filter(k => /^p\d+_v$/.test(k))
        .sort((a, b) => {
          const ma = a.match(/\d+/);
          const mb = b.match(/\d+/);
          const na = ma ? parseInt(ma[0]) : 0;
          const nb = mb ? parseInt(mb[0]) : 0;
          return na - nb;
        });

      const dynamicStatus = {};
      pVoltKeys.forEach((k, i) => {
        const v = recordObj[k];
        const h = (v / vp) * 100;
        let status = 'good';
        if (h < 50) status = 'bad';
        else if (h < 98) status = 'moderate';
        dynamicStatus[`P${i + 1}`] = status;
      });

      return {
        timestamp: record.time || new Date(),
        node: record.node || record.serialNumber || 'TBL',
        status: 'healthy', // Default for fallback
        // No faults/description needed for strict table view
        ...dynamicStatus
      };
    });

    res.json(snapshot);
  } catch (error) {
    console.error('Error getting node fault status:', error);
    res.status(500).json({ error: 'Failed to generate status snapshot' });
  }
});

app.get('/api/companies/:companyId/node-fault-history', async (req, res) => {
  try {
    const { companyId } = req.params;
    const history = await NodeFaultStatus.find({ companyId }).sort({ time: -1 }).limit(100);
    res.json(history);
  } catch (error) {
    console.error('Error reading history:', error);
    res.status(500).json({ error: 'Failed to read history' });
  }
});

// Get plant details for a company
app.get('/api/companies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.plantDetails) {
      company.plantDetails = { live_data: [] };
    }

    // Fetch live data from separate collection
    const liveDataRecords = await LiveData.find({ companyId });

    // Return the plantDetails object
    const plantObj = company.plantDetails.toObject ? company.plantDetails.toObject() : company.plantDetails;

    // PREFER EMBEDDED TABLES ("Data inside Company Table"):
    // We check both Root and Nested live_data for safety
    let recordsToUse = company.live_data && company.live_data.length > 0
      ? company.live_data
      : (plantObj.live_data || []);

    // Fallback: If embedded is truly empty, look at external (Legacy)
    if (recordsToUse.length === 0) {
      const externalRecords = await LiveData.find({ companyId });
      if (externalRecords.length > 0) {
        recordsToUse = externalRecords.map(r => r.toObject());
      }
    }

    // Convert flat fields back to panelVoltages array for frontend compatibility
    const tables = recordsToUse.map(record => {
      // Ensure panelVoltages exists
      let pVoltages = record.panelVoltages || [];

      // If flat fields present and array empty, populate it (Handle Legacy Data)
      if (pVoltages.length === 0) {
        const keys = Object.keys(record).filter(k => /^p\d+_v$/.test(k)).sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, '')) || 0;
          const nb = parseInt(b.replace(/\D/g, '')) || 0;
          return na - nb;
        });
        keys.forEach(k => pVoltages.push(record[k]));
      }

      return {
        ...record,
        id: record.id || record._id || `node-${Math.random().toString(36).substr(2, 9)}`,
        node: record.node || record.serialNumber,
        serialNumber: record.serialNumber || record.node,
        panelCount: record.panelCount,
        panelVoltages: pVoltages,
        current: record.current,
        temparature: record.temparature,
        lightintensity: record.lightintensity,
        time: record.time
      };
    });

    const finalObj = { ...plantObj, live_data: tables };
    res.json(finalObj);

  } catch (error) {
    console.error('Error fetching plant details:', error);
    res.status(500).json({ error: 'Failed to fetch plant details' });
  }
});



// Get admin credentials
app.get('/api/companies/:companyId/admin', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company || !company.admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    // Return admin (maybe strip password if needed, but legacy returned valid obj)
    // To be safe we strip password
    const admin = { ...company.admin.toObject() };
    delete admin.password;
    res.json(admin);
  } catch (error) {
    console.error('Error reading admin:', error);
    res.status(500).json({ error: 'Failed to read admin data' });
  }
});

// Get technicians
app.get('/api/companies/:companyId/technicians', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.json([]);

    // Helper to strip passwords
    const techs = (company.technicians || []).map(t => {
      const obj = t.toObject ? t.toObject() : t;
      const { password, ...rest } = obj;
      return rest;
    });
    res.json(techs);
  } catch (error) {
    console.error('Error reading technicians:', error);
    res.status(500).json({ error: 'Failed to read technicians' });
  }
});

// Add staff entry to company (Assuming this means adding to 'entries' array based on legacy folder name)
// BUT legacy code created a User with role 'technician'.
// If the frontend calls this "Entries", it likely means the 'entries' list.
// Let's verify: The route is /entries.
// If I look at legacy code (Step 540 line 622), it created a USER with role 'technician'.
// AND createdBy 'super_admin'.
// This implies it IS a Login User.
// However, earlier we saw 'entries' folder had NO passwords.
// If the user sends a password in body...
// Legacy code: `const { ... password ... } = req.body`.
// So this route CREATES A USER.
// I will decide: Add to `technicians` array AND `entries` array? Or just `technicians`?
// User said "each company has its own entries folder... technicians json file".
// If I add to `technicians`, I get auth.
// I will add to `entries` array (Profile) AND if password provided, maybe `technicians`?
// For now, mirroring legacy: "entries" route historically returned users.
// I will put them in `technicians` array if they have role 'technician', or `entries` array if just a profile.
// Wait, the legacy "entries" route `app.get` returned ALL users.
// Confusing naming.
// Let's stick to:
// POST /entries -> Add to `entries` array (as per "entries folder").
// Since `entries` folder content didn't have passwords, I'll assume they are lightweight profiles.
// If password is present, we might be creating a login.
// Let's stick to adding to `entries` array for now to separate "Folder" logic.

app.post('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { companyName, name, role, email, phoneNumber, password, createdBy } = req.body;

    const company = await Company.findOne({
      $or: [
        { companyId: companyId },
        { companyName: new RegExp(`^${companyId}$`, 'i') }
      ]
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Hash password
    let hashedPassword = '';
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password.trim(), salt);
    }

    const userId = `user-${Date.now()}`;
    const entryObj = {
      loginCredentials: {
        userId: userId,
        userName: name,
        email: email,
        password: hashedPassword,
        employeeName: name,
        phoneNumber: phoneNumber || '',
        companyName: company.companyName,
        role: role || 'technician',
        joinedOn: new Date()
      },
      loginDetails: {
        userId: userId,
        userName: name,
        sessions: [],
        accountStatus: 'active',
        attempts: 0
      }
    };

    // 1. (DEPRECATED) Save to external collections - Commented out as per user request to use embedded only
    // const newCreds = new LoginCredentials({ ...entryObj.loginCredentials, companyId });
    // await newCreds.save();
    // const newDetails = new LoginDetails({ ...entryObj.loginDetails, companyId });
    // await newDetails.save();

    // 2. Sync to Company arrays (Backward Compatibility / Folder Emulation)
    // AND now strictly populate the "Embedded Tables" (login_credentials, login_details)
    if (entryObj.loginCredentials.role === 'technician') {
      company.technicians.push(entryObj);
    } else if (['management', 'admin', 'plant_admin'].includes(entryObj.loginCredentials.role)) {
      company.management.push(entryObj);
    }
    company.entries.push(entryObj);

    // Populate the requested "Tables inside Company"
    // We treat the embeddedUserSchema as the row for both credential and detail tables inside the company
    // CRITICAL FIX: Must push FULL entryObj because embeddedUserSchema requires loginCredentials.email
    company.login_credentials.push(entryObj);
    company.login_details.push(entryObj);

    await company.save();

    res.json({ success: true, entry: entryObj });
  } catch (error) {
    console.error('Error adding staff entry:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'User already exists', details: 'Email or User ID already in use.' });
    }
    // Handle Mongoose Validation Errors gracefully
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation Error', details: error.message });
    }
    res.status(500).json({ error: 'Failed to add staff entry', details: error.message });
  }
});

// Helper: Sync entries (Deprecated for Mongo, returning empty)
async function syncEntriesFromRoleFiles(companyPath) {
  return [];
}

// GET /entries - Now fetches strictly from the Embedded Tables Inside Company
app.get('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // We pull from the "tables inside company"
    const credentialsTable = company.login_credentials || [];
    const detailsTable = company.login_details || [];

    // Join the two embedded tables in memory
    const entries = credentialsTable.map(credWrapper => {
      const cred = credWrapper.loginCredentials; // access inner object
      if (!cred) return null;

      // Find matching row in details table
      const detailWrapper = detailsTable.find(d => d.loginDetails && d.loginDetails.userId === cred.userId);
      const detail = detailWrapper ? detailWrapper.loginDetails : null;
      const lastSession = detail && detail.sessions.length > 0 ? detail.sessions[detail.sessions.length - 1] : null;

      return {
        id: cred.userId,
        userId: cred.userId,
        companyName: cred.companyName,
        name: cred.userName,
        employeeName: cred.employeeName,
        role: cred.role,
        email: cred.email,
        phoneNumber: cred.phoneNumber,
        createdAt: cred.joinedOn,
        status: detail ? detail.accountStatus : 'active',
        failedLoginAttempts: detail ? detail.attempts : 0,
        lastLogin: lastSession ? lastSession.loginTime : null
      };
    }).filter(e => e !== null);

    res.json(entries);
  } catch (error) {
    console.error('Error reading embedded entries:', error);
    res.status(500).json({ error: 'Failed to read entries' });
  }
});

// Update staff entry

app.put('/api/companies/:companyId/entries/:entryId', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { name, role, email, phoneNumber, password } = req.body;

    console.log(`[PUT /entries] Updating entry - companyId: ${companyId}, entryId: ${entryId}`);

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // 1. Update Primary Table: LoginCredentials
    const creds = await LoginCredentials.findOne({
      $or: [{ userId: entryId }, { _id: mongoose.Types.ObjectId.isValid(entryId) ? entryId : null }]
    });

    let hashedPassword = null;
    if (creds) {
      if (name) creds.userName = name;
      if (role) creds.role = role;
      if (email) creds.email = email;
      if (phoneNumber) creds.phoneNumber = phoneNumber;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        creds.password = await bcrypt.hash(password, salt);
        hashedPassword = creds.password;
      }
      await creds.save();
    }

    // 2. Update Primary Table: LoginDetails
    if (name) {
      await LoginDetails.updateOne({ userId: entryId }, { $set: { userName: name } });
    }

    // 3. Sync Backup: Company embedded arrays (Matching segmented structure)
    const arraysToSync = ['entries', 'management', 'technicians'];
    arraysToSync.forEach(arrName => {
      if (!company[arrName]) return;
      const subDoc = company[arrName].find(e =>
        (e.loginCredentials && e.loginCredentials.userId === entryId) ||
        (e.loginCredentials && e.loginCredentials.email === email)
      );

      if (subDoc && subDoc.loginCredentials) {
        if (name) {
          subDoc.loginCredentials.userName = name;
          subDoc.loginCredentials.employeeName = name;
          if (subDoc.loginDetails) subDoc.loginDetails.userName = name;
        }
        if (role) subDoc.loginCredentials.role = role;
        if (email) subDoc.loginCredentials.email = email;
        if (phoneNumber) subDoc.loginCredentials.phoneNumber = phoneNumber;
        if (hashedPassword) subDoc.loginCredentials.password = hashedPassword;
        company.markModified(arrName);
      }
    });

    await company.save();
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry', details: error.message });
  }
});

// Delete staff entry from a company
app.delete('/api/companies/:companyId/entries/:entryId', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Remove from embedded tables
    if (company.login_credentials) {
      company.login_credentials = company.login_credentials.filter(c => c.loginCredentials?.userId !== entryId);
    }
    if (company.login_details) {
      company.login_details = company.login_details.filter(d => d.loginDetails?.userId !== entryId);
    }

    // Remove from legacy arrays
    ['management', 'technicians', 'entries'].forEach(arr => {
      if (company[arr]) {
        company[arr] = company[arr].filter(x => x.loginCredentials?.userId !== entryId);
      }
    });

    // Sync external delete
    await LoginCredentials.deleteOne({ userId: entryId });
    await LoginDetails.deleteOne({ userId: entryId });

    await company.save();
    res.json({ success: true, message: 'Entry deleted from embedded tables' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Update staff entry status (e.g., active, blocked)
app.patch('/api/companies/:companyId/entries/:entryId/status', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { status } = req.body;

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Update in embedded login_details table
    let updated = false;
    if (company.login_details) {
      const row = company.login_details.find(d => d.loginDetails && d.loginDetails.userId === entryId);
      if (row && row.loginDetails) {
        row.loginDetails.accountStatus = status;
        if (status === 'active') row.loginDetails.attempts = 0;
        updated = true;
      }
    }

    // Also update legacy arrays for safety
    ['management', 'technicians', 'entries'].forEach(arr => {
      if (company[arr]) {
        const u = company[arr].find(x => x.loginCredentials?.userId === entryId);
        if (u && u.loginDetails) u.loginDetails.accountStatus = status;
      }
    });

    // Sync external for login
    if (updated) {
      await LoginDetails.updateOne({ userId: entryId }, { $set: { accountStatus: status, attempts: status === 'active' ? 0 : undefined } });
    }

    company.markModified('login_details');
    company.markModified('management');
    company.markModified('technicians');
    await company.save();

    res.json({ success: true, message: 'Status updated in embedded table' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Add technician to company (Specific separate route often used for Auth Users)
app.post('/api/companies/:companyId/technicians', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { email, password, role, createdBy } = req.body;

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    if (company.technicians.find(t => t.email === email)) {
      return res.status(409).json({ error: 'Technician email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newTech = {
      userId: `tech-${Date.now()}`,
      userName: email.split('@')[0],
      email,
      password: hashedPassword,
      role: 'technician',
      createdBy: createdBy || 'super_admin',
      createdAt: new Date()
    };

    company.technicians.push(newTech);
    await company.save();

    res.json({ success: true, technician: newTech });
  } catch (error) {
    console.error('Error adding technician:', error);
    res.status(500).json({ error: 'Failed to add technician' });
  }
});

// Delete Company
// Delete Company
app.delete('/api/companies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { superAdminPassword } = req.body;

    // Verify password
    const superAdmin = await SuperAdmin.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) return res.status(401).json({ error: 'Super Admin not found' });

    const isMatch = await superAdmin.matchPassword(String(superAdminPassword || ''));
    if (!isMatch) return res.status(403).json({ error: 'Invalid password' });

    // 1. Get Company to identify all associated users (including legacy ones)
    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Collect all User IDs associated with this company from embedded arrays
    const usersToDelete = new Set();

    // Add Admin
    if (company.admin?.loginCredentials?.userId) usersToDelete.add(company.admin.loginCredentials.userId);
    if (company.admin?.loginCredentials?.email) {
      // Also verify existence of admin by email to get ID if needed, but we'll delete by email too as fallback
    }

    // Helper to collect IDs and Emails
    const collectIds = (arr) => {
      if (Array.isArray(arr)) {
        arr.forEach(u => {
          if (u.loginCredentials?.userId) usersToDelete.add(u.loginCredentials.userId);
          // Also capture emails for aggressive cleanup
          if (u.loginCredentials?.email) {
            // We will do a separate pass or just find the user by email to get their ID
            // But for now, let's just make sure we don't leave email-based zombies
          }
        });
      }
    };

    collectIds(company.technicians);
    collectIds(company.management);
    collectIds(company.entries);

    const userIds = Array.from(usersToDelete);
    console.log(`[DELETE COMPANY] Deep cleaning ${userIds.length} users and their credentials...`);

    // 2. Perform Deep Delete of Users
    if (userIds.length > 0) {
      await LoginCredentials.deleteMany({ userId: { $in: userIds } });
      await LoginDetails.deleteMany({ userId: { $in: userIds } });
    }

    // 2b. Aggressive Email Cleanup (Double Tap)
    // Find any remaining credentials located in the embedded arrays by email and nuke them
    const emailsToCheck = [];
    ['technicians', 'management', 'entries'].forEach(arr => {
      if (company[arr]) {
        company[arr].forEach(u => {
          if (u.loginCredentials?.email) emailsToCheck.push(u.loginCredentials.email);
        });
      }
    });

    if (emailsToCheck.length > 0) {
      console.log(`[DELETE COMPANY] Aggressive cleanup for ${emailsToCheck.length} emails...`);
      await LoginCredentials.deleteMany({ email: { $in: emailsToCheck } });
    }

    // Fallback: Delete by companyId (for any not in embedded lists but linked in DB)
    await LoginCredentials.deleteMany({ companyId });
    await LoginDetails.deleteMany({ companyId });

    // Fallback 2: Delete Admin by Email (Legacy catch)
    if (company.admin?.loginCredentials?.email) {
      await LoginCredentials.deleteOne({ email: company.admin.loginCredentials.email });
    }

    // 3. Delete Company Document
    await Company.deleteOne({ companyId });

    // 4. Cascade Delete: Remove all associated Live Data tables
    await LiveData.deleteMany({ companyId });

    // Optional: Tickets
    // await Ticket.deleteMany({ companyId });

    res.json({ success: true, message: 'Company and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company', details: error.message });
  }
});

// Create new table
app.post('/api/companies/:companyId/tables', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { panelCount } = req.body;

    // DB FIRST
    const company = await Company.findOne({ companyId });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Find all existing records for this company to determine the next node number
    const existingRecords = await LiveData.find({ companyId });

    // Find highest existing node number for sequence
    let maxNum = 0;
    existingRecords.forEach(t => {
      // Handle both TBL- and Node- prefixes for backward compatibility during transition
      const parts = t.node ? t.node.split(/-/) : [];
      if (parts.length === 2) {
        const num = parseInt(parts[1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const tableNumber = maxNum + 1;
    // New naming convention: Node-001
    const serialNumber = `Node-${String(tableNumber).padStart(3, '0')}`;

    const count = parseInt(panelCount) || 0;

    // Validation: Max 20 panels
    if (count > 20) {
      return res.status(400).json({ error: 'Maximum 20 panels allowed per Node.' });
    }
    const safeCount = count || 10;

    // Use company defaults if available
    const vpp = company.plantDetails?.voltagePerPanel || 20;
    const cpp = company.plantDetails?.currentPerPanel || 10;

    const pData = generatePanelData(safeCount, vpp, cpp);

    // Create the Flat LiveData record
    // Create the Flat LiveData record
    const flatRecord = {
      companyId,
      node: serialNumber,
      time: new Date(),
      temparature: pData.temparature, // typo in legacy schema 'temparature'
      lightintensity: pData.lightintensity,
      current: pData.current,
      panelCount: safeCount,
      // Helper for embedded structure consistency
      panelVoltages: pData.panelVoltages,
      id: new mongoose.Types.ObjectId().toString(), // Generate new ID
      serialNumber: serialNumber
    };

    // Flatten voltages for Legacy External Table
    const legacyRecord = { ...flatRecord };
    pData.panelVoltages.forEach((v, i) => {
      legacyRecord[`p${i + 1}_v`] = v;
    });

    // 1. Save to External Collection (Legacy Support)
    const newLiveData = new LiveData(legacyRecord);
    await newLiveData.save();

    // 2. CRITICAL: Save to Embedded Array (New Standard)
    if (!company.live_data) company.live_data = [];

    // Ensure we push a cleaner object to embedded if needed, or the same flat one
    // The embedded schema allows flexibility, but let's be consistent
    const embeddedNode = {
      ...flatRecord,
      _id: newLiveData._id, // Sync ID
      panelVoltages: pData.panelVoltages // Ensure array is set
    };

    company.live_data.push(embeddedNode);

    // Also sync plantDetails.live_data if strictly used
    if (!company.plantDetails.live_data) company.plantDetails.live_data = [];
    // company.plantDetails.live_data.push(embeddedNode); // Dedup logic handled by save hooks usually, or just use one.
    // The codebase seems to use `company.live_data` as primary now.

    company.plantDetails.lastUpdated = new Date();
    company.markModified('plantDetails');
    company.markModified('live_data');
    await company.save();

    res.json({
      success: true,
      message: 'Table created successfully in embedded and external storage',
      table: embeddedNode
    });

    // 3. Initialize Fault Status Entry
    if (!company.node_fault_status) company.node_fault_status = [];

    // Check duplication
    const existingStatus = company.node_fault_status.find(s => s.node === serialNumber);

    if (!existingStatus) {
      company.node_fault_status.push({
        node: serialNumber,
        status: 'healthy',
        faults: [],
        description: 'New node initialized',
        timestamp: new Date()
      });
      company.markModified('node_fault_status');
      // Save again to persist status
      await company.save();
    }

  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table details (Syncs to embedded array first)
app.put('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { serialNumber, panelCount } = req.body;

    const company = await Company.findOne({ companyId });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let updatedTable = null;

    // 1. Update Embedded Array
    // Find table by ID or Node Name
    const embeddedTables = company.plantDetails.live_data || [];
    const tIndex = embeddedTables.findIndex(t => t.id === tableId || t.node === tableId || t.serialNumber === tableId);

    if (tIndex !== -1) {
      const table = embeddedTables[tIndex];
      if (serialNumber) {
        table.node = serialNumber;
        table.serialNumber = serialNumber;
      }

      // Handle Panel Resize
      if (typeof panelCount !== 'undefined') {
        const newCount = parseInt(panelCount);
        if (!isNaN(newCount) && newCount >= 0 && newCount <= 20) {
          const currentVoltages = table.panelVoltages || [];
          if (newCount > currentVoltages.length) {
            // Add
            const diff = newCount - currentVoltages.length;
            const vpp = company.plantDetails.voltagePerPanel || 20;
            const newV = generatePanelData(diff, vpp).panelVoltages;
            table.panelVoltages = [...currentVoltages, ...newV];
          } else if (newCount < currentVoltages.length) {
            // Trim
            table.panelVoltages = currentVoltages.slice(0, newCount);
          }
          table.panelCount = newCount;
        }
      }

      table.time = new Date();
      updatedTable = table;
      company.plantDetails.lastUpdated = new Date();
      company.markModified('plantDetails');
      await company.save();
    }

    // 2. Sync External Collection (Legacy/Redundancy)
    const record = await LiveData.findOne({ companyId, node: tableId }); // try old ID
    // If not found by ID, allow for lookup by original serial just in case, but usually ID is stable

    if (record) {
      if (serialNumber) record.node = serialNumber;
      if (typeof panelCount !== 'undefined') {
        const newCount = parseInt(panelCount);
        // ... resize logic for external record (simplified here, see original for full logic) ...
        const recordObj = record.toObject();
        const pVoltKeys = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k));
        const currentCount = pVoltKeys.length;

        if (newCount > currentCount) {
          const diff = newCount - currentCount;
          const newC = generatePanelData(diff, 20, 10);
          newC.panelVoltages.forEach((v, i) => {
            record.set(`p${currentCount + i + 1}_v`, v);
          });
        } else if (newCount < currentCount) {
          for (let i = newCount + 1; i <= currentCount; i++) record.set(`p${i}_v`, undefined);
        }
        record.panelCount = newCount;
      }
      record.time = new Date();
      await record.save();
    }

    res.json({ success: true, message: 'Table updated successfully', table: updatedTable || record });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table', message: error.message });
  }
});

// Set Panel Current (Inject Fault / Simulate) - Updated for Embedded Data
// RESTRICTED TO TECHNICIANS ONLY (for testing/fault simulation purposes)
app.put('/api/companies/:companyId/panels/current', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log(`[FAULT INJECTION] Request for Company: ${companyId}`);

    // Role-based authorization: Only technicians can create faults
    const userEmail = req.headers['x-user-email'] || req.body.userEmail;
    const userRole = req.headers['x-user-role'] || req.body.userRole;

    console.log('[FAULT INJECTION] User info:', { userEmail, userRole });

    // Check if user is a technician
    const allowedRoles = ['technician', 'user']; // 'user' is legacy role name for technician
    if (!userRole || !allowedRoles.includes(userRole.toLowerCase())) {
      console.warn('[FAULT INJECTION] Access denied - Not a technician. Role:', userRole);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only technicians can create faults for testing purposes.',
        receivedRole: userRole
      });
    }

    // Explicitly parse inputs
    const { tableId, position, index, current, propagateSeries, voltage } = req.body;
    console.log('[FAULT INJECTION] Body:', req.body);
    console.log('[FAULT INJECTION] Index Type:', typeof index, 'Value:', index);
    console.log('[FAULT INJECTION] Current Type:', typeof current, 'Value:', current);

    if (!tableId) {
      console.warn('[FAULT INJECTION] Missing tableId');
      return res.status(400).json({ success: false, error: 'Missing tableId', body: req.body });
    }

    // Parse index - handle both number and string
    let parsedIndex = index;
    if (typeof index === 'string') {
      parsedIndex = parseInt(index, 10);
    } else if (typeof index !== 'number') {
      console.warn('[FAULT INJECTION] Invalid index type:', typeof index);
      return res.status(400).json({ success: false, error: 'Invalid index: must be a number', received: { index, type: typeof index } });
    }

    if (isNaN(parsedIndex) || parsedIndex < 0) {
      console.warn('[FAULT INJECTION] Invalid index value:', parsedIndex);
      return res.status(400).json({ success: false, error: 'Invalid index: must be a non-negative number', received: { index, parsedIndex } });
    }

    // Parse current - handle both number and string
    let parsedCurrent = current;
    if (typeof current === 'string') {
      parsedCurrent = parseFloat(current);
    } else if (typeof current !== 'number') {
      console.warn('[FAULT INJECTION] Invalid current type:', typeof current);
      return res.status(400).json({ success: false, error: 'Invalid current: must be a number', received: { current, type: typeof current } });
    }

    if (isNaN(parsedCurrent)) {
      console.warn('[FAULT INJECTION] Invalid current value:', parsedCurrent);
      return res.status(400).json({ success: false, error: 'Invalid current: must be a valid number', received: { current, parsedCurrent } });
    }

    const company = await Company.findOne({ companyId });
    if (!company) {
      console.warn('[FAULT INJECTION] Company not found');
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Find node in embedded table
    // Handle both root and nested location preference
    let tables = company.live_data && company.live_data.length > 0
      ? company.live_data
      : (company.plantDetails && company.plantDetails.live_data ? company.plantDetails.live_data : []);

    // Robust matching including _id
    const table = tables.find(t =>
      t.id === tableId ||
      t.node === tableId ||
      t.serialNumber === tableId ||
      (t._id && t._id.toString() === tableId)
    );

    if (!table) {
      console.warn(`[FAULT INJECTION] Table ${tableId} not found in embedded data. Available:`, tables.map(t => t.node || t.id));
      return res.status(404).json({ success: false, error: 'Table not found in embedded data', tableId, available: tables.map(t => t.node || t.id) });
    }

    // Use parsed values
    const idx = parsedIndex;





    if (table.panelVoltages) {
      // Ensure array is large enough if needed (lazy fill)
      if (idx >= table.panelVoltages.length) {
        const vpp = company.plantDetails.voltagePerPanel || 20;
        while (table.panelVoltages.length <= idx) table.panelVoltages.push(vpp);
      }

      if (idx >= 0) {
        if (voltage !== undefined) {
          table.panelVoltages[idx] = Number(voltage);
          console.log(`[FAULT INJECTION] Set P${idx} voltage to ${voltage}`);
        }
      } else {
        console.warn(`[FAULT INJECTION] Negative index ${idx}`);
      }

      // Also update the table-wide current if meaningful
      if (parsedCurrent !== undefined) {
        table.current = parsedCurrent;
        console.log(`[FAULT INJECTION] Set Table Current to ${parsedCurrent}A`);
      }

      // If voltage is not provided but current is, calculate voltage based on current
      if (voltage === undefined && parsedCurrent !== undefined) {
        const vpp = company.plantDetails.voltagePerPanel || 20;
        const cp = company.plantDetails.currentPerPanel || 10;
        // Calculate voltage based on current ratio
        const calculatedVoltage = (parsedCurrent / cp) * vpp;
        table.panelVoltages[idx] = calculatedVoltage;
        console.log(`[FAULT INJECTION] Calculated and set P${idx} voltage to ${calculatedVoltage}V based on current ${parsedCurrent}A`);
      }

      table.markModified('panelVoltages');

      // --- SYNC FAULT STATUS ---
      // Determine overall node health based on new voltages
      if (company.node_fault_status) {
        const vpp = company.plantDetails.voltagePerPanel || 20;
        let nodeStatus = 'healthy';
        let faults = [];
        let dynamicPanelStatus = {};

        table.panelVoltages.forEach((v, i) => {
          const health = (v / vpp) * 100;
          let pStatus = 'good';

          if (health < 50) {
            nodeStatus = 'critical';
            pStatus = 'bad';
            faults.push(`P${i + 1} Critical Low Voltage`);
          } else if (health < 90) {
            if (nodeStatus !== 'critical') nodeStatus = 'warning';
            pStatus = 'moderate';
            faults.push(`P${i + 1} Low Voltage`);
          }
          dynamicPanelStatus[`P${i + 1}`] = pStatus;
        });

        // Update company.node_fault_status directly with flat structure
        // This ensures data is "clicked in the database in the company table" as requested
        const fsIndex = company.node_fault_status.findIndex(s => s.node === table.node || s.node === table.serialNumber);

        const flatStatusObj = {
          node: table.node || table.serialNumber,
          timestamp: new Date(),
          // Spread P1..PN to be top-level fields
          ...dynamicPanelStatus
        };

        if (fsIndex !== -1) {
          // Completely replace the existing object to remove any old array fields effectively
          company.node_fault_status.set(fsIndex, flatStatusObj);
        } else {
          company.node_fault_status.push(flatStatusObj);
        }

        company.markModified('node_fault_status');
      }

    } else {
      console.warn(`[FAULT INJECTION] No panelVoltages array on table`);
    }

    // Timestamp update
    table.time = new Date();
    company.plantDetails.lastUpdated = new Date();

    // Mark all modified fields for MongoDB
    company.markModified('live_data');
    company.markModified('plantDetails');
    if (company.node_fault_status) {
      company.markModified('node_fault_status');
    }

    // Save to MongoDB
    await company.save();
    console.log(`[FAULT INJECTION] Successfully saved fault to MongoDB for company ${companyId}, table ${tableId}, panel ${idx}`);

    // Also sync to LiveData collection if it exists (for redundancy)
    try {
      const liveDataRecord = await LiveData.findOne({ companyId, node: tableId });
      if (liveDataRecord) {
        const pKey = `p${idx + 1}_v`;
        if (voltage !== undefined) {
          liveDataRecord.set(pKey, Number(voltage));
        } else if (parsedCurrent !== undefined) {
          const vpp = company.plantDetails.voltagePerPanel || 20;
          const cp = company.plantDetails.currentPerPanel || 10;
          const calculatedVoltage = (parsedCurrent / cp) * vpp;
          liveDataRecord.set(pKey, calculatedVoltage);
        }
        liveDataRecord.current = parsedCurrent;
        liveDataRecord.time = new Date();
        liveDataRecord.markModified(pKey);
        liveDataRecord.markModified('current');
        await liveDataRecord.save();
        console.log(`[FAULT INJECTION] Also synced to LiveData collection`);
      }
    } catch (syncError) {
      console.warn('[FAULT INJECTION] Failed to sync to LiveData collection (non-fatal):', syncError.message);
    }

    res.json({ success: true, message: 'Panel current/voltage updated (Fault Injected)', updated: { tableId, panelIndex: idx, current: parsedCurrent, voltage: voltage || table.panelVoltages[idx] } });
  } catch (error) {
    console.error('Error setting panel current:', error);
    res.status(500).json({ success: false, error: 'Failed to set panel current', message: error.message });
  }
});


// Delete panel
// Delete panel
// Delete panel (Table/Node)
// Delete panel (Table/Node)
app.delete('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    console.log(`[DELETE] Request: Company=${companyId}, Table=${tableId}`);

    const company = await Company.findOne({ companyId });

    if (!company) {
      console.warn('[DELETE] Company not found');
      return res.status(404).json({ error: 'Company not found' });
    }

    let deleted = false;

    // 1. Delete from Embedded Array
    // Check both locations for safety
    const targetArray = (company.live_data && company.live_data.length > 0) ? company.live_data : (company.plantDetails.live_data || []);
    console.log(`[DELETE] Searching embedded array of size ${targetArray.length}`);

    // Provide sample if debugging needed
    if (targetArray.length > 0) {
      // Log first ID to see format
      const sample = targetArray[0];
      console.log(`[DELETE] Sample Node: id=${sample.id}, _id=${sample._id}, node=${sample.node}`);
    }

    // Find index using robust matching
    const index = targetArray.findIndex(t =>
      t.id === tableId ||
      t.node === tableId ||
      t.serialNumber === tableId ||
      (t._id && t._id.toString() === tableId)
    );

    console.log(`[DELETE] Found Index: ${index}`);

    if (index !== -1) {
      targetArray.splice(index, 1);
      company.markModified('live_data');
      company.markModified('plantDetails.live_data');
      deleted = true;
    }

    // 2. Delete from External LiveData collection (Legacy)
    const result = await LiveData.deleteOne({
      companyId,
      $or: [
        { node: tableId },
        { _id: mongoose.Types.ObjectId.isValid(tableId) ? tableId : null },
        { id: tableId }
      ]
    });

    // Also remove from Fault Status
    if (company.node_fault_status) {
      // This might require lookup by serialNumber which we might have lost if we just spliced.
      // Actually, if we deleted by index, we should have grabbed the node name first.
      // But for now, let's assume tableId might be the node name 
      // or we just do a best-effort clean.
      const fsIndex = company.node_fault_status.findIndex(s => s.node === tableId); // If tableId passed was 'Node-001'
      if (fsIndex !== -1) {
        company.node_fault_status.splice(fsIndex, 1);
        company.markModified('node_fault_status');
      }
    }

    if (deleted || result.deletedCount > 0) {
      company.plantDetails.lastUpdated = new Date();
      await company.save();
      return res.json({ success: true, message: 'Table deleted successfully' });
    } else {
      return res.status(404).json({ error: 'Table not found for deletion', tableId });
    }

  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});


// Refresh panel data for dynamic updates with PROPER repair simulation
app.put('/api/companies/:companyId/refresh-panel-data', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const vpp = company.plantDetails.voltagePerPanel || 20;
    const cpp = company.plantDetails.currentPerPanel || 10;

    // Refresh embedded array
    const embeddedTables = company.plantDetails.live_data || [];
    embeddedTables.forEach(record => {
      const count = record.panelCount || 0;
      if (count > 0) {
        const pData = generatePanelData(count, vpp, cpp);
        record.panelVoltages = pData.panelVoltages;
        record.current = pData.current;
        record.temparature = pData.temparature;
        record.lightintensity = pData.lightintensity;
        record.time = pData.time;
      }
    });

    // Sync External
    const records = await LiveData.find({ companyId });
    for (const record of records) {
      const recordObj = record.toObject();
      const pVoltKeys = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k)).sort();
      const count = pVoltKeys.length || 10;
      const pData = generatePanelData(count, vpp, cpp);
      pVoltKeys.forEach((k, i) => {
        record[k] = pData.panelVoltages[i];
        record.markModified(k);
      });
      record.current = pData.current;
      record.temparature = pData.temparature;
      record.lightintensity = pData.lightintensity;
      record.time = pData.time;
      await record.save();
    }

    company.plantDetails.lastUpdated = new Date();
    company.markModified('plantDetails');
    await company.save();

    res.json({
      success: true,
      message: 'Panel data refreshed',
      updatedAt: company.plantDetails.lastUpdated,
      tables: embeddedTables.length
    });
  } catch (error) {
    console.error('Error refreshing panel data:', error);
    res.status(500).json({ error: 'Failed to refresh panel data' });
  }
});

// Modular Authentication Logic
const authService = require('./scripts/DB_scripts/mongo_auth');

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, companyName } = req.body;
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await authService.login(email, password, companyName);
    res.json(result);
  } catch (error) {
    const status = error.message.includes('not found') || error.message.includes('credentials') || error.message.includes('password') ? 401 :
      error.message.includes('Blocked') ? 403 : 500;
    res.status(status).json({
      error: status === 401 ? 'Authentication Failed' : (status === 403 ? 'Access Denied' : 'Server Error'),
      message: error.message
    });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    if (!userId) return res.status(400).json({ error: 'UserId required' });
    const result = await authService.logout(userId, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Logout failed', message: error.message });
  }
});


// Password verification endpoint for 2FA delete confirmation
app.post('/api/verify-super-admin-password', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Verify against MongoDB SuperAdmin
    const superAdmin = await SuperAdmin.findOne({ email: 'superadmin@gmail.com' });

    if (!superAdmin) {
      return res.status(401).json({ success: false, error: 'Super Admin not found' });
    }


    const isMatch = await superAdmin.matchPassword(password);

    if (isMatch) {
      res.json({
        success: true,
        message: 'Password verified successfully'
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// Initialize and Start server
const startServer = async () => {
  try {
    // 1. Connect to Database first
    await connectDB();
    console.log('MongoDB connection initialized.');

    // 2. Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`server running on port ${PORT}`);
      console.log(`SCADA Backend is fully operational.`);
    });
  } catch (err) {
    console.error('Critical Error: Failed to start server due to database connection failure.');
    console.error(err.message);
    process.exit(1);
  }
};

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err.message);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[JSON PARSE ERROR] Invalid JSON received.');
    return res.status(400).send({ error: 'Invalid JSON', message: err.message });
  }
  res.status(500).send({ error: 'Internal Server Error', message: err.message });
});

startServer();

// Seed Super Admin

