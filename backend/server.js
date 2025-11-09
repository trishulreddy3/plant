const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Helper: keep entries.json consistent with role files
async function sanitizeCompanyEntries(companyPath) {
  try {
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const managementPath = path.join(companyPath, 'management.json');

    // Read entries
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
      if (!Array.isArray(entries)) entries = [];
    } catch (_) {
      entries = [];
    }

    // Read users
    let technicians = [];
    let management = [];
    try { technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim()); } catch (_) { technicians = []; }
    try { management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim()); } catch (_) { management = []; }

    const techEmails = new Set(technicians.map(t => `${t.email}|technician`));
    const mgmtEmails = new Set(management.map(m => `${m.email}|management`));

    const filtered = entries.filter(e => {
      if (!e || !e.email || !e.role) return false;
      const key = `${e.email}|${e.role}`;
      if (e.role === 'technician') return techEmails.has(key);
      if (e.role === 'management') return mgmtEmails.has(key);
      // keep admin entries as-is
      return e.role === 'admin';
    });

    // Only write if changed length to avoid churn
    if (filtered.length !== entries.length) {
      await fs.writeFile(entriesPath, JSON.stringify(filtered, null, 2));
    }
  } catch (err) {
    console.warn('sanitizeCompanyEntries warning:', err?.message || err);
  }
}

// Helper: ensure role data is separated correctly across files
async function sanitizeCompanyUsers(companyPath) {
  try {
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const managementPath = path.join(companyPath, 'management.json');
    const adminPath = path.join(companyPath, 'admin.json');

    // Read existing
    let technicians = [];
    let management = [];
    let admin = null;
    try { technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim()); } catch (_) { technicians = []; }
    try { management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim()); } catch (_) { management = []; }
    try { admin = JSON.parse((await fs.readFile(adminPath, 'utf8')).trim()); } catch (_) { admin = null; }

    const normalizedTechs = [];
    let updatedMgmt = Array.isArray(management) ? management.slice() : [];
    let updatedAdmin = admin && typeof admin === 'object' ? admin : null;

    for (const u of Array.isArray(technicians) ? technicians : []) {
      if (u && u.role === 'technician') {
        normalizedTechs.push(u);
      } else if (u && u.role === 'management') {
        // move to management list if not already exists by email
        if (!updatedMgmt.find(m => m.email === u.email)) {
          updatedMgmt.push(u);
        }
      } else if (u && u.role === 'admin') {
        // keep the latest admin by createdAt if present, else set directly
        if (!updatedAdmin) {
          updatedAdmin = { email: u.email, password: u.password, name: u.name || 'Admin', createdAt: u.createdAt || new Date().toISOString() };
        } else {
          const prev = new Date(updatedAdmin.createdAt || 0).getTime();
          const cur = new Date(u.createdAt || 0).getTime();
          if (isFinite(cur) && cur >= prev) {
            updatedAdmin = { email: u.email, password: u.password, name: u.name || updatedAdmin.name || 'Admin', createdAt: u.createdAt };
          }
        }
      }
    }

    // Write back if changes
    await fs.writeFile(techniciansPath, JSON.stringify(normalizedTechs, null, 2));
    await fs.writeFile(managementPath, JSON.stringify(updatedMgmt, null, 2));
    if (updatedAdmin) {
      await fs.writeFile(adminPath, JSON.stringify(updatedAdmin, null, 2));
    }
  } catch (err) {
    console.warn('sanitizeCompanyUsers warning:', err?.message || err);
  }
}
    });

// Get management users
app.get('/api/companies/:companyId/management', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    // Sanitize and then read management
    await sanitizeCompanyUsers(companyPath);
    const managementPath = path.join(companyPath, 'management.json');
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    let management = [];
    try {
      const mgmtData = await fs.readFile(managementPath, 'utf8');
      management = JSON.parse(mgmtData.trim());
      if (!Array.isArray(management)) management = [];
    } catch (_) {
      management = [];
    }
    management = management.filter(m => m && m.role === 'management');

    // Enrich with phone numbers from entries.json
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
      if (!Array.isArray(entries)) entries = [];
    } catch (_) { entries = []; }
    const byEmail = {};
    entries.forEach(e => { if (e && e.email) byEmail[e.email] = e; });
    const enriched = management.map(m => ({
      ...m,
      phoneNumber: m.phoneNumber || byEmail[m.email]?.phoneNumber || '',
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error reading management:', error);
    res.json([]);
  }
});

// Top-level route to set a panel's current (testing) — ensure registered after middleware
// Body: { tableId, position: 'top'|'bottom', index: number, current: number, propagateSeries?: boolean }
app.put('/api/companies/:companyId/panels/current', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { tableId, position, index, current, propagateSeries } = req.body || {};
    if (!companyId || !tableId || (position !== 'top' && position !== 'bottom') || typeof index !== 'number' || typeof current !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const companyFolder = await findCompanyFolder(companyId);
    if (!companyFolder) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const plantPath = path.join(companyFolder, 'plant_details.json');
    const raw = await fs.readFile(plantPath, 'utf8');
    const plant = JSON.parse(raw);

    const table = (plant.tables || []).find(t => t.id === tableId);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const vp = plant.voltagePerPanel;
    const cp = plant.currentPerPanel;
    const pp = plant.powerPerPanel || (vp * cp) / 1000;

    const key = position === 'top' ? 'topPanels' : 'bottomPanels';
    const panelSet = table[key] || { voltage: [], current: [], power: [] };

    const len = position === 'top' ? table.panelsTop : table.panelsBottom;
    if (!Array.isArray(panelSet.voltage)) panelSet.voltage = new Array(len).fill(vp);
    if (!Array.isArray(panelSet.current)) panelSet.current = new Array(len).fill(cp);
    if (!Array.isArray(panelSet.power)) panelSet.power = new Array(len).fill(pp);

    panelSet.current[index] = current;
    panelSet.voltage[index] = vp;
    panelSet.power[index] = (vp * current) / 1000;

    if (propagateSeries === true) {
      panelSet.actualFaultyIndex = index;
      panelSet.seriesState = 'fault';
      if (Array.isArray(panelSet.actualFaultStatus)) {
        panelSet.actualFaultStatus = panelSet.actualFaultStatus.map((_, i) => i === index);
      }
    } else if (propagateSeries === false) {
      panelSet.actualFaultyIndex = -1;
      panelSet.seriesState = 'good';
      if (Array.isArray(panelSet.actualFaultStatus)) {
        panelSet.actualFaultStatus = panelSet.actualFaultStatus.map(() => false);
      }
    }

    table[key] = panelSet;
    plant.lastUpdated = new Date().toISOString();

    await fs.writeFile(plantPath, JSON.stringify(plant, null, 2), 'utf8');
    return res.json({ success: true, message: 'Panel current updated', plant });
  } catch (error) {
    console.error('Error setting panel current (top-level):', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// (Removed misplaced duplicate panels/current route that was inside the CORS origin block)

// Create new table for a company
app.post('/api/companies/:companyId/tables', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { panelsTop, panelsBottom, serialNumber } = req.body || {};

    const topCount = Number.isFinite(panelsTop) ? Number(panelsTop) : 0;
    const bottomCount = Number.isFinite(panelsBottom) ? Number(panelsBottom) : 0;

    if (topCount < 0 || bottomCount < 0 || topCount > 20 || bottomCount > 20) {
      return res.status(400).json({ error: 'Invalid panel counts. Each row must be 0-20.' });
    }
    if (topCount === 0 && bottomCount === 0) {
      return res.status(400).json({ error: 'Provide at least one non-zero row (top or bottom).' });
    }

    const companyPath = await findCompanyFolder(companyId);
    console.log('[tickets/resolve] companyPath:', companyPath);
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);

    const tables = Array.isArray(plantDetails.tables) ? plantDetails.tables : [];
    // Determine next serial number
    let maxNum = 0;
    for (const t of tables) {
      const sn = String(t.serialNumber || '');
      const m = sn.match(/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) maxNum = Math.max(maxNum, n);
      }
    }
    const nextNum = maxNum + 1;
    const pad = (n) => String(n).padStart(4, '0');
    const nextSerial = serialNumber && typeof serialNumber === 'string' ? serialNumber : `TBL-${pad(nextNum)}`;

    // Generate panel arrays deterministically using existing plant specs
    const vpp = Number(plantDetails.voltagePerPanel) || 20;
    const cpp = Number(plantDetails.currentPerPanel) || 10;
    const topPanels = generatePanelData(topCount, vpp, cpp);
    const bottomPanels = generatePanelData(bottomCount, vpp, cpp);

    const newTable = {
      id: `table-${Date.now()}`,
      serialNumber: nextSerial,
      panelsTop: topCount,
      panelsBottom: bottomCount,
      createdAt: new Date().toISOString(),
      topPanels,
      bottomPanels,
    };

    tables.push(newTable);
    plantDetails.tables = tables;
    plantDetails.lastUpdated = new Date().toISOString();
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));

    return res.json({ success: true, message: 'Table created', table: newTable });
  } catch (error) {
    console.error('Error creating table:', error);
    return res.status(500).json({ error: 'Failed to create table' });
  }
});

// Resolve a panel issue: reset the culprit panel (and clear series markers)
// Body: { tableId: string, position: 'top'|'bottom', index: number }
app.put('/api/companies/:companyId/resolve-panel', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { tableId, position, index } = req.body || {};
    if (!companyId || !tableId || (position !== 'top' && position !== 'bottom') || typeof index !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const companyFolder = await findCompanyFolder(companyId);
    if (!companyFolder) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const plantPath = path.join(companyFolder, 'plant_details.json');
    const raw = await fs.readFile(plantPath, 'utf8');
    const plant = JSON.parse(raw);

    const table = (plant.tables || []).find(t => t.id === tableId);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const vp = plant.voltagePerPanel;
    const cp = plant.currentPerPanel;
    const pp = plant.powerPerPanel || (vp * cp) / 1000; // keep kW if present, else derive

    const key = position === 'top' ? 'topPanels' : 'bottomPanels';
    const panelSet = table[key] || { voltage: [], current: [], power: [] };

    // Reset ENTIRE STRING to defaults to fully clear series impact
    const len = position === 'top' ? table.panelsTop : table.panelsBottom;
    if (!Array.isArray(panelSet.voltage)) panelSet.voltage = new Array(len).fill(vp);
    if (!Array.isArray(panelSet.current)) panelSet.current = new Array(len).fill(cp);
    if (!Array.isArray(panelSet.power)) panelSet.power = new Array(len).fill(pp);
    for (let i = 0; i < len; i++) {
      panelSet.voltage[i] = vp;
      panelSet.current[i] = cp;
      panelSet.power[i] = pp;
    }

    // Clear series markers so downstream no longer shows as fault
    if (typeof panelSet.actualFaultyIndex !== 'undefined') {
      panelSet.actualFaultyIndex = -1;
    }
    if (typeof panelSet.seriesState !== 'undefined') {
      panelSet.seriesState = 'good';
    }
    if (Array.isArray(panelSet.actualFaultStatus)) {
      panelSet.actualFaultStatus = panelSet.actualFaultStatus.map(() => false);
    }

    // Also optionally normalize all panels to defaults if values missing
    ['voltage','current','power'].forEach(arrKey => {
      if (!Array.isArray(panelSet[arrKey])) panelSet[arrKey] = [];
    });

    // arrays already normalized above

    table[key] = panelSet;
    plant.lastUpdated = new Date().toISOString();

    await fs.writeFile(plantPath, JSON.stringify(plant, null, 2), 'utf8');
    return res.json({ success: true, message: 'Panel resolved and values reset', plant });
  } catch (error) {
    console.error('Error resolving panel:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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
    console.error('JSON parsing error:', error.message);
    return res.status(400).json({ 
      error: 'Invalid JSON format',
      message: 'Please check your request body format'
    });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON parsing error:', error.message);
    return res.status(400).json({ 
      error: 'Invalid JSON format',
      message: 'Please check your request body format'
    });
  }
  next(error);
});

// Aggregated users for a company (admin + technicians + management)
app.get('/api/companies/:companyId/users', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    // Sanitize role files before aggregating
    await sanitizeCompanyUsers(companyPath);
    
    const adminPath = path.join(companyPath, 'admin.json');
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const managementPath = path.join(companyPath, 'management.json');

    let admin = null;
    let technicians = [];
    let management = [];

    // Read admin
    try {
      const adminData = await fs.readFile(adminPath, 'utf8');
      admin = JSON.parse(adminData.trim());
    } catch (_) {
      admin = null;
    }

    // Read technicians
    try {
      const techData = await fs.readFile(techniciansPath, 'utf8');
      technicians = JSON.parse(techData.trim());
      if (!Array.isArray(technicians)) technicians = [];
    } catch (_) {
      technicians = [];
    }

    // Read management
    try {
      const mgmtData = await fs.readFile(managementPath, 'utf8');
      management = JSON.parse(mgmtData.trim());
      if (!Array.isArray(management)) management = [];
    } catch (_) {
      management = [];
    }

    return res.json({ admin, technicians, management });
  } catch (error) {
    console.error('Error reading users:', error);
    return res.status(500).json({ error: 'Failed to read users' });
  }
});

// Set environment based on PORT (must be before routes that use it)
const COMPANIES_DIR = path.join(__dirname, 'companies');

// Helper function to find company folder by companyId
async function findCompanyFolder(companyId) {
  try {
    const companies = await fs.readdir(COMPANIES_DIR);
    for (const folderName of companies) {
      const companyPath = path.join(COMPANIES_DIR, folderName);
      const stat = await fs.stat(companyPath);
      if (stat.isDirectory()) {
        // Direct match on folder name for convenience (case-sensitive)
        if (folderName === companyId) {
          return companyPath;
        }
        const plantDetailsPath = path.join(companyPath, 'plant_details.json');
        try {
          const plantData = await fs.readFile(plantDetailsPath, 'utf8');
          const plant = JSON.parse(plantData);
          // Match by stored companyId
          if (plant.companyId === companyId) {
            return companyPath;
          }
          // Also allow matching by companyName (case-insensitive)
          if (
            typeof plant.companyName === 'string' &&
            plant.companyName.trim().toLowerCase() === String(companyId).trim().toLowerCase()
          ) {
            return companyPath;
          }
        } catch (error) {
          continue;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding company folder:', error);
    return null;
  }
}

// Top-level helper: ensure role data is separated correctly across files
async function sanitizeCompanyUsers(companyPath) {
  try {
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const managementPath = path.join(companyPath, 'management.json');
    const adminPath = path.join(companyPath, 'admin.json');

    let technicians = [];
    let management = [];
    let admin = null;
    try { technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim()); } catch (_) { technicians = []; }
    try { management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim()); } catch (_) { management = []; }
    try { admin = JSON.parse((await fs.readFile(adminPath, 'utf8')).trim()); } catch (_) { admin = null; }

    const normalizedTechs = [];
    let updatedMgmt = Array.isArray(management) ? management.slice() : [];
    let updatedAdmin = admin && typeof admin === 'object' ? admin : null;

    for (const u of Array.isArray(technicians) ? technicians : []) {
      if (u && u.role === 'technician') {
        normalizedTechs.push(u);
      } else if (u && u.role === 'management') {
        if (!updatedMgmt.find(m => m.email === u.email)) {
          updatedMgmt.push(u);
        }
      } else if (u && u.role === 'admin') {
        if (!updatedAdmin) {
          updatedAdmin = { email: u.email, password: u.password, name: u.name || 'Admin', createdAt: u.createdAt || new Date().toISOString() };
        } else {
          const prev = new Date(updatedAdmin.createdAt || 0).getTime();
          const cur = new Date(u.createdAt || 0).getTime();
          if (isFinite(cur) && cur >= prev) {
            updatedAdmin = { email: u.email, password: u.password, name: u.name || updatedAdmin.name || 'Admin', createdAt: u.createdAt };
          }
        }
      }
    }

    await fs.writeFile(techniciansPath, JSON.stringify(normalizedTechs, null, 2));
    await fs.writeFile(managementPath, JSON.stringify(updatedMgmt, null, 2));
    if (updatedAdmin) {
      await fs.writeFile(adminPath, JSON.stringify(updatedAdmin, null, 2));
    }
  } catch (err) {
    console.warn('sanitizeCompanyUsers warning:', err?.message || err);
  }
}

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

    const companyPath = await findCompanyFolder(companyId);
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Ensure tickets folder exists
    const ticketsFolder = path.join(companyPath, 'tickets');
    try {
      await fs.access(ticketsFolder);
    } catch (_) {
      await fs.mkdir(ticketsFolder, { recursive: true });
    }

    const resolvedPath = path.join(ticketsFolder, 'resolved.json');
    console.log('[tickets/resolve] resolvedPath:', resolvedPath);

    // Read existing tickets (if file not found, start with empty)
    let tickets = [];
    try {
      const data = await fs.readFile(resolvedPath, 'utf8');
      tickets = JSON.parse(data.trim());
      if (!Array.isArray(tickets)) tickets = [];
    } catch (_) {
      tickets = [];
    }

    // Upsert by idKey (trackId-fault) to avoid duplicates
    const idKey = `${trackId}-${fault}`;
    const existingIdx = tickets.findIndex(t => `${t.trackId}-${t.fault}` === idKey);

    const newTicket = {
      id: `ticket-${Date.now()}`,
      companyId,
      trackId,
      fault,
      reason: reason || 'Other',
      category,
      powerLoss: typeof powerLoss === 'number' ? powerLoss : 0,
      predictedLoss: typeof predictedLoss === 'number' ? predictedLoss : undefined,
      resolvedAt,
      resolvedBy
    };

    if (existingIdx >= 0) {
      tickets[existingIdx] = { ...tickets[existingIdx], ...newTicket };
    } else {
      tickets.push(newTicket);
    }

    await fs.writeFile(resolvedPath, JSON.stringify(tickets, null, 2));
    console.log('[tickets/resolve] upserted ticket. total:', tickets.length);

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

    const companyPath = await findCompanyFolder(companyId);
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const resolvedPath = path.join(companyPath, 'tickets', 'resolved.json');
    console.log('[tickets/get] resolvedPath:', resolvedPath);
    try {
      const data = await fs.readFile(resolvedPath, 'utf8');
      const tickets = JSON.parse(data.trim());
      console.log('[tickets/get] tickets read:', Array.isArray(tickets) ? tickets.length : 'not array');
      return res.json(Array.isArray(tickets) ? tickets : []);
    } catch (_) {
      console.log('[tickets/get] resolved.json missing or unreadable, returning []');
      // If file missing or unreadable, return empty list
      return res.json([]);
    }
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

// Deterministic panel data generator (no randomness). If existingData is provided,
// preserve its arrays (trim/pad to panelCount) and recompute power deterministically.
const generatePanelData = (panelCount, voltagePerPanel, currentPerPanel, existingData = null) => {
  const toFixedLen = (arr = [], len, fillVal) => {
    const a = Array.isArray(arr) ? arr.slice(0, len) : [];
    while (a.length < len) a.push(fillVal);
    return a;
  };

  let voltage = [];
  let current = [];
  let power = [];
  let panelHealth = [];
  let panelStates = [];
  let actualFaultStatus = [];

  if (existingData) {
    // Preserve existing values without introducing randomness
    voltage = toFixedLen(existingData.voltage, panelCount, voltagePerPanel);
    current = toFixedLen(existingData.current, panelCount, currentPerPanel);
    power = toFixedLen(existingData.power, panelCount, 0);
    // Recompute power deterministically based on voltage/current
    power = power.map((_, i) => Number((voltage[i] * current[i]).toFixed(1)));

    // Health and states are optional; preserve if present, else derive simple health from power
    if (Array.isArray(existingData.health)) {
      panelHealth = toFixedLen(existingData.health, panelCount, 100);
    } else {
      const expected = voltagePerPanel * currentPerPanel;
      panelHealth = power.map(p => Math.max(0, Math.min(100, Math.round((p / expected) * 100))));
    }
    panelStates = toFixedLen(existingData.states, panelCount, 'good');
    actualFaultStatus = toFixedLen(existingData.actualFaultStatus, panelCount, false);
  } else {
    // Initialize with nominal values
    voltage = Array(panelCount).fill(Number(voltagePerPanel.toFixed(1)));
    current = Array(panelCount).fill(Number(currentPerPanel.toFixed(1)));
    const expected = Number((voltagePerPanel * currentPerPanel).toFixed(1));
    power = Array(panelCount).fill(expected);
    panelHealth = Array(panelCount).fill(100);
    panelStates = Array(panelCount).fill('good');
    actualFaultStatus = Array(panelCount).fill(false);
  }

  // Apply deterministic series-connection behavior
  const expected = Number((voltagePerPanel * currentPerPanel).toFixed(1));
  // Normalize arrays before applying series logic
  voltage = toFixedLen(voltage, panelCount, Number(voltagePerPanel.toFixed(1)));
  current = toFixedLen(current, panelCount, Number(currentPerPanel.toFixed(1)));

  // Find first undercurrent panel (strictly less than nominal current)
  const faultIndex = current.findIndex(c => c < Number(currentPerPanel.toFixed(1)));
  if (faultIndex >= 0) {
    const faultCurrent = current[faultIndex];
    for (let i = faultIndex + 1; i < panelCount; i++) {
      current[i] = faultCurrent;
    }
  }

  // Recompute power and derived fields deterministically
  power = Array.from({ length: panelCount }, (_, i) => Number((voltage[i] * current[i]).toFixed(1)));
  panelHealth = Array.from({ length: panelCount }, (_, i) => Math.max(0, Math.min(100, Math.round((power[i] / expected) * 100))));

  // Derive states and actualFaultStatus deterministically
  panelStates = Array.from({ length: panelCount }, (_, i) => {
    const h = panelHealth[i];
    if (h < 20) return 'fault';
    if (h < 90) return 'repairing';
    return 'good';
  });
  actualFaultStatus = Array(panelCount).fill(false);
  if (faultIndex >= 0) actualFaultStatus[faultIndex] = true;

  return {
    voltage,
    current,
    power,
    health: panelHealth,
    states: panelStates,
    actualFaultStatus,
    seriesState: faultIndex >= 0 ? panelStates[faultIndex] : 'good',
    seriesHealth: faultIndex >= 0 ? panelHealth[faultIndex] : 100,
    actualFaultyIndex: faultIndex >= 0 ? faultIndex : null,
  };
};

// Get all companies
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await fs.readdir(COMPANIES_DIR);
    const companyData = [];
    
    for (const companyId of companies) {
      const companyPath = path.join(COMPANIES_DIR, companyId);
      const stat = await fs.stat(companyPath);
      
      if (stat.isDirectory()) {
        const plantDetailsPath = path.join(companyPath, 'plant_details.json');
        
        try {
          const plantData = await fs.readFile(plantDetailsPath, 'utf8');
          const plant = JSON.parse(plantData);
          companyData.push({
            id: plant.companyId, // Use the original companyId from plant details
            name: plant.companyName,
            folderPath: companyPath,
            createdAt: stat.birthtime.toISOString(),
            ...plant
          });
        } catch (error) {
          console.error(`Error reading plant details for ${companyId}:`, error);
        }
      }
    }
    
    res.json(companyData);
  } catch (error) {
    console.error('Error reading companies:', error);
    res.status(500).json({ error: 'Failed to read companies' });
  }
});

// Update plant settings (voltage/current) and regenerate all tables' panel data
app.put('/api/companies/:companyId/plant', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { voltagePerPanel, currentPerPanel } = req.body;

    if (typeof voltagePerPanel !== 'number' || typeof currentPerPanel !== 'number') {
      return res.status(400).json({ error: 'voltagePerPanel and currentPerPanel must be numbers' });
    }

    const companyPath = await findCompanyFolder(companyId);
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);

    plantDetails.voltagePerPanel = voltagePerPanel;
    plantDetails.currentPerPanel = currentPerPanel;
    plantDetails.powerPerPanel = voltagePerPanel * currentPerPanel;

    // Regenerate panel data for each table based on its panel counts
    plantDetails.tables = (plantDetails.tables || []).map(t => {
      const top = generatePanelData(t.panelsTop, voltagePerPanel, currentPerPanel);
      const bottom = generatePanelData(t.panelsBottom, voltagePerPanel, currentPerPanel);
      return {
        ...t,
        topPanels: top,
        bottomPanels: bottom,
      };
    });

    plantDetails.lastUpdated = new Date().toISOString();
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));

    res.json({ success: true, message: 'Plant settings updated', plant: plantDetails });
  } catch (error) {
    console.error('Error updating plant settings:', error);
    res.status(500).json({ error: 'Failed to update plant settings' });
  }
});

// Delete table from plant by tableId
app.delete('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const companyPath = await findCompanyFolder(companyId);

    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);

    const beforeCount = Array.isArray(plantDetails.tables) ? plantDetails.tables.length : 0;
    plantDetails.tables = (plantDetails.tables || []).filter(t => t.id !== tableId);
    const afterCount = plantDetails.tables.length;

    if (afterCount === beforeCount) {
      return res.status(404).json({ error: 'Table not found' });
    }

    plantDetails.lastUpdated = new Date().toISOString();
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));

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
    
    // Use company name as folder name, sanitized for filesystem
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const companyPath = path.join(COMPANIES_DIR, sanitizedCompanyName);
    
    // Check if company already exists
    try {
      await fs.access(companyPath);
      return res.status(409).json({ error: 'Company already exists' });
    } catch (error) {
      // Company doesn't exist, continue with creation
    }
    
    // Create company directory
    await fs.mkdir(companyPath, { recursive: true });
    
    // Calculate power per panel
    const powerPerPanel = voltagePerPanel * currentPerPanel;
    
    // Create plant details file
    const plantDetails = {
      companyId,
      companyName,
      voltagePerPanel,
      currentPerPanel,
      powerPerPanel,
      plantPowerKW,
      tables: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(companyPath, 'plant_details.json'), 
      JSON.stringify(plantDetails, null, 2)
    );
    
    // Create admin credentials file
    const adminCredentials = {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(companyPath, 'admin.json'), 
      JSON.stringify(adminCredentials, null, 2)
    );
    
    // Create technicians file (initially empty)
    await fs.writeFile(
      path.join(companyPath, 'technicians.json'), 
      JSON.stringify([], null, 2)
    );
    
    // Create management file (initially empty)
    await fs.writeFile(
      path.join(companyPath, 'management.json'), 
      JSON.stringify([], null, 2)
    );
    
    // Create entries folder
    const entriesFolder = path.join(companyPath, 'entries');
    await fs.mkdir(entriesFolder, { recursive: true });
    
    // Create entries.json file (initially empty)
    await fs.writeFile(
      path.join(entriesFolder, 'entries.json'), 
      JSON.stringify([], null, 2)
    );
    
    res.json({
      success: true,
      message: 'Company created successfully',
      companyPath: companyPath
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Get plant details for a company
app.get('/api/companies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);

    // Normalize and recompute arrays deterministically based on current JSON values
    if (Array.isArray(plantDetails.tables)) {
      plantDetails.tables = plantDetails.tables.map((t) => {
        const top = generatePanelData(
          t.panelsTop || (t.topPanels?.voltage?.length || 0),
          plantDetails.voltagePerPanel,
          plantDetails.currentPerPanel,
          t.topPanels || null
        );
        const bottom = generatePanelData(
          t.panelsBottom || (t.bottomPanels?.voltage?.length || 0),
          plantDetails.voltagePerPanel,
          plantDetails.currentPerPanel,
          t.bottomPanels || null
        );
        return {
          ...t,
          topPanels: top,
          bottomPanels: bottom,
        };
      });
      plantDetails.lastUpdated = new Date().toISOString();
      // Persist normalized data so future reads are consistent
      await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
    }
    
    res.json(plantDetails);
  } catch (error) {
    console.error('Error reading plant details:', error);
    res.status(500).json({ error: 'Failed to read plant details' });
  }
});

// Get admin credentials
app.get('/api/companies/:companyId/admin', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const adminPath = path.join(companyPath, 'admin.json');
    
    const adminData = await fs.readFile(adminPath, 'utf8');
    const admin = JSON.parse(adminData);
    
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
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const techniciansPath = path.join(companyPath, 'technicians.json');
    
    // Sanitize and then read technicians
    await sanitizeCompanyUsers(companyPath);
    const techniciansData = await fs.readFile(techniciansPath, 'utf8');
    let technicians = JSON.parse(techniciansData.trim());
    if (!Array.isArray(technicians)) technicians = [];
    technicians = technicians.filter(t => t && t.role === 'technician');

    // Enrich with phone numbers from entries.json
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
      if (!Array.isArray(entries)) entries = [];
    } catch (_) { entries = []; }
    const byEmail = {};
    entries.forEach(e => { if (e && e.email) byEmail[e.email] = e; });
    const enriched = technicians.map(t => ({
      ...t,
      phoneNumber: t.phoneNumber || byEmail[t.email]?.phoneNumber || '',
    }));
    
    res.json(enriched);
  } catch (error) {
    console.error('Error reading technicians:', error);
    // Return empty array if technicians.json is corrupted instead of 500 error
    res.json([]);
  }
});

// Add staff entry to company
app.post('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { companyName, name, role, email, phoneNumber, password, createdBy } = req.body;
    
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Create entries folder if it doesn't exist
    let entriesFolder = path.join(companyPath, 'entries');
    try {
      await fs.access(entriesFolder);
    } catch (error) {
      await fs.mkdir(entriesFolder, { recursive: true });
    }
    
    const entriesPath = path.join(entriesFolder, 'entries.json');
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const adminPath = path.join(companyPath, 'admin.json');
    const managementPath = path.join(companyPath, 'management.json');
    
    // Read existing entries
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
    } catch (error) {
      entries = [];
    }
    
    // Create new staff entry (without password)
    const timestamp = Date.now();
    const newEntry = {
      id: `entry-${timestamp}`,
      companyName: companyName || '',
      name: name || '',
      role: role || 'technician',
      email: email || '',
      phoneNumber: phoneNumber || '',
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'super_admin'
    };
    
    // Add entry to array
    entries.push(newEntry);
    
    // Create credential entry with password
    const newCredential = {
      id: `user-${timestamp}`,
      email: email || '',
      password: password || '',
      role: role || 'technician',
      phoneNumber: phoneNumber || '',
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'super_admin'
    };
    
    // Write to appropriate file based on role (no cross-writing into technicians)
    if (role === 'admin') {
      // For admin, update admin.json
      let adminData = {};
      try {
        const adminFileData = await fs.readFile(adminPath, 'utf8');
        adminData = JSON.parse(adminFileData.trim());
      } catch (error) {
        // If admin.json doesn't exist, create new structure
        adminData = { email, password, name, createdAt: new Date().toISOString() };
      }
      
      // Write admin.json
      await fs.writeFile(adminPath, JSON.stringify(adminData, null, 2));
      
    } else if (role === 'management') {
      // For management, update management.json
      let managementData = [];
      try {
        const managementFileData = await fs.readFile(managementPath, 'utf8');
        managementData = JSON.parse(managementFileData.trim());
        if (!Array.isArray(managementData)) managementData = [];
      } catch (error) {
        managementData = [];
      }
      
      // Check if user already exists by email
      const existingIndex = managementData.findIndex(m => m && m.email === email);
      if (existingIndex !== -1) {
        // Update existing entry
        managementData[existingIndex] = { ...managementData[existingIndex], ...newCredential };
      } else {
        // Add new entry
        managementData.push(newCredential);
      }
      
      await fs.writeFile(managementPath, JSON.stringify(managementData, null, 2));
      
    } else if (role === 'technician') {
      // For technician, update technicians.json
      let technicians = [];
      try {
        const techniciansData = await fs.readFile(techniciansPath, 'utf8');
        technicians = JSON.parse(techniciansData.trim());
        if (!Array.isArray(technicians)) technicians = [];
      } catch (error) {
        technicians = [];
      }
      
      // Check if user already exists by email
      const existingIndex = technicians.findIndex(t => t && t.email === email);
      if (existingIndex !== -1) {
        // Update existing entry
        technicians[existingIndex] = { ...technicians[existingIndex], ...newCredential };
      } else {
        // Add new entry
        technicians.push(newCredential);
      }
      
      await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
    }
    
    // Ensure entries folder exists (already created above)
    // Write entries.json
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    console.log(`[POST /entries] Created entry with ID: ${newEntry.id} for email: ${email}`);
    
    // Final sanity pass to keep files clean
    await sanitizeCompanyUsers(companyPath);
    
    res.json({ success: true, entry: newEntry });
  } catch (error) {
    console.error('Error adding staff entry:', error);
    res.status(500).json({ error: 'Failed to add staff entry' });
  }
});

// Helper: Sync entries from role-specific files to entries.json
async function syncEntriesFromRoleFiles(companyPath) {
  try {
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const managementPath = path.join(companyPath, 'management.json');
    const adminPath = path.join(companyPath, 'admin.json');

    // Read existing entries
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
      if (!Array.isArray(entries)) entries = [];
    } catch (_) {
      entries = [];
    }

    // Read role-specific files
    let technicians = [];
    let management = [];
    let admin = null;
    try { technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim()); } catch (_) { technicians = []; }
    try { management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim()); } catch (_) { management = []; }
    try { admin = JSON.parse((await fs.readFile(adminPath, 'utf8')).trim()); } catch (_) { admin = null; }

    if (!Array.isArray(technicians)) technicians = [];
    if (!Array.isArray(management)) management = [];

    // Create a map of existing entries by email+role
    const existingEntriesMap = new Map();
    entries.forEach(e => {
      if (e && e.email && e.role) {
        existingEntriesMap.set(`${e.email}|${e.role}`, e);
      }
    });

    let hasChanges = false;

    // Sync technicians
    for (const tech of technicians) {
      if (tech && tech.email && tech.role === 'technician') {
        const key = `${tech.email}|technician`;
        if (!existingEntriesMap.has(key)) {
          // Create entry from technician data
          const newEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            companyName: tech.companyName || '',
            name: tech.name || tech.email.split('@')[0],
            role: 'technician',
            email: tech.email,
            phoneNumber: tech.phoneNumber || '',
            createdAt: tech.createdAt || new Date().toISOString(),
            createdBy: tech.createdBy || 'system'
          };
          entries.push(newEntry);
          existingEntriesMap.set(key, newEntry);
          hasChanges = true;
        } else {
          // Update phone number if missing in entry but present in technician
          const existing = existingEntriesMap.get(key);
          if (existing && !existing.phoneNumber && tech.phoneNumber) {
            existing.phoneNumber = tech.phoneNumber;
            hasChanges = true;
          }
        }
      }
    }

    // Sync management
    for (const mgmt of management) {
      if (mgmt && mgmt.email && mgmt.role === 'management') {
        const key = `${mgmt.email}|management`;
        if (!existingEntriesMap.has(key)) {
          // Create entry from management data
          const newEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            companyName: mgmt.companyName || '',
            name: mgmt.name || mgmt.email.split('@')[0],
            role: 'management',
            email: mgmt.email,
            phoneNumber: mgmt.phoneNumber || '',
            createdAt: mgmt.createdAt || new Date().toISOString(),
            createdBy: mgmt.createdBy || 'system'
          };
          entries.push(newEntry);
          existingEntriesMap.set(key, newEntry);
          hasChanges = true;
        } else {
          // Update phone number if missing in entry but present in management
          const existing = existingEntriesMap.get(key);
          if (existing && !existing.phoneNumber && mgmt.phoneNumber) {
            existing.phoneNumber = mgmt.phoneNumber;
            hasChanges = true;
          }
        }
      }
    }

    // Sync admin (if exists and not in entries)
    if (admin && admin.email) {
      const key = `${admin.email}|admin`;
      if (!existingEntriesMap.has(key)) {
        const newEntry = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          companyName: admin.companyName || '',
          name: admin.name || 'Admin',
          role: 'admin',
          email: admin.email,
          phoneNumber: admin.phoneNumber || '',
          createdAt: admin.createdAt || new Date().toISOString(),
          createdBy: admin.createdBy || 'system'
        };
        entries.push(newEntry);
        hasChanges = true;
      }
    }

    // Write back if changes were made
    if (hasChanges) {
      // Ensure entries folder exists
      const entriesFolder = path.join(companyPath, 'entries');
      try {
        await fs.access(entriesFolder);
      } catch (error) {
        await fs.mkdir(entriesFolder, { recursive: true });
      }
      await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
      console.log(`[GET /entries] Synced ${entries.length} entries from role-specific files`);
    }

    return entries;
  } catch (err) {
    console.warn('syncEntriesFromRoleFiles warning:', err?.message || err);
    return [];
  }
}

// Get staff entries for a company
app.get('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const managementPath = path.join(companyPath, 'management.json');
    
    try {
      // First, sync entries from role-specific files to entries.json
      let entries = await syncEntriesFromRoleFiles(companyPath);
      
      // Then sanitize to remove entries that don't exist in role files
      await sanitizeCompanyEntries(companyPath);
      
      // Re-read entries after sanitization
      try {
        const entriesData = await fs.readFile(entriesPath, 'utf8');
        entries = JSON.parse(entriesData.trim());
        if (!Array.isArray(entries)) entries = [];
      } catch (error) {
        entries = [];
      }

      // Enrich with phone numbers from role files if missing
      let technicians = [];
      let management = [];
      try { 
        technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim()); 
        if (!Array.isArray(technicians)) technicians = [];
      } catch (_) { technicians = []; }
      try { 
        management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim()); 
        if (!Array.isArray(management)) management = [];
      } catch (_) { management = []; }
      
      // Create a map of email -> phone number from role files
      const phoneNumberMap = new Map();
      [...technicians, ...management].forEach(u => {
        if (u && u.email && u.phoneNumber) {
          phoneNumberMap.set(u.email, u.phoneNumber);
        }
      });

      // Enrich entries with phone numbers and ensure data consistency
      if (Array.isArray(entries)) {
        entries = entries.map(e => {
          if (!e || !e.email || !e.role) return e;
          
          // Get phone number from role file if missing in entry
          const phoneFromRole = phoneNumberMap.get(e.email);
          const finalPhone = e.phoneNumber || phoneFromRole || '';
          
          return {
            ...e,
            phoneNumber: finalPhone,
          };
        }).filter(e => e && e.email && e.role); // Filter out invalid entries
      }
      
      console.log(`[GET /entries] Returning ${entries.length} entries for company ${companyId}`);
      res.json(entries);
    } catch (error) {
      console.error('[GET /entries] Error:', error);
      // If entries.json doesn't exist, try to sync from role files
      try {
        const entries = await syncEntriesFromRoleFiles(companyPath);
        res.json(entries);
      } catch (syncError) {
        console.error('[GET /entries] Sync error:', syncError);
        res.json([]);
      }
    }
  } catch (error) {
    console.error('Error reading entries:', error);
    res.status(500).json({ error: 'Failed to read entries' });
  }
});

// Update staff entry
app.put('/api/companies/:companyId/entries/:entryId', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { companyName, name, role, email, phoneNumber } = req.body;
    
    console.log(`[PUT /entries] Updating entry - companyId: ${companyId}, entryId: ${entryId}, email: ${email}, role: ${role}`);
    
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      console.log(`[PUT /entries] Company not found: ${companyId}`);
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    
    // Read existing entries
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
      if (!Array.isArray(entries)) entries = [];
      console.log(`[PUT /entries] Loaded ${entries.length} entries from entries.json`);
    } catch (error) {
      console.log(`[PUT /entries] No entries.json found, creating new array`);
      entries = [];
    }
    
    // Find and update the entry
    let entryIndex = entries.findIndex(e => e && e.id === entryId);
    
    if (entryIndex === -1) {
      console.log(`[PUT /entries] Entry ID ${entryId} not found, trying fallback methods...`);
      
      // Compatibility: if a user-* id was sent, try resolving by email+role
      if (email && role) {
        console.log(`[PUT /entries] Trying to find entry by email: ${email}, role: ${role}`);
        const altIndex = entries.findIndex(e => e && e.email === email && e.role === role);
        if (altIndex !== -1) {
          console.log(`[PUT /entries] Found entry at index ${altIndex} by email+role`);
          entryIndex = altIndex;
        } else {
          // Try to find in role-specific files and sync to entries.json
          console.log(`[PUT /entries] Entry not found in entries.json, checking role-specific files...`);
          const techniciansPath = path.join(companyPath, 'technicians.json');
          const managementPath = path.join(companyPath, 'management.json');
          const adminPath = path.join(companyPath, 'admin.json');
          
          let foundInRoleFile = false;
          
          if (role === 'technician') {
            try {
              const technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim());
              const tech = Array.isArray(technicians) ? technicians.find(t => t && t.email === email) : null;
              if (tech) {
                foundInRoleFile = true;
                console.log(`[PUT /entries] Found technician in technicians.json, creating entry in entries.json`);
              }
            } catch (e) { /* ignore */ }
          } else if (role === 'management') {
            try {
              const management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim());
              const mgmt = Array.isArray(management) ? management.find(m => m && m.email === email) : null;
              if (mgmt) {
                foundInRoleFile = true;
                console.log(`[PUT /entries] Found management in management.json, creating entry in entries.json`);
              }
            } catch (e) { /* ignore */ }
          } else if (role === 'admin') {
            try {
              const admin = JSON.parse((await fs.readFile(adminPath, 'utf8')).trim());
              if (admin && admin.email === email) {
                foundInRoleFile = true;
                console.log(`[PUT /entries] Found admin in admin.json, creating entry in entries.json`);
              }
            } catch (e) { /* ignore */ }
          }
          
          if (foundInRoleFile) {
            // Create new entry in entries.json
            const newEntry = {
              id: `entry-${Date.now()}`,
              companyName: companyName || '',
              name: name || '',
              role: role,
              email: email,
              phoneNumber: phoneNumber || '',
              createdAt: new Date().toISOString(),
              createdBy: 'system'
            };
            entries.push(newEntry);
            entryIndex = entries.length - 1;
            console.log(`[PUT /entries] Created new entry with ID: ${newEntry.id}`);
          } else {
            console.log(`[PUT /entries] Entry not found in any file`);
            return res.status(404).json({ error: 'Entry not found' });
          }
        }
      } else {
        console.log(`[PUT /entries] Cannot resolve entry - missing email or role in request body`);
        return res.status(404).json({ error: 'Entry not found. Email and role are required for lookup.' });
      }
    } else {
      console.log(`[PUT /entries] Found entry at index ${entryIndex}`);
    }
    
    // Update the entry - preserve all original fields and update only provided fields
    const originalEntry = entries[entryIndex];
    entries[entryIndex] = {
      ...originalEntry, // Preserve all original fields (id, createdAt, createdBy, etc.)
      // Update only the fields that are provided in the request
      ...(companyName !== undefined && { companyName }),
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(email !== undefined && { email }),
      ...(phoneNumber !== undefined && { phoneNumber }),
    };
    
    console.log(`[PUT /entries] Updated entry:`, JSON.stringify(entries[entryIndex], null, 2));
    
    // Ensure entries folder exists
    const entriesFolder = path.join(companyPath, 'entries');
    try {
      await fs.access(entriesFolder);
    } catch (error) {
      await fs.mkdir(entriesFolder, { recursive: true });
    }
    
    // Write back to file with proper formatting
    const entriesJson = JSON.stringify(entries, null, 2);
    await fs.writeFile(entriesPath, entriesJson, 'utf8');
    console.log(`[PUT /entries] Successfully wrote ${entries.length} entries to entries.json`);
    
    // Verify the write by reading it back
    try {
      const verifyData = await fs.readFile(entriesPath, 'utf8');
      const verifyEntries = JSON.parse(verifyData.trim());
      console.log(`[PUT /entries] Verification: File contains ${verifyEntries.length} entries`);
    } catch (verifyError) {
      console.error(`[PUT /entries] Warning: Could not verify write:`, verifyError);
    }
    
    // Also update the role-specific file if needed
    const updatedEntry = entries[entryIndex];
    if (updatedEntry.role === 'technician') {
      try {
        const techniciansPath = path.join(companyPath, 'technicians.json');
        let technicians = [];
        try {
          technicians = JSON.parse((await fs.readFile(techniciansPath, 'utf8')).trim());
          if (!Array.isArray(technicians)) technicians = [];
        } catch (e) { 
          console.log(`[PUT /entries] Could not read technicians.json:`, e);
          technicians = []; 
        }
        
        const techIndex = technicians.findIndex(t => t && t.email === updatedEntry.email);
        if (techIndex !== -1) {
          technicians[techIndex] = {
            ...technicians[techIndex],
            email: updatedEntry.email,
            role: updatedEntry.role,
            phoneNumber: updatedEntry.phoneNumber,
            name: updatedEntry.name || technicians[techIndex].name
          };
          await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2), 'utf8');
          console.log(`[PUT /entries] Updated technician in technicians.json`);
        } else {
          console.log(`[PUT /entries] Technician not found in technicians.json for email: ${updatedEntry.email}`);
        }
      } catch (e) { 
        console.error(`[PUT /entries] Error updating technicians.json:`, e);
      }
    } else if (updatedEntry.role === 'management') {
      try {
        const managementPath = path.join(companyPath, 'management.json');
        let management = [];
        try {
          management = JSON.parse((await fs.readFile(managementPath, 'utf8')).trim());
          if (!Array.isArray(management)) management = [];
        } catch (e) { 
          console.log(`[PUT /entries] Could not read management.json:`, e);
          management = []; 
        }
        
        const mgmtIndex = management.findIndex(m => m && m.email === updatedEntry.email);
        if (mgmtIndex !== -1) {
          management[mgmtIndex] = {
            ...management[mgmtIndex],
            email: updatedEntry.email,
            role: updatedEntry.role,
            phoneNumber: updatedEntry.phoneNumber,
            name: updatedEntry.name || management[mgmtIndex].name
          };
          await fs.writeFile(managementPath, JSON.stringify(management, null, 2), 'utf8');
          console.log(`[PUT /entries] Updated management in management.json`);
        } else {
          console.log(`[PUT /entries] Management not found in management.json for email: ${updatedEntry.email}`);
        }
      } catch (e) { 
        console.error(`[PUT /entries] Error updating management.json:`, e);
      }
    } else if (updatedEntry.role === 'admin') {
      try {
        const adminPath = path.join(companyPath, 'admin.json');
        let admin = {};
        try {
          const adminData = await fs.readFile(adminPath, 'utf8');
          admin = JSON.parse(adminData.trim());
        } catch (e) { 
          console.log(`[PUT /entries] Could not read admin.json:`, e);
          admin = {}; 
        }
        
        if (admin && admin.email === updatedEntry.email) {
          admin = {
            ...admin,
            email: updatedEntry.email,
            name: updatedEntry.name || admin.name,
            phoneNumber: updatedEntry.phoneNumber || admin.phoneNumber
          };
          await fs.writeFile(adminPath, JSON.stringify(admin, null, 2), 'utf8');
          console.log(`[PUT /entries] Updated admin in admin.json`);
        } else {
          console.log(`[PUT /entries] Admin not found in admin.json for email: ${updatedEntry.email}`);
        }
      } catch (e) { 
        console.error(`[PUT /entries] Error updating admin.json:`, e);
      }
    }
    
    res.json({ success: true, entry: entries[entryIndex] });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry', details: error.message });
  }
});

// Delete staff entry from a company
app.delete('/api/companies/:companyId/entries/:entryId', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    const techniciansPath = path.join(companyPath, 'technicians.json');
    const adminPath = path.join(companyPath, 'admin.json');
    const managementPath = path.join(companyPath, 'management.json');
    
    // Read existing entries
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
    } catch (error) {
      return res.status(404).json({ error: 'No entries found' });
    }
    
    // Find and remove the entry by id
    const entryIndex = entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const deletedEntry = entries[entryIndex];
    entries.splice(entryIndex, 1);
    // Also remove any duplicate entries with same email+role to keep file clean
    if (deletedEntry && deletedEntry.email && deletedEntry.role) {
      entries = entries.filter(e => !(e.email === deletedEntry.email && e.role === deletedEntry.role));
    }
    
    // Remove from appropriate file based on role
    if (deletedEntry.role === 'admin') {
      // Remove from admin.json
      try {
        const adminData = await fs.readFile(adminPath, 'utf8');
        const admin = JSON.parse(adminData.trim());
        if (admin.email === deletedEntry.email) {
          // If deleting the main admin, we might want to keep the file but clear it
          // or leave it as is for now
          await fs.writeFile(adminPath, JSON.stringify(admin, null, 2));
        }
      } catch (error) {
        console.error('Error updating admin.json:', error);
      }
    } else if (deletedEntry.role === 'management') {
      // Remove from management.json
      try {
        const managementData = await fs.readFile(managementPath, 'utf8');
        let management = JSON.parse(managementData.trim());
        management = management.filter(m => m.email !== deletedEntry.email);
        await fs.writeFile(managementPath, JSON.stringify(management, null, 2));
      } catch (error) {
        console.error('Error updating management.json:', error);
      }
    }
    
    // Also remove from technicians.json by email (for backward compatibility)
    let technicians = [];
    try {
      const techniciansData = await fs.readFile(techniciansPath, 'utf8');
      technicians = JSON.parse(techniciansData.trim());
      
      // Remove technician with matching email
      technicians = technicians.filter(t => t.email !== deletedEntry.email);
      
      // Write technicians back
      await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
    } catch (error) {
      console.error('Error updating technicians.json:', error);
      // Continue even if technicians update fails
    }
    
    // Write entries back to file and sanitize for consistency
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    await sanitizeCompanyEntries(companyPath);
    
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Add technician to company
app.post('/api/companies/:companyId/technicians', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { email, password, role, createdBy } = req.body;
    
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const techniciansPath = path.join(companyPath, 'technicians.json');
    
    // Read existing technicians
    let technicians = [];
    try {
      const techniciansData = await fs.readFile(techniciansPath, 'utf8');
      technicians = JSON.parse(techniciansData.trim());
    } catch (error) {
      // If technicians.json doesn't exist or is corrupted, start with empty array
      technicians = [];
    }
    
    // Create new technician (force role to 'technician')
    const newTechnician = {
      id: `technician-${Date.now()}`,
      email,
      password,
      role: 'technician',
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'super_admin'
    };
    
    // Add technician to array
    technicians.push(newTechnician);
    
    // Write back to file
    await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
    
    // Sanitize after write
    await sanitizeCompanyUsers(companyPath);
    res.json({ success: true, technician: newTechnician });
  } catch (error) {
    console.error('Error adding technician:', error);
    res.status(500).json({ error: 'Failed to add technician' });
  }
});

// Delete company folder
app.delete('/api/companies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    await fs.rm(companyPath, { recursive: true, force: true });
    
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// Create new table
app.post('/api/companies/:companyId/tables', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { panelsTop, panelsBottom } = req.body;
    
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    
    // Read current plant details
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);
    
    const tableNumber = plantDetails.tables.length + 1;
    const serialNumber = `TBL-${String(tableNumber).padStart(4, '0')}`;
    
    const topPanelData = generatePanelData(panelsTop, plantDetails.voltagePerPanel, plantDetails.currentPerPanel);
    const bottomPanelData = generatePanelData(panelsBottom, plantDetails.voltagePerPanel, plantDetails.currentPerPanel);
    
    const newTable = {
      id: `table-${Date.now()}`,
      serialNumber,
      panelsTop,
      panelsBottom,
      createdAt: new Date().toISOString(),
      topPanels: topPanelData,
      bottomPanels: bottomPanelData
    };
    
    plantDetails.tables.push(newTable);
    plantDetails.lastUpdated = new Date().toISOString();
    
    // Save updated plant details
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
    
    res.json({
      success: true,
      message: 'Table created successfully',
      table: newTable
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});
app.put('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { panelsTop, panelsBottom, serialNumber } = req.body;
    const companyPath = await findCompanyFolder(companyId);

    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);

    const idx = (plantDetails.tables || []).findIndex(t => t.id === tableId);
    if (idx === -1) {
      return res.status(404).json({ 
        error: 'Table not found', 
        tableId,
        availableTableIds: (plantDetails.tables || []).map(t => t.id),
        companyId: plantDetails.companyId
      });
    }

    const voltage = plantDetails.voltagePerPanel;
    const current = plantDetails.currentPerPanel;
    const updatedTop = generatePanelData(panelsTop, voltage, current);
    const updatedBottom = generatePanelData(panelsBottom, voltage, current);

    const updated = {
      ...plantDetails.tables[idx],
      panelsTop,
      panelsBottom,
      topPanels: updatedTop,
      bottomPanels: updatedBottom,
      ...(serialNumber ? { serialNumber } : {})
    };

    plantDetails.tables[idx] = updated;
    plantDetails.lastUpdated = new Date().toISOString();
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
    res.json({ success: true, message: 'Table updated successfully', table: updated });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table', message: error.message });
  }
});

// Delete panel
app.delete('/api/companies/:companyId/tables/:tableId/panels/:panelId', async (req, res) => {
  try {
    const { companyId, tableId, panelId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    
    // Read current plant details
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);
    
    const tableIndex = plantDetails.tables.findIndex(table => table.id === tableId);
    if (tableIndex === -1) {
      return res.status(404).json({ error: 'Table not found', tableId, availableTableIds: (plantDetails.tables || []).map(t => t.id) });
    }
    
    const table = plantDetails.tables[tableIndex];
    
    // Parse panel ID to determine position and index
    const panelIdParts = panelId.split('-');
    const position = panelIdParts[panelIdParts.length - 2]; // top or bottom
    const panelIndex = parseInt(panelIdParts[panelIdParts.length - 1]); // panel number
    
    if (position === 'top') {
      table.topPanels.voltage.splice(panelIndex, 1);
      table.topPanels.current.splice(panelIndex, 1);
      table.topPanels.power.splice(panelIndex, 1);
      if (table.topPanels.health) table.topPanels.health.splice(panelIndex, 1);
      if (table.topPanels.states) table.topPanels.states.splice(panelIndex, 1);
      table.panelsTop -= 1;
    } else if (position === 'bottom') {
      table.bottomPanels.voltage.splice(panelIndex, 1);
      table.bottomPanels.current.splice(panelIndex, 1);
      table.bottomPanels.power.splice(panelIndex, 1);
      if (table.bottomPanels.health) table.bottomPanels.health.splice(panelIndex, 1);
      if (table.bottomPanels.states) table.bottomPanels.states.splice(panelIndex, 1);
      table.panelsBottom -= 1;
    } else {
      return res.status(400).json({ error: 'Invalid panel position' });
    }
    
    // Update plant details
    plantDetails.tables[tableIndex] = table;
    plantDetails.lastUpdated = new Date().toISOString();
    
    // Save updated data
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
    
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
app.put('/api/companies/:companyId/refresh-panel-data', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    
    // Read current plant details
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);
    
    // Update panel data for all tables with PROPER repair simulation
    plantDetails.tables.forEach(table => {
      if (table.panelsTop > 0) {
        const topPanelData = generatePanelData(
          table.panelsTop, 
          plantDetails.voltagePerPanel, 
          plantDetails.currentPerPanel,
          table.topPanels // Pass existing data for repair simulation
        );
        table.topPanels = topPanelData;
      }
      
      if (table.panelsBottom > 0) {
        const bottomPanelData = generatePanelData(
          table.panelsBottom, 
          plantDetails.voltagePerPanel, 
          plantDetails.currentPerPanel,
          table.bottomPanels // Pass existing data for repair simulation
        );
        table.bottomPanels = bottomPanelData;
      }
    });
    
    plantDetails.lastUpdated = new Date().toISOString();
    
    // Save updated data
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Panel data refreshed with PROPER repair simulation',
      updatedAt: plantDetails.lastUpdated,
      tables: plantDetails.tables.length,
      simulation: 'proper-series-connection'
    });
  } catch (error) {
    console.error('Error refreshing panel data:', error);
    res.status(500).json({ error: 'Failed to refresh panel data' });
  }
});

// Add panels to existing table
app.post('/api/companies/:companyId/tables/:tableId/add-panels', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { position, panelCount } = req.body; // position: 'top' or 'bottom', panelCount: number
    
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const plantDetailsPath = path.join(companyPath, 'plant_details.json');
    
    // Read current plant details
    const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
    const plantDetails = JSON.parse(plantDetailsData);
    
    // Find the table
    const table = plantDetails.tables.find(t => t.id === tableId);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Generate new panel data for the additional panels
    const newPanelData = generatePanelData(panelCount, plantDetails.voltagePerPanel, plantDetails.currentPerPanel);
    
    if (position === 'top') {
      // Add to top panels
      table.panelsTop += panelCount;
      
      // Merge new panel data with existing top panels
      if (table.topPanels) {
        // Extend existing arrays
        Object.keys(newPanelData).forEach(key => {
          if (Array.isArray(table.topPanels[key])) {
            table.topPanels[key] = [...table.topPanels[key], ...newPanelData[key]];
          } else {
            table.topPanels[key] = newPanelData[key];
          }
        });
      } else {
        table.topPanels = newPanelData;
      }
    } else if (position === 'bottom') {
      // Add to bottom panels
      table.panelsBottom += panelCount;
      
      // Merge new panel data with existing bottom panels
      if (table.bottomPanels) {
        // Extend existing arrays
        Object.keys(newPanelData).forEach(key => {
          if (Array.isArray(table.bottomPanels[key])) {
            table.bottomPanels[key] = [...table.bottomPanels[key], ...newPanelData[key]];
          } else {
            table.bottomPanels[key] = newPanelData[key];
          }
        });
      } else {
        table.bottomPanels = newPanelData;
      }
    }
    
    plantDetails.lastUpdated = new Date().toISOString();
    
    // Save updated plant details
    await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
    
    res.json({ 
      success: true, 
      message: `${panelCount} panel(s) added to ${position} side`,
      tableId: table.id,
      position,
      panelCount,
      updatedAt: plantDetails.lastUpdated
    });
  } catch (error) {
    console.error('Error adding panels:', error);
    res.status(500).json({ error: 'Failed to add panels' });
  }
});

// User authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, companyName, role } = req.body;
    
    // Validate required fields
    if (!email || !password || !companyName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Email, password, and company name are required' 
      });
    }
    
    // Validate field types
    if (typeof email !== 'string' || typeof password !== 'string' || typeof companyName !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid field types',
        message: 'All fields must be strings' 
      });
    }
    
    // Trim all input fields to remove leading/trailing spaces
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const sanitizedCompanyName = companyName.toLowerCase().trim();
    
    // Find company by name
    const companyPath = await findCompanyFolderByName(sanitizedCompanyName);
    if (!companyPath) {
      return res.status(404).json({ 
        error: 'Company not found',
        message: `Company "${sanitizedCompanyName}" does not exist` 
      });
    }
    
    // If role is 'admin', check admin credentials
    if (role === 'admin') {
      const adminPath = path.join(companyPath, 'admin.json');
      try {
        const adminData = await fs.readFile(adminPath, 'utf8');
        const admin = JSON.parse(adminData);
        
        if (admin.email === trimmedEmail && admin.password === trimmedPassword) {
          // Get companyId from plant_details.json
          let companyId = sanitizedCompanyName;
          try {
            const plantDetailsPath = path.join(companyPath, 'plant_details.json');
            const plantData = await fs.readFile(plantDetailsPath, 'utf8');
            const plant = JSON.parse(plantData);
            companyId = plant.companyId;
          } catch (error) {
            console.error('Error reading plant details for companyId:', error);
          }
          
          return res.json({
            success: true,
            user: {
              id: `admin-${sanitizedCompanyName}`,
              email: admin.email,
              role: 'plant_admin',
              name: admin.name || `${sanitizedCompanyName} Admin`,
              companyName: sanitizedCompanyName,
              companyId: companyId
            }
          });
        }
      } catch (error) {
        console.error('Error reading admin file:', error);
      }
      
      return res.status(401).json({ 
        error: 'Invalid admin credentials',
        message: 'Email or password is incorrect for admin role' 
      });
    }
    
    // If role is 'technician', check technician credentials
    if (role === 'technician') {
      const techniciansPath = path.join(companyPath, 'technicians.json');
      try {
        const techniciansData = await fs.readFile(techniciansPath, 'utf8');
        const technicians = JSON.parse(techniciansData.trim());
        
        const technician = technicians.find(t => t.email === trimmedEmail && t.password === trimmedPassword);
        if (technician) {
          // Get companyId from plant_details.json
          let companyId = sanitizedCompanyName;
          try {
            const plantDetailsPath = path.join(companyPath, 'plant_details.json');
            const plantData = await fs.readFile(plantDetailsPath, 'utf8');
            const plant = JSON.parse(plantData);
            companyId = plant.companyId;
          } catch (error) {
            console.error('Error reading plant details for companyId:', error);
          }
          
          return res.json({
            success: true,
            user: {
              id: technician.id,
              email: technician.email,
              role: 'technician',
              name: technician.name || technician.email,
              companyName: sanitizedCompanyName,
              companyId: companyId
            }
          });
        }
      } catch (error) {
        console.error('Error reading technicians file:', error);
      }
      
      return res.status(401).json({ 
        error: 'Invalid technician credentials',
        message: 'Email or password is incorrect for technician role' 
      });
    }
    
    // If role is 'management', check management.json for management role
    if (role === 'management') {
      const managementPath = path.join(companyPath, 'management.json');
      const entriesPath = path.join(companyPath, 'entries', 'entries.json');
      try {
        const managementData = await fs.readFile(managementPath, 'utf8');
        const managementList = JSON.parse(managementData.trim());
        
        const managementUser = managementList.find(m => m.email === trimmedEmail && m.password === trimmedPassword && m.role === 'management');
        if (managementUser) {
          // Get companyId from plant_details.json
          let companyId = sanitizedCompanyName;
          let userName = managementUser.email;
          
          try {
            const plantDetailsPath = path.join(companyPath, 'plant_details.json');
            const plantData = await fs.readFile(plantDetailsPath, 'utf8');
            const plant = JSON.parse(plantData);
            companyId = plant.companyId;
          } catch (error) {
            console.error('Error reading plant details for companyId:', error);
          }
          
          // Try to get name from entries.json
          try {
            const entriesData = await fs.readFile(entriesPath, 'utf8');
            const entries = JSON.parse(entriesData.trim());
            const entry = entries.find(e => e.email === trimmedEmail && e.role === 'management');
            if (entry) {
              userName = entry.name;
            }
          } catch (error) {
            console.error('Error reading entries file for name:', error);
          }
          
          return res.json({
            success: true,
            user: {
              id: managementUser.id,
              email: managementUser.email,
              role: 'management',
              name: userName,
              companyName: sanitizedCompanyName,
              companyId: companyId
            }
          });
        }
      } catch (error) {
        console.error('Error reading management file:', error);
      }
      
      return res.status(401).json({ 
        error: 'Invalid management credentials',
        message: 'Email or password is incorrect for management role' 
      });
    }
    
    // No role specified, check both (default behavior)
    // Check admin credentials first
    const adminPath = path.join(companyPath, 'admin.json');
    try {
      const adminData = await fs.readFile(adminPath, 'utf8');
      const admin = JSON.parse(adminData);
      
      if (admin.email === trimmedEmail && admin.password === trimmedPassword) {
        // Get companyId from plant_details.json
        let companyId = sanitizedCompanyName;
        try {
          const plantDetailsPath = path.join(companyPath, 'plant_details.json');
          const plantData = await fs.readFile(plantDetailsPath, 'utf8');
          const plant = JSON.parse(plantData);
          companyId = plant.companyId;
        } catch (error) {
          console.error('Error reading plant details for companyId:', error);
        }
        
        return res.json({
          success: true,
          user: {
            id: `admin-${sanitizedCompanyName}`,
            email: admin.email,
            role: 'plantadmin',
            name: `${sanitizedCompanyName} Admin`,
            companyName: sanitizedCompanyName,
            companyId: companyId
          }
        });
      }
    } catch (error) {
      console.error('Error reading admin file:', error);
    }
    
    // Check technician credentials
    const techniciansPath = path.join(companyPath, 'technicians.json');
    try {
      const techniciansData = await fs.readFile(techniciansPath, 'utf8');
      const technicians = JSON.parse(techniciansData.trim());
      
      const technician = technicians.find(t => t.email === trimmedEmail && t.password === trimmedPassword);
      if (technician) {
        // Get companyId from plant_details.json
        let companyId = sanitizedCompanyName;
        try {
          const plantDetailsPath = path.join(companyPath, 'plant_details.json');
          const plantData = await fs.readFile(plantDetailsPath, 'utf8');
          const plant = JSON.parse(plantData);
          companyId = plant.companyId;
        } catch (error) {
          console.error('Error reading plant details for companyId:', error);
        }
        
        return res.json({
          success: true,
          user: {
            id: technician.id,
            email: technician.email,
            role: 'technician',
            name: technician.name || technician.email,
            companyName: sanitizedCompanyName,
            companyId: companyId
          }
        });
      }
    } catch (error) {
      console.error('Error reading technicians file:', error);
    }
    
    res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Email, password, or company name is incorrect' 
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An internal server error occurred' 
    });
  }
});

// Helper function to find company folder by company name
async function findCompanyFolderByName(companyName) {
  try {
    const companies = await fs.readdir(COMPANIES_DIR);
    
    for (const folderName of companies) {
      const companyPath = path.join(COMPANIES_DIR, folderName);
      const stat = await fs.stat(companyPath);
      
      if (stat.isDirectory()) {
        const plantDetailsPath = path.join(companyPath, 'plant_details.json');
        
        try {
          const plantData = await fs.readFile(plantDetailsPath, 'utf8');
          const plant = JSON.parse(plantData);
          
          if (plant.companyName.toLowerCase() === companyName) {
            return companyPath;
          }
        } catch (error) {
          // Skip this folder if plant details can't be read
          continue;
        }
      }
    }
    
    return null; // Company not found
  } catch (error) {
    console.error('Error finding company folder by name:', error);
    return null;
  }
}

// Password verification endpoint for 2FA delete confirmation
app.post('/api/verify-super-admin-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // For now, using a simple password check
    // In production, this should be hashed and stored securely
    const correctPassword = 'super_admin_password';
    
    if (password === correctPassword) {
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`File system server running on port ${PORT}`);
  console.log(`Companies directory: ${COMPANIES_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ PROPER series connection simulation active!`);
  // Startup sanitization across companies
  (async () => {
    try {
      const companies = await fs.readdir(COMPANIES_DIR);
      for (const folderName of companies) {
        const companyPath = path.join(COMPANIES_DIR, folderName);
        try {
          const stat = await fs.stat(companyPath);
          if (stat.isDirectory()) {
            await sanitizeCompanyUsers(companyPath);
          }
        } catch (_) { /* ignore */ }
      }
      console.log('🧹 Startup sanitization complete');
    } catch (e) {
      console.warn('Startup sanitization skipped:', e?.message || e);
    }
  })();
});
