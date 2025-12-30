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

const companySchema = new mongoose.Schema({
    companyId: { type: String, required: true, unique: true },
    companyName: String,

    // "Files" as Embedded Documents matching the User's Folder Structure

    // 1. admin.json
    admin: { type: embeddedUserSchema, default: null },

    // 2. management.json
    management: [embeddedUserSchema],

    // 3. technicians.json
    technicians: [embeddedUserSchema],

    // 4. entries/ folder (Technician Profiles/Entries)
    entries: [embeddedUserSchema],

    // 5. plant_details.json (The actual plant data)
    plantDetails: {
        plantPowerKW: Number,
        voltagePerPanel: { type: Number, default: 20 },
        currentPerPanel: { type: Number, default: 9.9 },
        lastUpdated: { type: Date, default: Date.now }
    }

}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
