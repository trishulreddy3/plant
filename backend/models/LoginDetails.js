const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: Number, required: true },
    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date }
}, { _id: false });

const loginDetailsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    userName: { type: String },
    companyId: { type: String }, // link to company
    sessions: [sessionSchema],
    accountStatus: {
        type: String,
        enum: ['active', 'offline', 'blocked'],
        default: 'offline'
    },
    attempts: { type: Number, default: 0 }
}, {
    timestamps: true,
    collection: 'login_details' // explicit name
});

const LoginDetails = mongoose.model('LoginDetails', loginDetailsSchema);
module.exports = LoginDetails;
