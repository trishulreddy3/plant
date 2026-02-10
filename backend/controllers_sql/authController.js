const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Company, LoginLog, SuperAdmin } = require('../models_sql');
const { Op } = require('sequelize');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key_change_me', {
        expiresIn: '30d'
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password, companyName, role } = req.body;

        if (!email || !password || !companyName || !role) {
            return res.status(400).json({ error: 'Please provide email, password, company name, and role.' });
        }

        const normalizedCompanyInput = companyName.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRoleInput = role.trim().toLowerCase();

        console.log(`[Login] Attempt for Company=${normalizedCompanyInput}`);

        // 0. HARDCODED BYPASS FOR THINGSBOARD TESTING
        if (normalizedEmail === 'tbadmin@pm.com' && password === 'thingsboard') {
            console.log('[Login] THINGSBOARD TEST BYPASS SUCCESS');
            return res.json({
                success: true,
                token: generateToken('tb-test-user'),
                user: {
                    id: 'tb-test-user',
                    name: 'TB Tester',
                    email: 'tbadmin@pm.com',
                    role: 'technician',
                    companyName: 'ThingsBoard Test',
                    companyId: 'tb-test-01'
                }
            });
        }

        // 1. Verify Company exists in registry
        const companyRecord = await Company.findOne({
            where: {
                companyName: { [Op.iLike]: normalizedCompanyInput }
            }
        });

        if (!companyRecord) {
            // BACKUP: check if this is the legacy SuperAdmin bypassing registry
            if (normalizedCompanyInput === 'microsyslogic') {
                const superAdmin = await SuperAdmin.findOne({ where: { email: { [Op.iLike]: normalizedEmail } } });
                if (superAdmin) {
                    const isPassMatch = await bcrypt.compare(password, superAdmin.password);
                    if (isPassMatch) {
                        console.log('[Login] Legacy SuperAdmin Login Success');
                        return res.json({
                            success: true,
                            token: generateToken(superAdmin.id),
                            user: {
                                id: superAdmin.id,
                                name: 'Super Admin',
                                email: superAdmin.email,
                                role: 'super_admin',
                                companyName: superAdmin.companyName,
                                companyId: null
                            }
                        });
                    }
                }
            }
            console.log(`[Login] Company Check Failed: ${normalizedCompanyInput} not found in registry.`);
            return res.status(401).json({ error: 'Invalid Company Name.' });
        }

        console.log(`[Login] Company Verified: ${companyRecord.companyName} (ID: ${companyRecord.companyId})`);

        // 2. Access Schema-Specific Tables
        try {
            const { initializeTenantSchema } = require('../utils/dynamicModel');
            const models = await initializeTenantSchema(companyRecord.companyName);
            const LoginCredentials = models.LoginCredentials;
            const LoginDetails = models.LoginDetails;

            const user = await LoginCredentials.findOne({
                where: { email: { [Op.iLike]: normalizedEmail } }
            });

            if (!user) {
                console.log(`[Login] User not found in schema '${companyRecord.companyName}'`);
                return res.status(401).json({ error: 'Invalid credentials. Please check Company, Email and Password.' });
            }

            // Check if user is blocked
            const details = await LoginDetails.findOne({
                where: { userId: user.userName },
                order: [['createdAt', 'DESC']]
            });

            if (details && details.presentStatus === 'blocked') {
                const sa = await SuperAdmin.findOne();
                return res.status(403).json({
                    error: 'Your id is banned contact admin for more details !',
                    adminEmail: companyRecord.adminEmail,
                    superAdminEmail: sa ? sa.email : 'superadmin@gmail.com'
                });
            }

            const isPassMatch = await bcrypt.compare(password, user.password);

            const dbRole = (user.role || '').toLowerCase();
            let isRoleMatch = (dbRole === normalizedRoleInput);
            if (normalizedRoleInput === 'admin' && (dbRole === 'plant_admin' || dbRole === 'super_admin' || dbRole === 'admin')) {
                isRoleMatch = true;
            }

            if (isPassMatch && isRoleMatch) {
                // Success Flow
                const token = generateToken(user.userId);

                // Update Credentials Status
                user.status = 'active';
                await user.save();

                // Record Login Detail
                await LoginDetails.create({
                    companyName: companyRecord.companyName,
                    userId: user.userName, // Store Name as requested
                    attempts: 0, // Reset attempts on successful login
                    timeIn: new Date(),
                    presentStatus: 'active'
                });

                // Global Log (Audit)
                await LoginLog.create({
                    userId: user.userId,
                    loginTime: new Date(),
                    ip: req.ip
                });

                // --- NEW: Sync Global User isLoggedIn state ---
                const { User } = require('../models_sql');
                const globalUser = await User.findByPk(user.userId);
                if (globalUser) {
                    globalUser.isLoggedIn = true;
                    globalUser.lastActiveAt = new Date();
                    await globalUser.save();
                } else {
                    // This is a safety check: if globalUser doesn't exist, it means user only exists in tenant. 
                    // This shouldn't normally happen with the current createStaff logic.
                    console.warn(`[Login] Global User NOT found for ID: ${user.userId}. Active session check might fail.`);
                }

                return res.json({
                    success: true,
                    token,
                    user: {
                        id: user.userId,
                        name: user.userName || 'User',
                        email: user.email,
                        role: user.role,
                        companyId: companyRecord.companyId,
                        companyName: companyRecord.companyName
                    }
                });
            } else {
                // Find previous attempts count for this user
                const latestRecord = await LoginDetails.findOne({
                    where: { userId: user.userName },
                    order: [['createdAt', 'DESC']]
                });

                let currentAttempts = (latestRecord ? latestRecord.attempts : 0) + 1;
                let newStatus = currentAttempts >= 3 ? 'blocked' : 'offline';

                await LoginDetails.create({
                    companyName: companyRecord.companyName,
                    userId: user.userName, // Store Name
                    attempts: currentAttempts,
                    presentStatus: newStatus
                });

                // If blocked, also sync the "inactive" status to LoginCredentials
                if (newStatus === 'blocked') {
                    user.status = 'inactive';
                    await user.save();
                }

                if (newStatus === 'blocked') {
                    const sa = await SuperAdmin.findOne();
                    return res.status(403).json({
                        error: 'Your id is banned contact admin for more details !',
                        adminEmail: companyRecord.adminEmail,
                        superAdminEmail: sa ? sa.email : 'superadmin@gmail.com'
                    });
                }

                console.log(`[Login] Failed attempt ${currentAttempts}`);
                return res.status(401).json({ error: `Invalid credentials. Attempt ${currentAttempts}/3` });
            }
        } catch (err) {
            console.error(`[Login] Error accessing tenant data: ${err.message}`);
        }

        return res.status(401).json({ error: 'Invalid credentials. Please check Company, Email and Password.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.logout = async (req, res) => {
    try {
        const { userId, companyName } = req.body;
        if (!userId || !companyName) return res.status(400).json({ error: 'Missing userId or companyName' });

        const { initializeTenantSchema } = require('../utils/dynamicModel');
        const models = await initializeTenantSchema(companyName);
        const LoginCredentials = models.LoginCredentials;
        const LoginDetails = models.LoginDetails;

        // 1. Update Credentials Status
        const user = await LoginCredentials.findByPk(userId);
        if (user) {
            user.status = 'inactive';
            await user.save();
        }

        // 2. Record TimeOut in newest session
        const { userName } = req.body;
        const searchName = userName || (user ? user.userName : null);

        console.log(`[Logout] Identifying session for: Name=${searchName}, ID=${userId}`);

        let latestDetail = null;

        // Try searching by Name first (since we changed userId column to store Names)
        if (searchName) {
            latestDetail = await LoginDetails.findOne({
                where: { userId: searchName },
                order: [['createdAt', 'DESC']]
            });
        }

        // Fallback: search by Alphanumeric ID if Name didn't work (for older records)
        if (!latestDetail) {
            latestDetail = await LoginDetails.findOne({
                where: { userId: userId },
                order: [['createdAt', 'DESC']]
            });
        }

        if (latestDetail) {
            console.log(`[Logout] Updating timeOut for record ID: ${latestDetail.id}`);
            latestDetail.timeOut = new Date();
            latestDetail.presentStatus = latestDetail.presentStatus === 'blocked' ? 'blocked' : 'offline';
            await latestDetail.save();
        } else {
            console.warn(`[Logout] No session record found for: ${searchName || userId}`);
        }

        // --- NEW: Sync Global User isLoggedIn state ---
        const { User } = require('../models_sql');
        const globalUser = await User.findByPk(userId);
        if (globalUser) {
            globalUser.isLoggedIn = false;
            await globalUser.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        // This usually refers to global User model, but we might want to check tenant if needed.
        // For now, keep it simple or fallback.
        const { User } = require('../models_sql');
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Verify password for sensitive actions (e.g. deleting staff/company)
exports.verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ success: false, error: 'Password required' });

        const { User, SuperAdmin } = require('../models_sql');
        let user;

        // We fetch the latest user data from DB by email to compare password.
        // This avoids confusion between 'id' and 'userId' primary keys.
        if (req.user.role === 'super_admin') {
            user = await SuperAdmin.findOne({ where: { email: req.user.email } });
        }

        // If not found in SuperAdmin table or if regular user
        if (!user) {
            user = await User.findOne({ where: { email: req.user.email } });
        }

        if (!user) {
            console.error(`[VerifyPassword] User not found for Email: ${req.user.email}, Role: ${req.user.role}`);
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[VerifyPassword] Result: ${isMatch} for User: ${user.email}`);
        res.json({ success: isMatch });
    } catch (e) {
        console.error('[VerifyPassword] Error:', e);
        res.status(500).json({ error: 'Server error' });
    }
};
