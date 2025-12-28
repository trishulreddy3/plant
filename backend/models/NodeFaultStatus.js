const mongoose = require('mongoose');

const nodeFaultStatusSchema = new mongoose.Schema({
    companyId: { type: String, required: true },
    time: { type: Date, default: Date.now },
    nodeName: { type: String, required: true }, // e.g., TBL-001
    // Flattened p1, p2, p3... fields will be added dynamically
}, {
    timestamps: true,
    collection: 'node_fault_status',
    strict: false // Allow dynamic p1, p2... fields
});

// Index for faster queries
nodeFaultStatusSchema.index({ companyId: 1, time: -1 });

module.exports = mongoose.model('NodeFaultStatus', nodeFaultStatusSchema);
