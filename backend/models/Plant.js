const mongoose = require('mongoose');

// --- Schema Definitions mocking the user's File Structure ---

const panelSchema = new mongoose.Schema({
    voltage: [Number],
    current: [Number],
    power: [Number],
    health: [Number],
    states: [String],
    actualFaultStatus: [Boolean],
    faultTimestamps: [Date],
    seriesState: { type: String, default: 'good' },
    seriesHealth: { type: Number, default: 100 },
    actualFaultyIndex: { type: Number, default: -1 },
    individualCurrentLimit: [Number]
}, { _id: false });

const tableSchema = new mongoose.Schema({
    node: { type: String, required: true }, // e.g., TBL-001
    time: { type: Date, default: Date.now },
    temperature: { type: Number, default: 25 },
    lightIntensity: { type: Number, default: 1000 },
    current: { type: Number, default: 0 }, // Least current in series
    panelVoltages: [Number], // p1_v, p2_v, ...

    // Legacy mapping (optional, for frontend compat if needed initially)
    id: String,
    serialNumber: String,
    panelsCount: { type: Number, default: 0 }
}, { _id: false });

// Sub-documents for Users (Restructured into "Two Tables")
const embeddedUserSchema = new mongoose.Schema({
    loginCredentials: {
        userId: { type: String, default: () => `user-${Date.now()}` },
        userName: String,
        email: { type: String, required: true },
        password: { type: String },
        employeeName: String,
        phoneNumber: String,
        companyName: String,
        role: String,
        joinedOn: { type: Date, default: Date.now }
    },
    loginDetails: {
        userId: String,
        userName: String,
        sessions: [{
            sessionId: Number,
            loginTime: { type: Date, default: Date.now },
            logoutTime: Date
        }],
        accountStatus: { type: String, default: 'active' },
        attempts: { type: Number, default: 0 }
    }
}); // Mongoose will now add a unique _id for each user record automatically

// Embedded Schema for Node/Table Fault Status
const faultStatusSchema = new mongoose.Schema({
    node: String,
    timestamp: { type: Date, default: Date.now }
    // status, faults, description removed.
    // Only node, timestamp, and P1..PN will be stored.
}, { _id: false, strict: false });

const companySchema = new mongoose.Schema({
    companyId: { type: String, required: true, unique: true },
    companyName: String,

    // --- EMBEDDED TABLES (Data Isolation) ---
    // These "tables" are now physically inside the Company document.
    // Deleting the company automatically deletes all this data.

    // 1. Login Credentials Table (Staff Data)
    login_credentials: [new mongoose.Schema({
        loginCredentials: {
            userId: { type: String, default: () => `user-${Date.now()}` },
            userName: String,
            email: { type: String, required: true },
            password: { type: String },
            employeeName: String,
            phoneNumber: String,
            companyName: String,
            role: String,
            joinedOn: { type: Date, default: Date.now }
        }
    }, { _id: true })],

    // 2. Login Details Table (Session Data)
    login_details: [new mongoose.Schema({
        loginDetails: {
            userId: String,
            userName: String,
            sessions: [{
                sessionId: Number,
                loginTime: { type: Date, default: Date.now },
                logoutTime: Date
            }],
            accountStatus: { type: String, default: 'active' },
            attempts: { type: Number, default: 0 },
            // Optional link back to company if needed within the object, but redundant given embedding
            companyId: String
        }
    }, { _id: true })],

    // 3. Node Fault Status Table
    node_fault_status: [faultStatusSchema],

    // 4. Live Data Table (Solar Panels)
    // (mapped from plantDetails.live_data for visibility or usage)
    live_data: [{
        id: String,
        node: String,
        serialNumber: String,
        panelCount: Number,
        panelVoltages: [Number],
        current: Number,
        temparature: Number,
        lightintensity: Number,
        time: { type: Date, default: Date.now }
    }],

    // Folder Structure Emulation (Legacy/Frontend Compatibility)
    admin: { type: embeddedUserSchema, default: null },
    management: [embeddedUserSchema],
    technicians: [embeddedUserSchema],
    entries: [embeddedUserSchema],

    // Plant Configuration
    plantDetails: {
        plantPowerKW: Number,
        voltagePerPanel: { type: Number, default: 20 },
        currentPerPanel: { type: Number, default: 9.9 },
        lastUpdated: { type: Date, default: Date.now },
        // Linked to the root live_data array
        live_data: []
    }

}, { timestamps: true });

// Pre-save hook to sync plantDetails.live_data with root live_data if needed
// Pre-save hook commented out to prevent migration issues
// companySchema.pre('save', function (next) {
//    if (this.isModified('live_data')) {
//        this.plantDetails.live_data = this.live_data;
//    } else if (this.isModified('plantDetails.live_data')) {
//        this.live_data = this.plantDetails.live_data;
//    }
//    next();
// });

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
