
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    companyId: { type: String, required: true },
    trackId: String,
    fault: String,
    reason: String,
    category: String, // 'BAD' | 'MODERATE'
    powerLoss: Number,
    predictedLoss: Number,
    resolvedAt: Date,
    resolvedBy: String
}, { timestamps: true });

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
