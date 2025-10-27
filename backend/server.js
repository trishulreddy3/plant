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

// Set environment based on PORT
const COMPANIES_DIR = path.join(__dirname, 'companies');

// Helper function to find company folder by companyId
async function findCompanyFolder(companyId) {
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
          
          if (plant.companyId === companyId) {
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
    console.error('Error finding company folder:', error);
    return null;
  }
}

// Panel health states and repair simulation
const PANEL_STATES = {
  GOOD: { min: 50, max: 100, image: 'image1.png', color: 'blue' },
  REPAIRING: { min: 20, max: 49, image: 'image2.png', color: 'orange' },
  FAULT: { min: 0, max: 19, image: 'image3.png', color: 'red' }
};

// Generate realistic panel data with PROPER series connection logic and repair simulation
const generatePanelData = (panelCount, voltagePerPanel, currentPerPanel, existingData = null) => {
  const voltage = [];
  const current = [];
  const power = [];
  const panelHealth = [];
  const panelStates = [];
  const actualFaultStatus = []; // Track which panels are actually faulty vs series-affected
  
  // Initialize or continue repair process
  if (existingData && existingData.health && existingData.states) {
    // Continue existing repair process - find the actual faulty panel
    let actualFaultyIndex = -1;
    let lowestHealth = 100;
    
    for (let i = 0; i < panelCount; i++) {
      let currentHealth = existingData.health[i] || Math.random() * 100;
      let currentState = existingData.states[i] || 'good';
      let isActuallyFaulty = false;
      
      // Identify the actual faulty panel (lowest health that's not good)
      if (currentHealth < 50) { // Changed threshold to 50% as per requirement
        if (actualFaultyIndex === -1 || currentHealth < lowestHealth) {
          actualFaultyIndex = i;
          lowestHealth = currentHealth;
        }
      }
      
      // Simulate repair process ONLY for the actual faulty panel
      if (i === actualFaultyIndex && currentHealth < 50) {
        isActuallyFaulty = true;
        if (currentState === 'fault' && currentHealth < 20) {
          // Gradually repair fault panels (increase health by 2-5% per cycle)
          currentHealth += 2 + Math.random() * 3;
        } else if (currentState === 'repairing' && currentHealth >= 20 && currentHealth < 50) {
          // Gradually repair repairing panels (increase health by 3-7% per cycle)
          currentHealth += 3 + Math.random() * 4;
        }
        
        // Determine state based on current health
        if (currentHealth < 20) {
          currentState = 'fault';
        } else if (currentHealth < 50) {
          currentState = 'repairing';
        } else {
          currentState = 'good';
        }
      } else if (currentState === 'good' && currentHealth >= 50) {
        // Maintain good condition with slight variations for healthy panels
        currentHealth = Math.max(50, Math.min(100, currentHealth + (Math.random() - 0.5) * 2));
      }
      
      panelHealth.push(Math.round(currentHealth * 10) / 10);
      panelStates.push(currentState);
      actualFaultStatus.push(isActuallyFaulty);
    }
  } else {
    // Initialize new panel data
    for (let i = 0; i < panelCount; i++) {
      // Start with good condition (50-100% health)
      const health = 50 + Math.random() * 50;
      panelHealth.push(Math.round(health * 10) / 10);
      panelStates.push('good');
      actualFaultStatus.push(false);
    }
  }
  
  // Introduce NEW faults - only ONE panel gets fault per series per cycle
  const hasExistingFault = panelStates.some(state => state === 'fault' || state === 'repairing');
  const allHealthy = panelStates.every(state => state === 'good');
  
  if (allHealthy && Math.random() < 0.8) { // 80% chance to introduce a fault for testing
    // Randomly select ONE panel to become faulty
    const faultyPanelIndex = Math.floor(Math.random() * panelCount);
    
    if (Math.random() < 0.4) {
      // 40% chance of fault (dust, damage, etc.) - health < 20%
      panelHealth[faultyPanelIndex] = Math.random() * 19; // 0-19%
      panelStates[faultyPanelIndex] = 'fault';
    } else {
      // 60% chance of repairing (cleaning, minor issues) - health 20-49%
      panelHealth[faultyPanelIndex] = 20 + Math.random() * 29; // 20-49%
      panelStates[faultyPanelIndex] = 'repairing';
    }
    
    // Mark this panel as actually faulty
    actualFaultStatus[faultyPanelIndex] = true;
  }
  
  // Find the weakest panel (bottleneck in series connection)
  const weakestHealth = Math.min(...panelHealth);
  const actualFaultyIndex = panelHealth.indexOf(weakestHealth);
  
  // Determine series state based on weakest panel
  let seriesState;
  if (weakestHealth < 20) {
    seriesState = 'fault';
  } else if (weakestHealth < 50) {
    seriesState = 'repairing';
  } else {
    seriesState = 'good';
  }
  
  // Apply PROPER series connection logic - all panels FROM the faulty panel onwards show the same status
  const seriesHealth = weakestHealth;
  
  // Generate data for each panel
  for (let i = 0; i < panelCount; i++) {
    // Voltage varies slightly per panel (98-102% of nominal)
    const voltageVariation = voltagePerPanel * (0.98 + Math.random() * 0.04);
    const actualVoltage = Math.round(voltageVariation * 10) / 10;
    
    // Current is limited by the weakest panel in series
    let currentMultiplier;
    if (seriesHealth >= 50) {
      // Perfect health: 95-100% current
      currentMultiplier = 0.95 + Math.random() * 0.05;
    } else if (seriesHealth >= 20) {
      // Repairing mode: 20-80% current based on health
      currentMultiplier = 0.2 + (seriesHealth / 50) * 0.6; // Adjusted for 50% threshold
    } else {
      // Fault condition: 5-20% current
      currentMultiplier = 0.05 + (seriesHealth / 20) * 0.15; // Adjusted for 20% threshold
    }
    
    const seriesLimitedCurrent = currentPerPanel * currentMultiplier;
    const actualCurrent = Math.round(seriesLimitedCurrent * 10) / 10;
    const actualPower = Math.round(actualVoltage * actualCurrent * 10) / 10;
    
    voltage.push(actualVoltage);
    current.push(actualCurrent);
    power.push(actualPower);
    
    // Apply series connection logic - all panels FROM the faulty panel onwards show the same visual state and health
    if (actualFaultyIndex !== -1 && i >= actualFaultyIndex) {
      // Update visual state and health for all panels from faulty panel onwards
      panelStates[i] = seriesState;
      panelHealth[i] = seriesHealth; // All panels from faulty panel onwards have same health
      
      // Only the actual faulty panel is marked as actually faulty
      if (i === actualFaultyIndex) {
        actualFaultStatus[i] = true;
      } else {
        actualFaultStatus[i] = false; // Series-affected panels are not actually faulty
      }
    } else {
      // Reset actualFaultStatus for panels before the faulty panel
      actualFaultStatus[i] = false;
    }
  }
  
  return { 
    voltage, 
    current, 
    power, 
    health: panelHealth, 
    states: panelStates,
    actualFaultStatus, // New field to track actual faulty panels
    seriesState,
    seriesHealth: Math.round(seriesHealth * 10) / 10,
    actualFaultyIndex: actualFaultyIndex !== -1 && weakestHealth < 50 ? actualFaultyIndex : null
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
    
    const techniciansData = await fs.readFile(techniciansPath, 'utf8');
    // Add better error handling for JSON parsing
    const technicians = JSON.parse(techniciansData.trim());
    
    res.json(technicians);
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
    const entriesFolder = path.join(companyPath, 'entries');
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
    const newEntry = {
      id: `entry-${Date.now()}`,
      companyName,
      name,
      role,
      email,
      phoneNumber,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'super_admin'
    };
    
    // Add entry to array
    entries.push(newEntry);
    
    // Create credential entry with password
    const newCredential = {
      id: `user-${Date.now()}`,
      email,
      password,
      role,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'super_admin'
    };
    
    // Write to appropriate file based on role
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
      
      // Also add to technicians.json for backward compatibility
      let technicians = [];
      try {
        const techniciansData = await fs.readFile(techniciansPath, 'utf8');
        technicians = JSON.parse(techniciansData.trim());
      } catch (error) {
        technicians = [];
      }
      technicians.push(newCredential);
      await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
      
    } else if (role === 'management') {
      // For management, update management.json
      let managementData = [];
      try {
        const managementFileData = await fs.readFile(managementPath, 'utf8');
        managementData = JSON.parse(managementFileData.trim());
      } catch (error) {
        managementData = [];
      }
      
      managementData.push(newCredential);
      await fs.writeFile(managementPath, JSON.stringify(managementData, null, 2));
      
      // Also add to technicians.json for backward compatibility
      let technicians = [];
      try {
        const techniciansData = await fs.readFile(techniciansPath, 'utf8');
        technicians = JSON.parse(techniciansData.trim());
      } catch (error) {
        technicians = [];
      }
      technicians.push(newCredential);
      await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
      
    } else if (role === 'technician') {
      // For technician, update technicians.json
      let technicians = [];
      try {
        const techniciansData = await fs.readFile(techniciansPath, 'utf8');
        technicians = JSON.parse(techniciansData.trim());
      } catch (error) {
        technicians = [];
      }
      
      technicians.push(newCredential);
      await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
    }
    
    // Write entries.json
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    
    res.json({ success: true, entry: newEntry });
  } catch (error) {
    console.error('Error adding staff entry:', error);
    res.status(500).json({ error: 'Failed to add staff entry' });
  }
});

// Get staff entries for a company
app.get('/api/companies/:companyId/entries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      const entries = JSON.parse(entriesData.trim());
      res.json(entries);
    } catch (error) {
      // If entries.json doesn't exist, return empty array
      res.json([]);
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
    
    const companyPath = await findCompanyFolder(companyId);
    
    if (!companyPath) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const entriesPath = path.join(companyPath, 'entries', 'entries.json');
    
    // Read existing entries
    let entries = [];
    try {
      const entriesData = await fs.readFile(entriesPath, 'utf8');
      entries = JSON.parse(entriesData.trim());
    } catch (error) {
      return res.status(404).json({ error: 'No entries found' });
    }
    
    // Find and update the entry
    const entryIndex = entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Update the entry
    entries[entryIndex] = {
      ...entries[entryIndex],
      companyName,
      name,
      role,
      email,
      phoneNumber,
    };
    
    // Write back to file
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    
    res.json({ success: true, entry: entries[entryIndex] });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
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
    
    // Find and remove the entry
    const entryIndex = entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const deletedEntry = entries[entryIndex];
    entries.splice(entryIndex, 1);
    
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
    
    // Write entries back to file
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    
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
    
    // Create new technician
    const newTechnician = {
      id: `technician-${Date.now()}`,
      email,
      password,
      role,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'super_admin'
    };
    
    // Add technician to array
    technicians.push(newTechnician);
    
    // Write back to file
    await fs.writeFile(techniciansPath, JSON.stringify(technicians, null, 2));
    
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
      return res.status(404).json({ error: 'Table not found' });
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
    res.status(500).json({ error: 'Failed to delete panel' });
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
        
        if (admin.email === email && admin.password === password) {
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
        
        const technician = technicians.find(t => t.email === email && t.password === password);
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
    
    // If role is 'management', check entries for management role
    if (role === 'management') {
      const entriesPath = path.join(companyPath, 'entries', 'entries.json');
      try {
        const entriesData = await fs.readFile(entriesPath, 'utf8');
        const entries = JSON.parse(entriesData.trim());
        
        const managementEntry = entries.find(e => e.email === email && e.password === password && e.role === 'management');
        if (managementEntry) {
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
              id: managementEntry.id,
              email: managementEntry.email,
              role: 'management',
              name: managementEntry.name,
              companyName: sanitizedCompanyName,
              companyId: companyId
            }
          });
        }
      } catch (error) {
        console.error('Error reading entries file:', error);
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
      
      if (admin.email === email && admin.password === password) {
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
      
      const technician = technicians.find(t => t.email === email && t.password === password);
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

// Auto-refresh panel data every 10 seconds for real-time simulation
const autoRefreshPanelData = async () => {
  try {
    console.log('🔄 Auto-refreshing panel data for all companies...');
    
    const companies = await fs.readdir(COMPANIES_DIR);
    
    for (const companyId of companies) {
      const companyPath = path.join(COMPANIES_DIR, companyId);
      const stat = await fs.stat(companyPath);
      
      if (stat.isDirectory()) {
        const plantDetailsPath = path.join(companyPath, 'plant_details.json');
        
        try {
          const plantDetailsData = await fs.readFile(plantDetailsPath, 'utf8');
          const plantDetails = JSON.parse(plantDetailsData);
          
          // Update panel data for all tables with PROPER repair simulation
          let hasUpdates = false;
          plantDetails.tables.forEach(table => {
            if (table.panelsTop > 0) {
              const topPanelData = generatePanelData(
                table.panelsTop, 
                plantDetails.voltagePerPanel, 
                plantDetails.currentPerPanel,
                table.topPanels // Pass existing data for repair simulation
              );
              table.topPanels = topPanelData;
              hasUpdates = true;
            }
            
            if (table.panelsBottom > 0) {
              const bottomPanelData = generatePanelData(
                table.panelsBottom, 
                plantDetails.voltagePerPanel, 
                plantDetails.currentPerPanel,
                table.bottomPanels // Pass existing data for repair simulation
              );
              table.bottomPanels = bottomPanelData;
              hasUpdates = true;
            }
          });
          
          if (hasUpdates) {
            plantDetails.lastUpdated = new Date().toISOString();
            
            // Save updated data
            await fs.writeFile(plantDetailsPath, JSON.stringify(plantDetails, null, 2));
            console.log(`✅ Updated panel data for company: ${plantDetails.companyName}`);
          }
        } catch (error) {
          console.error(`Error updating company ${companyId}:`, error);
        }
      }
    }
    
    console.log('🔄 Auto-refresh completed');
  } catch (error) {
    console.error('Error in auto-refresh:', error);
  }
};

// Start auto-refresh timer (every 10 seconds)
setInterval(autoRefreshPanelData, 10000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`File system server running on port ${PORT}`);
  console.log(`Companies directory: ${COMPANIES_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ PROPER series connection simulation active!`);
  console.log(`🔄 Auto-refresh panel data every 10 seconds enabled!`);
});
