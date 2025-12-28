const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const loginCredentialsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    employeeName: { type: String },
    phoneNumber: { type: String },
    companyName: { type: String },
    companyId: { type: String }, // link to company
    role: { type: String, enum: ['super_admin', 'plant_admin', 'management', 'technician', 'admin'], default: 'technician' },
    joinedOn: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'login_credentials' // explicit name
});

// Password matching
loginCredentialsSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const LoginCredentials = mongoose.model('LoginCredentials', loginCredentialsSchema);
module.exports = LoginCredentials;
