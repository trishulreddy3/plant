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
app.use(express.json());

// Enhanced JSON parsing with error handling
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

app.put('/api/companies/:companyId/panels/current', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { tableId, position, index, current, voltage } = req.body || {};

    if (!companyId || !tableId || (position !== 'bottom' && position !== 'top') || typeof index !== 'number' || typeof current !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const plant = await panelLogic.updatePanelCurrent(companyId, { tableId, position, index, current, voltage });
    return res.json({ success: true, message: 'Panel status updated successfully', plant });
  } catch (error) {
    console.error('Error setting panel current:', error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
});

app.put('/api/companies/:companyId/resolve-panel', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tableId, position, index } = req.body || {};

    const plant = await panelLogic.resolvePanel(companyId, { tableId, position, index });
    return res.json({ success: true, message: 'Panel resolved', plant });
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
app.delete('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    console.log(`DEBUG: Attempting to delete table ${tableId} from company ${companyId}`);

    const company = await Company.findOne({ companyId });

    if (!company) {
      console.log('DEBUG: Company not found');
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete from LiveData collection
    const result = await LiveData.deleteOne({
      companyId,
      $or: [
        { node: tableId },
        { _id: mongoose.Types.ObjectId.isValid(tableId) ? tableId : null }
      ]
    });

    if (result.deletedCount === 0) {
      console.log('DEBUG: Table not found in LiveData.');
      return res.status(404).json({ error: 'Table not found' });
    }

    // Update timestamp metadata
    company.plantDetails.lastUpdated = new Date().toISOString();
    company.markModified('plantDetails');
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

    const newCompany = new Company({
      companyId,
      companyName: sanitizedCompanyName,

      // Restructured Admin (Matching segmented "tables")
      admin: {
        loginCredentials: {
          userId: `admin-${Date.now()}`,
          userName: adminName,
          email: sanitizedEmail,
          password: hashedPassword,
          employeeName: adminName,
          companyName: sanitizedCompanyName,
          role: 'admin',
          joinedOn: new Date()
        },
        loginDetails: {
          userId: `admin-${Date.now()}`, // Consistent ID if possible
          userName: adminName,
          sessions: [],
          accountStatus: 'active',
          attempts: 0
        }
      },

      // Initialize empty arrays for file-structure mirroring
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
        lastUpdated: new Date()
      }
    });

    // 1. Save Company
    await newCompany.save();

    // 2. Also save to new segregated tables
    try {
      await new LoginCredentials({
        userId: newCompany.admin.loginCredentials.userId,
        userName: adminName,
        email: sanitizedEmail,
        password: hashedPassword,
        employeeName: adminName,
        companyName: sanitizedCompanyName,
        companyId: companyId,
        role: 'admin',
        joinedOn: new Date()
      }).save();

      await new LoginDetails({
        userId: newCompany.admin.loginCredentials.userId,
        userName: adminName,
        sessions: [],
        accountStatus: 'active',
        attempts: 0,
        companyId: companyId
      }).save();

    } catch (saveError) {
      // Rollback Company creation if User creation fails
      console.error('Error creating user/details, rolling back company:', saveError);
      await Company.deleteOne({ companyId });
      if (saveError.code === 11000) {
        return res.status(409).json({ error: 'Admin email already exists (Duplicate Key)' });
      }
      throw saveError;
    }

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
app.get('/api/companies/:companyId/node-fault-status', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const pd = company.plantDetails || {};
    const vp = pd.voltagePerPanel || 20;

    const tables = await LiveData.find({ companyId });

    const snapshot = tables.map(record => {
      const row = {
        time: record.time || new Date(),
        node: record.node || 'TBL',
      };

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

      pVoltKeys.forEach((k, i) => {
        const v = recordObj[k];
        const h = (v / vp) * 100;
        let status = 'good';
        if (h < 50) status = 'bad';
        else if (h < 98) status = 'moderate';
        row[`p${i + 1}`] = status;
      });

      return row;
    });

    // History tracking removed to prevent DB flooding on GET requests
    /*
    try {
      for (const row of snapshot) {
        await NodeFaultStatus.findOneAndUpdate(
          { companyId, nodeName: row.node, time: row.time },
          { companyId, ...row },
          { upsert: true }
        );
      }
    } catch (dbErr) {
      console.warn('History background save failed:', dbErr.message);
    }
    */

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

    // Convert flat fields back to panelVoltages array for frontend compatibility
    const tables = liveDataRecords.map(record => {
      const table = record.toObject();
      const panelVoltages = [];
      const keys = Object.keys(table)
        .filter(k => /^p\d+_v$/.test(k))
        .sort((a, b) => {
          const ma = a.match(/\d+/);
          const mb = b.match(/\d+/);
          const na = ma ? parseInt(ma[0]) : 0;
          const nb = mb ? parseInt(mb[0]) : 0;
          return na - nb;
        });
      keys.forEach(k => panelVoltages.push(table[k]));

      return {
        ...table,
        panelVoltages,
        id: table.id || table.node || table._id.toString(), // Ensure ID for frontend
        serialNumber: table.node // Alias for frontend
      };
    });

    const details = {
      companyId: company.companyId,
      companyName: company.companyName,
      ...plantObj,
      live_data: tables
    };

    res.json(details);
  } catch (error) {
    console.error('Error reading plant details from DB:', error);
    res.status(500).json({ error: 'Failed to read plant details' });
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

    // 1. Save to Login Credentials collection (Primary)
    const newCreds = new LoginCredentials({ ...entryObj.loginCredentials, companyId });
    await newCreds.save();

    // 2. Save to Login Details collection (Primary)
    const newDetails = new LoginDetails({ ...entryObj.loginDetails, companyId });
    await newDetails.save();

    // 3. Sync to Company arrays (Backward Compatibility / Folder Emulation)
    if (entryObj.loginCredentials.role === 'technician') {
      company.technicians.push(entryObj);
    } else if (['management', 'admin', 'plant_admin'].includes(entryObj.loginCredentials.role)) {
      company.management.push(entryObj);
    }
    company.entries.push(entryObj);

    await company.save();

    res.json({ success: true, entry: entryObj });
  } catch (error) {
    console.error('Error adding staff entry:', error);
    res.status(500).json({ error: 'Failed to add staff entry' });
  }
});

// Helper: Sync entries (Deprecated for Mongo, returning empty)
async function syncEntriesFromRoleFiles(companyPath) {
  return [];
}

// Get staff entries for a company
app.get('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;

    // 1. Fetch all users for this company, excluding admins
    const users = await LoginCredentials.find({
      companyId,
      role: { $nin: ['admin', 'plant_admin', 'super_admin'] }
    });

    // 2. Map and join with their LoginDetails
    const entries = await Promise.all(users.map(async (u) => {
      const details = await LoginDetails.findOne({ userId: u.userId });
      const lastSession = details && details.sessions.length > 0 ? details.sessions[details.sessions.length - 1] : null;

      return {
        id: u.userId,
        userId: u.userId,
        companyName: u.companyName,
        name: u.userName,
        employeeName: u.employeeName,
        role: u.role,
        email: u.email,
        phoneNumber: u.phoneNumber,
        createdAt: u.joinedOn,
        status: details ? details.accountStatus : 'active',
        failedLoginAttempts: details ? details.attempts : 0,
        lastLogin: lastSession ? lastSession.loginTime : null
      };
    }));

    res.json(entries);
  } catch (error) {
    console.error('Error reading entries from new models:', error);
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
    console.log(`[DELETE /entries] Deleting entry - companyId: ${companyId}, entryId: ${entryId}`);

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // 1. Delete from new collections
    const userToDelete = await LoginCredentials.findOne({
      $or: [{ userId: entryId }, { _id: mongoose.Types.ObjectId.isValid(entryId) ? entryId : null }]
    });

    if (userToDelete) {
      const uId = userToDelete.userId;
      await LoginCredentials.deleteOne({ userId: uId });
      await LoginDetails.deleteOne({ userId: uId });
    }

    // 2. Existing logic for Company arrays (Backup/Sync)
    const arraysToSync = ['entries', 'management', 'technicians'];
    let removedCount = 0;

    arraysToSync.forEach(arrName => {
      if (!company[arrName]) return;

      const initialLen = company[arrName].length;
      company[arrName] = company[arrName].filter(e => {
        const mId = e._id ? e._id.toString() : '';
        const uId = (e.loginCredentials && e.loginCredentials.userId) || '';
        return (mId !== entryId && uId !== entryId);
      });

      if (company[arrName].length < initialLen) {
        removedCount++;
        company.markModified(arrName);
      }
    });

    // If we found them in the User table but not in the Company (unlikely but possible), it's still a "success"
    if (removedCount === 0 && !userToDelete) {
      return res.status(404).json({ error: 'Staff entry not found' });
    }

    await company.save();
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('[DELETE /entries] Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry', details: error.message });
  }
});

// Update staff entry status (e.g., active, blocked)
app.patch('/api/companies/:companyId/entries/:entryId/status', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    let updatedAny = false;

    // Update new LoginDetails table
    const details = await LoginDetails.findOne({ userId: entryId }) || await LoginDetails.findOne({ userId: (await LoginCredentials.findById(entryId))?.userId });
    if (details) {
      details.accountStatus = status;
      if (status === 'active') details.attempts = 0;
      await details.save();
      updatedAny = true;
    }

    // Backup: Keep admin and arrays in sync
    // Check admin
    if (company.admin && company.admin.loginCredentials) {
      if (company.admin.loginCredentials.userId === entryId || company.admin._id?.toString() === entryId) {
        if (company.admin.loginDetails) {
          company.admin.loginDetails.accountStatus = status;
          if (status === 'active') company.admin.loginDetails.attempts = 0;
        }
        updatedAny = true;
      }
    }

    // Check role arrays
    const arraysToSync = ['entries', 'management', 'technicians'];
    arraysToSync.forEach(arrName => {
      if (!company[arrName]) return;

      const subDoc = company[arrName].find(e =>
        (e.loginCredentials && e.loginCredentials.userId === entryId) ||
        e._id?.toString() === entryId
      );

      if (subDoc && subDoc.loginDetails) {
        subDoc.loginDetails.accountStatus = status;
        if (status === 'active') subDoc.loginDetails.attempts = 0;
        updatedAny = true;
      }
    });

    if (!updatedAny) {
      return res.status(404).json({ error: 'Staff entry not found' });
    }

    await company.save();
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error('Error updating entry status:', error);
    res.status(500).json({ error: 'Failed to update entry status' });
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

// Delete company folder
app.delete('/api/companies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Find and Delete from MongoDB
    const result = await Company.deleteOne({
      $or: [
        { companyId: companyId },
        { companyName: new RegExp(`^${companyId}$`, 'i') }
      ]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Company not found in database' });
    }

    res.json({ success: true, message: 'Company deleted successfully from database' });
  } catch (error) {
    console.error('Error deleting company from DB:', error);
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
    const flatRecord = {
      companyId,
      node: serialNumber,
      time: new Date(),
      temparature: pData.temparature,
      lightintensity: pData.lightintensity,
      current: pData.current,
      panelCount: safeCount
      // Removed panelsTop/panelsBottom
    };

    // Flatten voltages
    pData.panelVoltages.forEach((v, i) => {
      flatRecord[`p${i + 1}_v`] = v;
    });

    const newLiveData = new LiveData(flatRecord);
    await newLiveData.save();

    company.plantDetails.lastUpdated = new Date();
    company.markModified('plantDetails');
    await company.save();

    res.json({
      success: true,
      message: 'Table created successfully in flat structure',
      table: {
        ...flatRecord,
        panelVoltages: pData.panelVoltages // Return array to frontend
      }
    });

  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});
app.put('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { serialNumber } = req.body;

    const company = await Company.findOne({ companyId });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Update in LiveData collection
    const query = {
      companyId,
      $or: [
        { node: tableId },
        { _id: mongoose.Types.ObjectId.isValid(tableId) ? tableId : null }
      ]
    };

    const record = await LiveData.findOne(query);

    if (!record) {
      return res.status(404).json({ error: 'Table record not found in LiveData' });
    }

    if (serialNumber) {
      record.node = serialNumber;
    }

    if (typeof panelCount !== 'undefined') {
      const newCount = parseInt(panelCount);
      if (!isNaN(newCount) && newCount >= 0 && newCount <= 20) {
        // Calculate current panel count
        const recordObj = record.toObject();
        const pVoltKeys = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k));
        const currentCount = pVoltKeys.length;

        if (newCount > currentCount) {
          // Add panels
          const diff = newCount - currentCount;
          const vpp = company.plantDetails.voltagePerPanel || 20;
          const cpp = company.plantDetails.currentPerPanel || 10;
          const newC = generatePanelData(diff, vpp, cpp);

          newC.panelVoltages.forEach((v, i) => {
            const pNum = currentCount + i + 1;
            record[`p${pNum}_v`] = v;
          });

        } else if (newCount < currentCount) {
          // Remove panels (from end)
          for (let i = newCount + 1; i <= currentCount; i++) {
            record[`p${i}_v`] = undefined;
          }
        }

        record.panelCount = newCount;
      }
    }

    record.time = new Date();
    await record.save();

    company.plantDetails.lastUpdated = new Date();
    company.markModified('plantDetails');
    await company.save();

    res.json({ success: true, message: 'Table updated successfully in LiveData', table: record });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table', message: error.message });
  }
});


// Delete panel
// Delete panel
app.delete('/api/companies/:companyId/tables/:tableId/panels/:panelId', async (req, res) => {
  try {
    const { companyId, tableId, panelId } = req.params;
    const company = await Company.findOne({ companyId });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const record = await LiveData.findOne({ companyId, node: tableId });
    if (!record) {
      return res.status(404).json({ error: 'Table record not found in LiveData', tableId });
    }

    const recordObj = record.toObject();
    const pVoltKeys = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k)).sort();

    // Determine index to remove
    const parts = panelId.split('-P');
    let panelIndex = -1;
    if (parts.length > 1) {
      panelIndex = parseInt(parts[parts.length - 1]) - 1;
    } else {
      const pParts = panelId.split('-');
      panelIndex = parseInt(pParts[pParts.length - 1]);
      if (isNaN(panelIndex)) panelIndex = -1;
    }

    if (panelIndex >= 0 && panelIndex < pVoltKeys.length) {
      const voltages = pVoltKeys.map(k => recordObj[k]);
      voltages.splice(panelIndex, 1);

      // Clear all pXX_v fields
      pVoltKeys.forEach(k => {
        record.set(k, undefined);
      });

      // Re-add refilled voltages
      voltages.forEach((v, i) => {
        const pNum = (i + 1).toString().padStart(2, '0');
        record[`p${pNum}_v`] = v;
      });
    } else {
      return res.status(400).json({ error: 'Invalid panel ID or index out of range' });
    }

    company.plantDetails.lastUpdated = new Date();
    company.markModified('plantDetails');
    await company.save();
    await record.save();

    res.json({
      success: true,
      message: 'Panel deleted successfully',
      updatedTable: table
    });
  } catch (error) {
    console.error('Error deleting panel:', error);
    res.status(500).json({ error: 'Failed to delete panel', message: error.message });
  }
});

// Refresh panel data for dynamic updates with PROPER repair simulation
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

    const records = await LiveData.find({ companyId });

    for (const record of records) {
      const recordObj = record.toObject();
      const pVoltKeys = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k)).sort();
      const count = pVoltKeys.length || 10;
      const pData = generatePanelData(count, vpp, cpp);

      // Distribute new voltages
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
      message: 'Panel data refreshed in LiveData collection',
      updatedAt: company.plantDetails.lastUpdated,
      tables: records.length
    });
  } catch (error) {
    console.error('Error refreshing panel data:', error);
    res.status(500).json({ error: 'Failed to refresh panel data' });
  }
});

// Add panels to existing table
// Add panels to existing table
app.post('/api/companies/:companyId/tables/:tableId/add-panels', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { position, panelCount } = req.body;

    const company = await Company.findOne({ companyId });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const record = await LiveData.findOne({ companyId, node: tableId });
    if (!record) {
      return res.status(404).json({ error: 'Table record not found in LiveData' });
    }

    const vpp = company.plantDetails.voltagePerPanel || 20;
    const cpp = company.plantDetails.currentPerPanel || 10;

    const newPanelData = generatePanelData(panelCount, vpp, cpp);

    const recordObj = record.toObject();
    const existingPVolts = Object.keys(recordObj).filter(k => /^p\d+_v$/.test(k)).sort();
    const nextIndex = existingPVolts.length;

    newPanelData.panelVoltages.forEach((v, i) => {
      const pNum = nextIndex + i + 1;
      record[`p${pNum}_v`] = v;
      record.markModified(`p${pNum}_v`);
    });

    const now = new Date();
    record.time = now;
    company.plantDetails.lastUpdated = now;

    company.markModified('plantDetails');
    await company.save();
    await record.save();

    res.json({
      success: true,
      message: `${panelCount} panel(s) added successfully to LiveData`,
      table: record
    });
  } catch (error) {
    console.error('Error adding panels:', error);
    res.status(500).json({ error: 'Failed to add panels' });
  }
});

// Modular Authentication Logic (Tracked in scripts/DB_scripts)
const authService = require('./scripts/DB_scripts/mongo_auth');

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, companyName } = req.body;
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'Missing required fields', message: 'Email, password, and company name are required' });
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

// Helper function to find company folder by company name
// DEPRECATED
async function findCompanyFolderByName(companyName) {
  return null;
}

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

startServer();

// Seed Super Admin

