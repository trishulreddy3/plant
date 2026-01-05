const mongoose = require('mongoose');

const nodeFaultStatusSchema = new mongoose.Schema({
    companyId: { type: String, required: true },
    node: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String }, // healthy, warning, critical
    // Dynamic fields P1, P2... will be stored here because strict is false
}, {
    collection: 'node_fault_statuses',
    strict: false,
    timestamps: true
});

module.exports = mongoose.model('NodeFaultStatus', nodeFaultStatusSchema);
