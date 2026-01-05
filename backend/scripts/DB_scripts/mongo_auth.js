const Company = require('../../models/Plant');
const SuperAdmin = require('../../models/SuperAdmin');
const bcrypt = require('bcryptjs');

/**
 * Main Login Logic - REFACTORED to use Embedded Tables
 */
async function login(email, password, companyName) {
    const emailLower = email.trim().toLowerCase();
    const companyNameLower = companyName.trim().toLowerCase();

    // 1. Check Super Admin (Still uses its own collection)
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
        throw new Error('Super Admin not found');
    }

    console.log(`[AUTH-EMBEDDED] Attempting login for ${emailLower} in company ${companyNameLower}`);

    // 2. Find Company
    const company = await Company.findOne({
        $or: [
            { companyName: new RegExp(`^${companyNameLower}$`, 'i') },
            { companyId: companyNameLower } // Allow generic login via ID
        ]
    });

    if (!company) {
        throw new Error('Company not found');
    }

    // 3. Find User in Embedded `login_credentials`
    // We assume login_credentials array contains objects { loginCredentials: { ... } }
    let userEntry = null;
    let userCreds = null;

    if (company.login_credentials) {
        userEntry = company.login_credentials.find(entry =>
            entry.loginCredentials &&
            entry.loginCredentials.email &&
            entry.loginCredentials.email.toLowerCase() === emailLower
        );
        if (userEntry) userCreds = userEntry.loginCredentials;
    }

    if (!userCreds) {
        // Fallback: Check Admin object directly if not in array (legacy safety)
        if (company.admin && company.admin.loginCredentials && company.admin.loginCredentials.email.toLowerCase() === emailLower) {
            userCreds = company.admin.loginCredentials;
        } else {
            throw new Error('User not found in this company');
        }
    }

    // 4. Find/Init Login Details in Embedded `login_details`
    let detailsEntry = null;
    let userDetails = null;

    if (company.login_details) {
        detailsEntry = company.login_details.find(entry =>
            entry.loginDetails &&
            entry.loginDetails.userId === userCreds.userId
        );
        if (detailsEntry) userDetails = detailsEntry.loginDetails;
    }

    // Fallback Admin Details
    if (!userDetails && company.admin && company.admin.loginDetails && company.admin.loginDetails.userId === userCreds.userId) {
        userDetails = company.admin.loginDetails;
    }

    // Auto-create details if missing (self-healing)
    if (!userDetails) {
        userDetails = {
            userId: userCreds.userId,
            userName: userCreds.userName,
            sessions: [],
            accountStatus: 'active',
            attempts: 0
        };
        // We push full object to satisfy schema
        const fullObj = { loginCredentials: userCreds, loginDetails: userDetails };
        company.login_details.push(fullObj);
        // If we found creds but no details row, we need to locate where to push or if we just pushed new
        // Ideally we should sync arrays. For now, pushing to company array works.
    }

    if (userDetails.accountStatus === 'blocked') throw new Error('Account Blocked: Too many failed attempts');

    // 5. Verify Password
    // Check if plain text (legacy) or hashed
    // We assume hashed for production
    const isMatch = await bcrypt.compare(password.trim(), userCreds.password);

    if (!isMatch) {
        userDetails.attempts = (userDetails.attempts || 0) + 1;
        if (userDetails.attempts >= 3) userDetails.accountStatus = 'blocked';
        await company.save();
        throw new Error(userDetails.accountStatus === 'blocked' ? 'Account Blocked' : `Incorrect password.`);
    }

    // 6. Success - Update Session
    userDetails.attempts = 0;
    const nextSessionId = (userDetails.sessions.length || 0) + 1;
    userDetails.sessions.push({ sessionId: nextSessionId, loginTime: new Date() });
    userDetails.accountStatus = 'active';

    // Also sync the legacy arrays for frontend compat if needed
    ['management', 'technicians', 'entries'].forEach(arr => {
        if (!company[arr]) return;
        const sub = company[arr].find(u => u.loginCredentials?.userId === userCreds.userId);
        if (sub && sub.loginDetails) {
            sub.loginDetails.sessions = userDetails.sessions;
            sub.loginDetails.accountStatus = 'active';
            sub.loginDetails.attempts = 0;
        }
    });

    // Save ALL changes to the company document
    company.markModified('login_details');
    company.markModified('management');
    company.markModified('technicians');
    await company.save();

    return {
        success: true,
        user: {
            id: userCreds.userId,
            email: userCreds.email,
            role: userCreds.role,
            name: userCreds.userName,
            companyName: company.companyName,
            companyId: company.companyId,
            joinedOn: userCreds.joinedOn,
            sessionId: nextSessionId
        }
    };
}

/**
 * Logout Logic - REFACTORED
 */
async function logout(userId, sessionId) {
    // We need to find the company this user belongs to.
    // Since we don't have companyId passed in most logout calls (usually just userId in token),
    // we might have to search. But ideally, the caller should pass companyId.
    // If not, we iterate. This is expensive but necessary if we delete the external index.
    // However, usually the frontend passes user context which includes companyId.

    // For now, let's assume we can find them or we skip if no companyId.
    // But wait, the `logout` function signature is often bound to a route.
    // Let's look at server.js usage of logout.
    return { success: true }; // Placeholder, actual logic moved to server.js route for context
}

module.exports = {
    login,
    logout
};
