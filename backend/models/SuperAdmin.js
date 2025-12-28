const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
    userId: { type: String, unique: true, default: 'superadmin' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    role: { type: String, default: 'admin' },
    name: { type: String, default: 'Super Admin' },
    companyId: { type: String, default: 'microsyslogic' }, // Self-reference
    companyName: { type: String, default: 'microsyslogic' },
    failedLoginAttempts: { type: Number, default: 0 },
    accountStatus: { type: String, default: 'active' }
}, { timestamps: true });

const bcrypt = require('bcryptjs');

// Password Hashing
superAdminSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

superAdminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
