const LoginCredentials = require('../../models/LoginCredentials');
const LoginDetails = require('../../models/LoginDetails');
const Company = require('../../models/Plant');
const SuperAdmin = require('../../models/SuperAdmin');
const bcrypt = require('bcryptjs');

/**
 * Helper to log session status (Syncs to both standalone and embedded collections)
 */
async function logLoginStatus(userId, companyId, sessionId, status, detailsDoc = null) {
    try {
        const details = detailsDoc || await LoginDetails.findOne({ userId, companyId });
        if (!details) return;

        details.accountStatus = status === 'logged_in' ? 'active' : 'offline';

        if (status === 'logged_out' && sessionId) {
            const sId = Number(sessionId);
            const session = details.sessions.find(s => s.sessionId === sId);
            if (session) {
                session.logoutTime = new Date();
            }
        }

        await details.save();

        // Sync back to Company model for visibility
        const company = await Company.findOne({ companyId });
        if (company) {
            const arrays = ['entries', 'management', 'technicians'];
            arrays.forEach(arrName => {
                if (!company[arrName]) return;
                const subDoc = company[arrName].find(e =>
                    (e.loginCredentials && e.loginCredentials.userId === userId) ||
                    (e.userId === userId)
                );

                if (subDoc && subDoc.loginDetails) {
                    subDoc.loginDetails.accountStatus = details.accountStatus;
                    subDoc.loginDetails.sessions = details.sessions;
                    company.markModified(arrName);
                }
            });

            if (company.admin && (
                (company.admin.loginCredentials && company.admin.loginCredentials.userId === userId) ||
                (company.admin.userId === userId)
            )) {
                if (company.admin.loginDetails) {
                    company.admin.loginDetails.accountStatus = details.accountStatus;
                    company.admin.loginDetails.sessions = details.sessions;
                }
            }
            await company.save();
        }
    } catch (err) {
        console.error(`[AUTH_LOG] Error updating ${status}:`, err.message);
    }
}

/**
 * Main Login Logic
 */
async function login(email, password, companyName) {
    const emailLower = email.trim().toLowerCase();
    const companyNameLower = companyName.trim().toLowerCase();

    // 1. Check Super Admin
    if (companyNameLower === 'microsyslogic') {
        const sa = await SuperAdmin.findOne({ email: new RegExp(`^${emailLower}$`, 'i') });
        if (sa) {
            const isMatch = await sa.matchPassword(password.trim());
            if (!isMatch) throw new Error('Invalid credentials');
            return {
                success: true,
                user: {
                    id: sa.userId,
                    email: sa.email,
                    role: sa.role,
                    name: sa.name,
                    companyName: 'microsyslogic',
                    companyId: 'microsyslogic'
                }
            };
        }
    }

    // 2. Fetch User Credentials
    console.log(`[AUTH] Attempting login for email: ${emailLower}, company: ${companyNameLower}`);
    const user = await LoginCredentials.findOne({ email: new RegExp(`^${emailLower}$`, 'i') });

    if (!user) {
        console.log(`[AUTH] User not found in LoginCredentials: ${emailLower}`);
        throw new Error('User not found');
    }

    console.log(`[AUTH] User found: ${user.email}, role: ${user.role}, stored company: ${user.companyName}`);

    // Verify Company Isolation
    const userCompanyMatch = user.companyName.toLowerCase() === companyNameLower || user.companyId.toLowerCase() === companyNameLower;
    if (!userCompanyMatch) {
        console.log(`[AUTH] Company mismatch: ${user.companyName} vs ${companyNameLower}`);
        throw new Error(`User belongs to ${user.companyName}`);
    }

    // 3. Security Check (Attempts & Status)
    let details = await LoginDetails.findOne({ userId: user.userId, companyId: user.companyId });
    if (!details) {
        console.log(`[AUTH] Creating new LoginDetails for ${user.userId}`);
        details = new LoginDetails({
            userId: user.userId,
            companyId: user.companyId,
            userName: user.userName,
            sessions: [],
            accountStatus: 'active',
            attempts: 0
        });
        await details.save();
    }


    if (details.accountStatus === 'blocked') throw new Error('Account Blocked: Too many failed attempts, For more details contact admin');

    // 4. Verify Password
    const isMatch = await user.matchPassword(password.trim());
    console.log(`[AUTH] Password match for ${user.email}: ${isMatch}`);

    if (!isMatch) {

        details.attempts += 1;
        if (details.attempts >= 3) details.accountStatus = 'blocked';
        await details.save();
        throw new Error(details.accountStatus === 'blocked' ? 'Account Blocked' : `Incorrect password. ${3 - details.attempts} attempts left.`);
    }

    // 5. Success
    details.attempts = 0;
    const nextSessionId = (details.sessions.length || 0) + 1;
    details.sessions.push({ sessionId: nextSessionId, loginTime: new Date() });

    // Note: We'll update accountStatus to 'active' inside logLoginStatus for consistency
    await logLoginStatus(user.userId, user.companyId, nextSessionId, 'logged_in', details);

    return {
        success: true,
        user: {
            id: user.userId,
            email: user.email,
            role: user.role,
            name: user.userName,
            companyName: user.companyName,
            companyId: user.companyId,
            joinedOn: user.joinedOn,
            sessionId: nextSessionId
        }
    };
}

/**
 * Main Logout Logic
 */
async function logout(userId, sessionId) {
    const details = await LoginDetails.findOne({ userId });
    if (!details) throw new Error('User details not found');

    await logLoginStatus(userId, details.companyId, sessionId, 'logged_out', details);
    return { success: true };
}

module.exports = {
    login,
    logout,
    logLoginStatus
};
