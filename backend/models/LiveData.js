const mongoose = require('mongoose');

const liveDataSchema = new mongoose.Schema({
    companyId: { type: String, required: true },
    node: { type: String, required: true },
    time: { type: Date, default: Date.now },
    temparature: { type: Number, default: 25 }, // Match user's typo
    lightintensity: { type: Number, default: 1000 }, // Match user's lowercase
    current: { type: Number, default: 0 },
    panelsTop: { type: Number, default: 0 },
    panelsBottom: { type: Number, default: 0 },
}, {
    timestamps: true,
    collection: 'live_data',
    strict: false // Allow dynamic p1_v, p2_v... fields
});

liveDataSchema.index({ companyId: 1, node: 1 });

module.exports = mongoose.model('LiveData', liveDataSchema);
