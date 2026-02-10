const dotenv = require('dotenv');
dotenv.config();
const path = require('path');
console.log('[Server] Environment variables loaded from .env');

const express = require('express');
const cors = require('cors');
const { connectDB, sequelize, Company, User, LiveData, Ticket, LoginLog } = require('./models_sql/index');
const { connectThingsBoardDB } = require('./db/thingsboard');
const { protect, authorize, checkCompanyAccess } = require('./middleware/auth_sql');
const { Sequelize, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const {
  securityHeaders,
  generalLimiter,
  apiLimiter,
  authLimiter,
  validateLogin,
  sanitizeInput,
  securityLogger
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(securityHeaders);
app.use(securityLogger);
app.use(cors());
app.use(express.json());
app.use(sanitizeInput);
app.use('/api/', generalLimiter);
app.use('/api/', apiLimiter);

// Connect to Database
connectDB().then(() => {
  // Sync models in development
  sequelize.sync({ alter: true }).then(async () => {
    console.log('PostgreSQL Models Synced');
    // Seed Super Admin
    const seedSuperAdmin = require('./seedSuperAdmin');
    await seedSuperAdmin();
    // Seed TB Test Company
    const seedTB = require('./seedThingsBoard');
    await seedTB();
  });
});

// Connect to ThingsBoard Database
connectThingsBoardDB();

// Import new controllers
const authController = require('./controllers_sql/authController');
const companyController = require('./controllers_sql/companyController');

// --- Auth Routes ---
app.post('/api/auth/login', authLimiter, validateLogin, authController.login);
app.get('/api/auth/me', protect, authController.getMe);
app.post('/api/verify-super-admin-password', protect, authController.verifyPassword);

// --- Company Routes ---
app.get('/api/companies', companyController.getCompanies);
app.post('/api/companies', protect, authorize('super_admin'), companyController.createCompany);
app.get('/api/companies/:id', protect, checkCompanyAccess, companyController.getCompanyById);
app.delete('/api/companies/:companyId', protect, authorize('super_admin'), companyController.deleteCompany);
app.get('/api/companies/:companyId/session-status', protect, authorize('super_admin', 'admin', 'plant_admin'), checkCompanyAccess, companyController.checkSessionStatus);
app.put('/api/companies/:companyId/plant', protect, authorize('super_admin', 'admin', 'plant_admin'), checkCompanyAccess, companyController.updatePlantSettings);

// --- ThingsBoard Routes ---
const thingsboardController = require('./controllers_sql/thingsboardController');
app.get('/api/thingsboard/:deviceId/faults/latest', protect, thingsboardController.getLatestFaults);
app.get('/api/thingsboard/:deviceId/faults/historical', protect, thingsboardController.getHistoricalFaults);
app.get('/api/thingsboard/:deviceId/faults/all', protect, thingsboardController.getAllFaults);

app.get('/api/companies/:companyId/admin', async (req, res) => {
  const admin = await User.findOne({ where: { companyId: req.params.companyId, role: 'admin' } });
  res.json(admin || {});
});


// -----------------------------------------------------------------------------
// LEGACY COMPATIBILITY LAYER
// These routes ensure the existing frontend continues to work with the PostgreSQL backend
// -----------------------------------------------------------------------------


// Get technicians
app.get('/api/companies/:companyId/technicians', protect, checkCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    let techs = [];

    // Strategy: Try reading from DEDICATED table first
    try {
      const company = await Company.findByPk(companyId);
      if (company) {
        const { getCompanyStaffModel } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(company.companyName);
        techs = await DynamicStaff.findAll({
          where: { role: 'technician' },
          attributes: { exclude: ['password'] }
        });
        if (techs.length > 0) {
          return res.json(techs);
        }
      }
    } catch (e) {
      console.warn('Dedicated table read failed, falling back to global:', e.message);
    }

    // Fallback: Read from Global Table
    techs = await User.findAll({
      where: { companyId, role: 'technician' },
      attributes: { exclude: ['password'] }
    });
    res.json(techs);
  } catch (error) {
    console.error('Error reading technicians:', error);
    res.status(500).json({ error: 'Failed to read technicians' });
  }
});

// Get management
app.get('/api/companies/:companyId/management', protect, checkCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    let mgmt = [];

    // Strategy: Try reading from DEDICATED table first
    try {
      const company = await Company.findByPk(companyId);
      if (company) {
        const { getCompanyStaffModel } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(company.companyName);
        // Note: Roles might differ in stored format, ensure consistency
        const { Op } = require('sequelize');
        mgmt = await DynamicStaff.findAll({
          where: {
            role: { [Op.in]: ['management', 'admin', 'plant_admin'] }
          },
          attributes: { exclude: ['password'] }
        });
        if (mgmt.length > 0) {
          return res.json(mgmt);
        }
      }
    } catch (e) {
      console.warn('Dedicated table read failed, falling back to global:', e.message);
    }

    mgmt = await User.findAll({
      where: { companyId, role: ['management', 'admin', 'plant_admin'] },
      attributes: { exclude: ['password'] }
    });
    res.json(mgmt);
  } catch (error) {
    console.error('Error reading management:', error);
    res.status(500).json({ error: 'Failed to read management' });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', authController.logout);

// Add staff entry (Technician/Management)
app.post('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, role, email, phoneNumber, password, companyName } = req.body;

    // Fetch company name if not provided
    let targetCompanyName = companyName;
    if (!targetCompanyName) {
      const company = await Company.findByPk(companyId);
      if (company) targetCompanyName = company.companyName;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);
    const newUserId = `user-${Date.now()}`;

    // 1. Create in GLOBAL User Table
    const newUser = await User.create({
      userId: newUserId,
      email,
      password: hashedPassword,
      name,
      role: role || 'technician',
      companyId,
      phoneNumber,
      accountStatus: 'active'
    });

    // 2. Create in DEDICATED Company Table (login_credentials)
    if (targetCompanyName) {
      try {
        const { getCompanyStaffModel } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(targetCompanyName);
        await DynamicStaff.create({
          userId: newUserId,
          companyName: targetCompanyName,
          userName: name,
          email,
          role: role || 'technician',
          phoneNumber,
          status: 'active',
          password: hashedPassword
        });
        console.log(`[Staff] Saved to login_credentials for ${targetCompanyName}`);
      } catch (dynError) {
        console.error('[Staff] Failed to save to dedicated table:', dynError.message);
      }
    }

    res.json({ success: true, user: newUser });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Error adding staff entry:', error);
    res.status(500).json({ error: 'Failed to add staff entry' });
  }
});

// Get all staff entries (Unified from dedicated table login_credentials)
app.get('/api/companies/:companyId/entries', protect, checkCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    let staff = [];

    // Strategy: Try reading from DEDICATED table first
    try {
      const company = await Company.findByPk(companyId);
      if (company) {
        const { getCompanyStaffModel } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(company.companyName);
        const rows = await DynamicStaff.findAll({
          where: { userId: { [Op.ne]: req.user.userId } }, // Exclude current user
          attributes: { exclude: ['password'] }
        });
        if (rows.length > 0) {
          const { initializeTenantSchema } = require('./utils/dynamicModel');
          const models = await initializeTenantSchema(company.companyName);
          const LoginDetails = models.LoginDetails;

          const results = await Promise.all(rows.map(async s => {
            const item = s.toJSON();
            // Fetch latest login detail for this user by Name
            const detail = await LoginDetails.findOne({
              where: { userId: item.userName },
              order: [['createdAt', 'DESC']]
            });
            // If no LoginDetails record exists, default to 'active' and not blocked
            const isBlocked = detail ? detail.presentStatus === 'blocked' : false;
            return {
              ...item,
              id: item.userId || item.id,
              name: item.userName || item.name,
              status: isBlocked ? 'blocked' : (detail ? (detail.presentStatus === 'offline' ? 'inactive' : detail.presentStatus) : 'active'), // Default to 'active' if no LoginDetails
              failedLoginAttempts: detail ? detail.attempts : 0,
              lastLogin: detail ? detail.timeIn : null
            };
          }));
          return res.json(results);
        }
      }
    } catch (e) {
      console.warn('Dedicated table read entries failed, falling back to global:', e.message);
    }

    // Fallback: Read from Global Table
    staff = await User.findAll({
      where: {
        companyId,
        role: ['management', 'admin', 'plant_admin', 'technician'],
        userId: { [Op.ne]: req.user.userId } // Exclude current user
      },
      attributes: { exclude: ['password'] }
    });
    res.json(staff);
  } catch (error) {
    console.error('Error reading staff entries:', error);
    res.status(500).json({ error: 'Failed to read staff entries' });
  }
});

// Update staff entry
app.put('/api/companies/:companyId/entries/:entryId', protect, authorize('super_admin', 'admin', 'plant_admin'), checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { name, role, email, phoneNumber, force } = req.body;

    // 1. Update Global
    const user = await User.findByPk(entryId);
    if (!user) return res.status(404).json({ error: 'Staff member not found' });

    // --- NEW: Check if staff member is logged in ---
    if (user.isLoggedIn && !force) {
      return res.status(409).json({
        error: 'the staff member you are trying to edit is logged in still want to edit forcely ?'
      });
    }

    user.name = name;
    user.role = role;
    user.email = email;
    user.phoneNumber = phoneNumber;
    if (force) {
      // Force logout on edit
      user.isLoggedIn = false;
    }
    await user.save();

    // 2. Update Dedicated (LoginCredentials)
    try {
      const company = await Company.findByPk(companyId);
      if (company) {
        const { getCompanyStaffModel } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(company.companyName);
        const staffMember = await DynamicStaff.findByPk(entryId);
        if (staffMember) {
          staffMember.userName = name;
          staffMember.role = role;
          staffMember.email = email;
          staffMember.phoneNumber = phoneNumber;
          await staffMember.save();
        }
      }
    } catch (e) {
      console.warn('Dedicated table update failed:', e.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating staff entry:', error);
    res.status(500).json({ error: 'Failed to update staff entry' });
  }
});

// Update staff status (Block/Activate)
app.patch('/api/companies/:companyId/entries/:entryId/status', async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { status } = req.body; // 'active' or 'blocked'

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    // 1. Update LoginCredentials status (active/inactive)
    const user = await models.LoginCredentials.findByPk(entryId);
    if (user) {
      user.status = status === 'blocked' ? 'inactive' : 'active';
      await user.save();
    }

    // 2. Update LoginDetails presentStatus (active/blocked)
    const detail = await models.LoginDetails.findOne({
      where: { userId: user ? user.userName : entryId },
      order: [['createdAt', 'DESC']]
    });

    if (detail) {
      detail.presentStatus = status;
      // Reset attempts if unblocking
      if (status === 'active' || status === 'online') {
        detail.attempts = 0;
      }
      await detail.save();
    } else {
      // Create a record if none exists
      await models.LoginDetails.create({
        companyName: company.companyName,
        userId: user ? user.userName : entryId,
        presentStatus: status,
        attempts: (status === 'active' || status === 'online') ? 0 : 0
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating staff status:', error);
    res.status(500).json({ error: 'Failed to update staff status' });
  }
});

// Delete staff entry
app.delete('/api/companies/:companyId/entries/:entryId', protect, authorize('super_admin', 'admin', 'plant_admin'), checkCompanyAccess, async (req, res) => {
  try {
    const { companyId, entryId } = req.params;
    const { force } = req.query;
    console.log(`[Delete] Request to delete User ${entryId} from Company ${companyId}, Force: ${force}`);

    // Check if user exists and is logged in
    const userTodelete = await User.findByPk(entryId);
    if (userTodelete && userTodelete.isLoggedIn && force !== 'true') {
      return res.status(409).json({
        error: 'the staff member you are trying to delete is logged in still want to proceed ?'
      });
    }

    // 0. Delete Dependencies (Login Logs) to avoid Foreign Key Constraint Errors
    // Even if cascade is set, explicit delete is safer here
    try {
      const { LoginLog } = require('./models_sql');
      await LoginLog.destroy({ where: { userId: entryId } });
    } catch (logErr) {
      console.warn(`[Delete] Failed to clean up LoginLogs: ${logErr.message}`);
    }

    // 1. Delete from Global
    const deletedCount = await User.destroy({ where: { userId: entryId } });
    console.log(`[Delete] Global User deleted count: ${deletedCount}`);

    // 2. Delete from Dedicated
    try {
      const company = await Company.findByPk(companyId);
      if (company) {
        const { getCompanyStaffModel } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(company.companyName);
        await DynamicStaff.destroy({ where: { userId: entryId } });
        console.log(`[Delete] User ${entryId} deleted from dedicated table`);
      }
    } catch (e) {
      console.warn('Dedicated table delete failed:', e.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting staff entry:', error);
    res.status(500).json({ error: 'Failed to delete staff entry' });
  }
});


// LIVE DATA / TABLES ROUTES (Mapping to PostgreSQL LiveData)

app.get('/api/companies/:companyId/live-data', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // --- ThingsBoard Data Source ---
    if (company.dataSource === 'thingsboard' && company.externalDeviceId) {
      const { thingsboardSequelize } = require('./db/thingsboard');
      const query = `
            SELECT
                ts.ts AS timestamp_ms,
                kd.key AS key_name,
                ts.str_v AS value
            FROM ts_kv ts
            JOIN device d ON ts.entity_id = d.id
            JOIN key_dictionary kd ON ts.key = kd.key_id
            WHERE d.id = :deviceId::uuid
              AND kd.key LIKE 'fault_n%'
              AND ts.ts = (
                  SELECT MAX(ts2.ts)
                  FROM ts_kv ts2
                  WHERE ts2.entity_id = d.id
              )
            ORDER BY kd.key;
        `;

      const results = await thingsboardSequelize.query(query, {
        replacements: { deviceId: company.externalDeviceId },
        type: Sequelize.QueryTypes.SELECT
      });

      const mapped = results.map(row => {
        const nodeData = JSON.parse(row.value || '{}');
        const nodeMatch = row.key_name.match(/fault_n(\d+)/);
        const nodeNum = nodeMatch ? nodeMatch[1] : '001';
        const nodeName = `Node-${nodeNum.padStart(3, '0')}`;

        const panelVoltages = [];
        const panelStatuses = [];
        const panelCurrents = [];

        for (let i = 1; i <= 20; i++) {
          const p = nodeData[`p${i}`];
          const s = p ? p.s : -1;
          let status = 'good';
          if (s === 2) status = 'bad';
          else if (s === 1 || s === -1) status = 'moderate';

          panelStatuses.push(status);
          panelVoltages.push(status === 'good' ? company.voltagePerPanel : status === 'bad' ? 0 : (company.voltagePerPanel * 0.7));
          panelCurrents.push(status === 'good' ? company.currentPerPanel : status === 'bad' ? 0 : (company.currentPerPanel * 0.7));
        }

        return {
          node: nodeName,
          id: nodeName,
          serialNumber: nodeName,
          panelVoltages,
          panelStatuses,
          panelCurrents,
          voltagePerPanel: company.voltagePerPanel,
          currentPerPanel: company.currentPerPanel,
          current: company.currentPerPanel,
          panelCount: 20,
          updatedAt: new Date(parseInt(row.timestamp_ms))
        };
      });

      return res.json(mapped);
    }

    // --- Standard SQL/Tenant Data Source ---
    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);
    const records = await models.LiveData.findAll({ order: [['node', 'ASC']] });
    const faults = await models.FaultTable.findAll();

    // Map columns to arrays for frontend compatibility
    const mapped = records.map(r => {
      const item = r.get({ plain: true });
      const faultRow = faults.find(f => f.node === item.node);
      const voltages = [];
      const currents = [];
      const statuses = [];

      const pCount = item.panelCount || 20;
      for (let i = 1; i <= pCount; i++) {
        voltages.push(item[`p${i}v`] || 0);
        currents.push(item[`p${i}c`] || 0);
        const s = faultRow ? faultRow[`p${i}`] : 'G';
        statuses.push(s === 'B' ? 'bad' : s === 'M' ? 'moderate' : 'good');
      }
      return {
        ...item,
        id: item.node, // Frontend compatibility
        serialNumber: item.node, // Legacy UI support
        panelVoltages: voltages,
        panelCurrents: currents,
        panelStatuses: statuses
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching live data:', error);
    res.status(500).json({ error: 'Failed to fetch live data' });
  }
});

// Create a Table (Node) - Uses Tenant live_data and fault_tables
app.post('/api/companies/:companyId/tables', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { panelCount, nodeName, voltage, current: nodeCurrent } = req.body;

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    let node = nodeName;
    if (!node || node.trim() === '') {
      // Auto-calculate next node number in backend for robustness
      const existing = await models.LiveData.findAll({ attributes: ['node'] });
      let maxNum = 0;
      existing.forEach(e => {
        const m = e.node.match(/(\d+)/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n < 10000 && n >= maxNum) maxNum = n;
        }
      });
      const pad = (n) => n.toString().padStart(3, '0');
      node = `Node-${pad(maxNum + 1)}`;
    }

    // 1. Create in LiveData table with initialized voltages
    const liveDataPayload = {
      node,
      panelCount: panelCount || 20,
      temperature: 35.5,
      lightIntensity: 800,
      current: nodeCurrent || 10.0,
      voltagePerPanel: voltage !== undefined ? parseFloat(voltage) : (company.voltagePerPanel || 20.0),
      currentPerPanel: nodeCurrent !== undefined ? parseFloat(nodeCurrent) : (company.currentPerPanel || 10.0)
    };

    // Initialize p1v...p20v and p1c...p20c with safe parsing
    const vVal = parseFloat(voltage);
    const cVal = parseFloat(nodeCurrent);
    const startVoltage = (!isNaN(vVal) && vVal > 0) ? vVal : (company.voltagePerPanel || 20.0);
    const startCurrent = (!isNaN(cVal) && cVal > 0) ? cVal : (company.currentPerPanel || 10.0);

    // Update payload with validated numbers
    liveDataPayload.voltagePerPanel = startVoltage;
    liveDataPayload.currentPerPanel = startCurrent;
    liveDataPayload.current = startCurrent;

    for (let i = 1; i <= 20; i++) {
      const isActive = i <= (panelCount || 20);
      liveDataPayload[`p${i}v`] = isActive ? startVoltage : 0;
      liveDataPayload[`p${i}c`] = isActive ? startCurrent : 0;
    }

    await models.LiveData.create(liveDataPayload);

    // 2. Create in FaultTable with sync'd status
    const faultPayload = { node };
    let initialStatus = 'G';
    if (startVoltage < 10) initialStatus = 'B';
    else if (startVoltage < 18) initialStatus = 'M';

    for (let i = 1; i <= 20; i++) {
      faultPayload[`p${i}`] = i <= (panelCount || 20) ? initialStatus : 'G';
    }

    await models.FaultTable.create(faultPayload);

    res.json({ success: true, table: { node } });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update Table (Node)
app.put('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { temperature, lightIntensity, current, panelCount, serialNumber, voltagePerPanel, currentPerPanel } = req.body;

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    const table = await models.LiveData.findOne({ where: { node: tableId } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    // Handle Rename (Primary Key update)
    if (serialNumber && serialNumber !== tableId) {
      // Update LiveData
      await models.LiveData.update({ node: serialNumber }, { where: { node: tableId } });
      // Update FaultTable
      await models.FaultTable.update({ node: serialNumber }, { where: { node: tableId } });

      // Refresh table instance for subsequent updates
      table.node = serialNumber;
    }

    const oldPanelCount = table.panelCount || 20;
    const oldV = table.voltagePerPanel || company.voltagePerPanel || 20.0;
    const oldC = table.currentPerPanel || company.currentPerPanel || 10.0;

    if (panelCount !== undefined) table.panelCount = parseInt(panelCount);
    if (voltagePerPanel !== undefined) table.voltagePerPanel = parseFloat(voltagePerPanel);
    if (currentPerPanel !== undefined) table.currentPerPanel = parseFloat(currentPerPanel);

    const vNominal = table.voltagePerPanel || company.voltagePerPanel || 20.0;
    const cNominal = table.currentPerPanel || company.currentPerPanel || 10.0;

    const vChanged = vNominal !== oldV;
    const cChanged = cNominal !== oldC;

    // If panel count increased or nominals changed, initialize/update panel values
    const newPanelCount = table.panelCount;
    for (let i = 1; i <= 20; i++) {
      if (i <= newPanelCount) {
        // Update to new nominals if they changed OR if newly added
        if (i > oldPanelCount || table[`p${i}v`] === 0 || vChanged) {
          table[`p${i}v`] = vNominal;
        }
        if (i > oldPanelCount || table[`p${i}c`] === 0 || cChanged) {
          table[`p${i}c`] = cNominal;
        }
      } else {
        // For removed panels, reset to 0
        table[`p${i}v`] = 0;
        table[`p${i}c`] = 0;
      }
    }

    // Recalculate overall node current
    let minCurrent = cNominal;
    for (let i = 1; i <= newPanelCount; i++) {
      const pCur = table[`p${i}c`];
      if (pCur !== undefined && pCur < minCurrent) {
        minCurrent = pCur;
      }
    }
    table.current = minCurrent;

    await table.save();

    // 2. Sync FaultTable
    const fault = await models.FaultTable.findOne({ where: { node: table.node } });
    if (fault) {
      for (let i = 1; i <= 20; i++) {
        if (i <= newPanelCount) {
          const v = table[`p${i}v`];
          const c = table[`p${i}c`];
          let status = 'G';
          if ((v / vNominal) * 100 < 50 || (c / cNominal) * 100 < 50) status = 'B';
          else if ((v / vNominal) * 100 < 98 || (c / cNominal) * 100 < 98) status = 'M';
          fault[`p${i}`] = status;
        } else {
          fault[`p${i}`] = 'G'; // Reset removed panels to default Good
        }
      }
      await fault.save();
    }

    res.json({ success: true, table });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete Table (Node)
app.delete('/api/companies/:companyId/tables/:tableId', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    const deleted = await models.LiveData.destroy({ where: { node: tableId } });
    // Also cleanup fault table
    await models.FaultTable.destroy({ where: { node: tableId } });

    if (!deleted) return res.status(404).json({ error: 'Table not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});


// Add Panels to Table
app.post('/api/companies/:companyId/tables/:tableId/add-panels', async (req, res) => {
  try {
    const { companyId, tableId } = req.params;
    const { panelCount } = req.body; // How many to add

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    const table = await models.LiveData.findOne({ where: { node: tableId } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const oldPanelCount = table.panelCount || 0;
    const newTotal = Math.min(20, oldPanelCount + parseInt(panelCount || 1));

    table.panelCount = newTotal;

    const vNominal = table.voltagePerPanel || company.voltagePerPanel || 20.0;
    const cNominal = table.currentPerPanel || company.currentPerPanel || 10.0;

    for (let i = oldPanelCount + 1; i <= newTotal; i++) {
      table[`p${i}v`] = vNominal;
      table[`p${i}c`] = cNominal;
    }

    await table.save();

    // Sync FaultTable
    const fault = await models.FaultTable.findOne({ where: { node: tableId } });
    if (fault) {
      for (let i = oldPanelCount + 1; i <= newTotal; i++) {
        fault[`p${i}`] = 'G';
      }
      await fault.save();
    }

    res.json({ success: true, table });
  } catch (error) {
    console.error('Error adding panels:', error);
    res.status(500).json({ error: 'Failed to add panels' });
  }
});

// Delete Panel from Table
app.delete('/api/companies/:companyId/tables/:tableId/panels/:panelId', async (req, res) => {
  try {
    const { companyId, tableId, panelId } = req.params;

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    const table = await models.LiveData.findOne({ where: { node: tableId } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    // Extract panel index from ID (e.g., Node-001-P5 -> index 4)
    const match = panelId.match(/P(\d+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid panel ID format' });
    const indexToRemove = parseInt(match[1]) - 1;

    const currentCount = table.panelCount || 0;
    if (indexToRemove < 0 || indexToRemove >= currentCount) {
      return res.status(400).json({ error: 'Panel index out of range' });
    }

    // Shift data for subsequent panels
    for (let i = indexToRemove + 1; i < currentCount; i++) {
      table[`p${i}v`] = table[`p${i + 1}v`];
      table[`p${i}c`] = table[`p${i + 1}c`];
    }
    // Clear the last panel's data
    table[`p${currentCount}v`] = 0;
    table[`p${currentCount}c`] = 0;

    table.panelCount = Math.max(0, currentCount - 1);
    await table.save();

    // Sync FaultTable (Shift statuses)
    const fault = await models.FaultTable.findOne({ where: { node: tableId } });
    if (fault) {
      for (let i = indexToRemove + 1; i < currentCount; i++) {
        fault[`p${i}`] = fault[`p${i + 1}`];
      }
      fault[`p${currentCount}`] = 'G';
      await fault.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting panel:', error);
    res.status(500).json({ error: 'Failed to delete panel' });
  }
});

// Update Panel Data (Current/Voltage) - Main entry for sensor data or manual override
app.put('/api/companies/:companyId/panels/current', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tableId, index, current, voltage } = req.body;
    console.log(`[Panels/Current] Request received for company: ${companyId}, table: ${tableId}, index: ${index}`);

    const company = await Company.findOne({
      where: { companyId: req.params.companyId }
    });

    if (!company) {
      console.warn(`[Panels/Current] Company NOT found for ID: ${req.params.companyId}`);
      return res.status(404).json({ error: `Company '${req.params.companyId}' not found.` });
    }

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    // 1. Update LiveData (Specific Panel Voltage and Current)
    console.log(`[Panels/Current] Attempting to find node: ${tableId} for company: ${company.companyName}`);
    const live = await models.LiveData.findOne({ where: { node: tableId } });
    if (!live) {
      return res.status(404).json({ error: `Node '${tableId}' not found in company '${company.companyName}'` });
    }

    if (voltage !== undefined && voltage !== null && voltage !== '') {
      const v = parseFloat(voltage);
      if (!isNaN(v)) live[`p${index + 1}v`] = v;
    }

    const { propagateSeries } = req.body;
    if (current !== undefined && current !== null && current !== '') {
      const c = parseFloat(current);
      if (!isNaN(c)) {
        if (propagateSeries) {
          // Update ALL panels in the string to this current limit
          const pCount = live.panelCount || 20;
          for (let i = 1; i <= pCount; i++) {
            live[`p${i}c`] = c;
          }
        } else {
          // Only update the target culprit
          live[`p${index + 1}c`] = c;
        }
      }
    }

    // Series Propagation Logic: node current is the MINIMUM of all active panels
    const panelCount = live.panelCount || 20;
    let minCurrent = live.currentPerPanel || company.currentPerPanel || 10.0;

    for (let i = 1; i <= panelCount; i++) {
      const pCur = live[`p${i}c`];
      if (pCur !== undefined && pCur < minCurrent) {
        minCurrent = pCur;
      }
    }
    live.current = minCurrent;
    await live.save();

    // 2. Automatically Update FaultTable for ALL panels based on updated values
    const fault = await models.FaultTable.findOne({ where: { node: tableId } });
    if (fault) {
      const vNominal = live.voltagePerPanel || company.voltagePerPanel || 20.0;
      const cNominal = live.currentPerPanel || company.currentPerPanel || 10.0;

      console.log(`[Panels/Current] Updating FaultTable for ${tableId}. Nominal V: ${vNominal}, C: ${cNominal}`);
      for (let i = 1; i <= panelCount; i++) {
        const v = live[`p${i}v`];
        const c = live[`p${i}c`];

        let status = 'G';
        const vHealth = vNominal > 0 ? (v / vNominal) * 100 : 0;
        const cHealth = cNominal > 0 ? (c / cNominal) * 100 : 0;

        if (vHealth < 50 || cHealth < 50) {
          status = 'B';
        } else if (vHealth < 98 || cHealth < 98) {
          status = 'M';
        }

        if (status !== 'G') {
          console.log(`[Panels/Current] Index ${i}: V=${v}, C=${c} -> Status: ${status} (vH:${vHealth.toFixed(1)}%, cH:${cHealth.toFixed(1)}%)`);
        }
        fault[`p${i}`] = status;
      }
      await fault.save();
    }

    console.log(`[Panels/Current] Successfully updated ${tableId}`);
    res.json({ success: true, nodeCurrent: minCurrent });
  } catch (error) {
    console.error('[Panels/Current] CRITICAL ERROR:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
      stack: error.stack
    });
  }
});

// TICKETS & FAULTS

app.post('/api/companies/:companyId/tickets/resolve', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { trackId, fault, reason, category, resolvedBy, resolvedAt } = req.body;

    const ticket = await Ticket.create({
      id: `ticket-${Date.now()}`,
      companyId,
      trackId,
      fault,
      reason,
      category,
      resolvedBy,
      resolvedAt
    });
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.get('/api/companies/:companyId/tickets', async (req, res) => {
  try {
    // status query param ignored for now, assuming resolved
    const tickets = await Ticket.findAll({ where: { companyId: req.params.companyId } });
    res.json(tickets);
  } catch (error) {
    console.error('Error reading tickets:', error);
    res.status(500).json({ error: 'Failed to read tickets' });
  }
});

// Resolve Panel (Fault Injection/Fix) - Updates Tenant live_data and fault_tables
app.put('/api/companies/:companyId/resolve-panel', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tableId, index } = req.body;

    const company = await Company.findOne({
      where: { companyId: req.params.companyId }
    });
    if (!company) {
      console.warn(`[ResolvePanel] Company NOT found for ID: ${req.params.companyId}`);
      return res.status(404).json({ error: 'Company not found' });
    }

    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    // 1. Update LiveData (Set panel back to fresh nominals)
    const live = await models.LiveData.findOne({ where: { node: tableId } });
    if (live) {
      const vNominal = live.voltagePerPanel || company.voltagePerPanel || 20.0;
      const cNominal = live.currentPerPanel || company.currentPerPanel || 10.0;

      // Reset environmental factors to "fresh" defaults if they were extreme
      live.temperature = 35.5;
      live.lightIntensity = 800;

      // Reset the specific panel
      live[`p${index + 1}v`] = vNominal;
      live[`p${index + 1}c`] = cNominal;

      // Recalculate node current (min of all ACTIVE panel currents)
      const panelCount = live.panelCount || 20;
      let minCurrent = cNominal; // Start with nominal for this node
      for (let i = 1; i <= panelCount; i++) {
        const pCur = live[`p${i}c`];
        if (pCur !== undefined && pCur !== null && pCur < minCurrent) {
          minCurrent = pCur;
        }
      }
      live.current = minCurrent;
      await live.save();

      // 2. Full FaultTable Update (Ensure bottlenecked panels are also cleared)
      const fault = await models.FaultTable.findOne({ where: { node: tableId } });
      if (fault) {
        for (let i = 1; i <= panelCount; i++) {
          const v = live[`p${i}v`];
          const c = live[`p${i}c`];

          let status = 'G';
          const vHealth = (v / vNominal) * 100;
          const cHealth = (c / cNominal) * 100;

          if (vHealth < 50 || cHealth < 50) {
            status = 'B';
          } else if (vHealth < 98 || cHealth < 98) {
            status = 'M';
          }
          fault[`p${i}`] = status;
        }
        await fault.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving panel:', error);
    res.status(500).json({ error: 'Failed to resolve panel' });
  }
});


// Node Fault Status (Snapshot) - Reads from Tenant fault_tables or ThingsBoard
app.get('/api/companies/:companyId/node-fault-status', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // --- ThingsBoard Data Source ---
    if (company.dataSource === 'thingsboard' && company.externalDeviceId) {
      const { thingsboardSequelize } = require('./db/thingsboard');
      const query = `
            SELECT
                ts.ts AS timestamp_ms,
                kd.key AS key_name,
                ts.str_v AS value
            FROM ts_kv ts
            JOIN device d ON ts.entity_id = d.id
            JOIN key_dictionary kd ON ts.key = kd.key_id
            WHERE d.id = :deviceId::uuid
              AND kd.key LIKE 'fault_n%'
              AND ts.ts = (
                  SELECT MAX(ts2.ts)
                  FROM ts_kv ts2
                  WHERE ts2.entity_id = d.id
              )
            ORDER BY kd.key;
        `;

      const results = await thingsboardSequelize.query(query, {
        replacements: { deviceId: company.externalDeviceId },
        type: Sequelize.QueryTypes.SELECT
      });

      const snapshot = results.map(row => {
        const nodeData = JSON.parse(row.value || '{}');
        const status = {};
        // Map p1-p20 to P1-P20
        for (let i = 1; i <= 20; i++) {
          const p = nodeData[`p${i}`];
          const s = p ? p.s : -1;
          status[`P${i}`] = s === 0 ? 'good' : s === 2 ? 'bad' : 'moderate';
        }

        // Extract node number from 'fault_n1' -> 'Node-001'
        const nodeMatch = row.key_name.match(/fault_n(\d+)/);
        const nodeNum = nodeMatch ? nodeMatch[1] : '001';
        const nodeName = `Node-${nodeNum.padStart(3, '0')}`;

        return {
          node: nodeName,
          timestamp: new Date(parseInt(row.timestamp_ms)),
          ...status
        };
      });

      return res.json(snapshot);
    }

    // --- Standard SQL/Tenant Data Source ---
    const { initializeTenantSchema } = require('./utils/dynamicModel');
    const models = await initializeTenantSchema(company.companyName);

    const faults = await models.FaultTable.findAll();
    const live = await models.LiveData.findAll();

    const snapshot = faults.map(f => {
      const status = {};
      const plainF = f.get({ plain: true });
      for (let i = 1; i <= 20; i++) {
        const val = plainF[`p${i}`];
        status[`P${i}`] = val === 'G' ? 'good' : val === 'B' ? 'bad' : 'moderate';
      }

      const liveNode = live.find(l => l.node === f.node);

      return {
        node: f.node,
        timestamp: liveNode ? liveNode.updatedAt : f.updatedAt,
        ...status
      };
    });

    res.json(snapshot);
  } catch (error) {
    console.error('Error getting fault status:', error);
    res.status(500).json({ error: 'Failed to get fault status' });
  }
});


// Basic Health Check
// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    // Only serve index.html if it exists, otherwise standard API check
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Basic Health Check for Dev
  app.get('/', (req, res) => {
    res.send('Solar Plant SQL API Running (Development Mode)');
  });
}

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Super Admin: Get all blocked company admins across all tenants
app.get('/api/superadmin/blocked-admins', async (req, res) => {
  try {
    const companies = await Company.findAll();
    const allBlockedAdmins = [];

    for (const company of companies) {
      try {
        const { getCompanyStaffModel, initializeTenantSchema } = require('./utils/dynamicModel');
        const DynamicStaff = await getCompanyStaffModel(company.companyName);
        const models = await initializeTenantSchema(company.companyName);
        const LoginDetails = models.LoginDetails;

        const admins = await DynamicStaff.findAll({
          where: { role: 'plant_admin' }
        });

        for (const admin of admins) {
          const detail = await LoginDetails.findOne({
            where: { userId: admin.userName },
            order: [['createdAt', 'DESC']]
          });

          if (detail && detail.presentStatus === 'blocked') {
            allBlockedAdmins.push({
              id: admin.userId || admin.id,
              name: admin.userName,
              email: admin.email,
              companyName: company.companyName,
              companyId: company.companyId || company.id,
              failedLoginAttempts: detail.attempts,
              lastAttempt: detail.createdAt
            });
          }
        }
      } catch (e) {
        console.warn(`Error checking blocked admins for ${company.companyName}:`, e.message);
      }
    }

    res.json(allBlockedAdmins);
  } catch (error) {
    console.error('Error fetching all blocked admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
