const jwt = require('jsonwebtoken');
const { User, SuperAdmin } = require('../models_sql');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log('[Auth] Token found in headers');

            // Verify token
            const secret = process.env.JWT_SECRET || 'secret_key_change_me';
            const decoded = jwt.verify(token, secret);
            console.log('[Auth] Token verified for ID:', decoded.id);

            // 1. Try finding in User table
            let user = await User.findByPk(String(decoded.id), {
                attributes: { exclude: ['password'] }
            });

            // 2. If not found, try finding in SuperAdmin table
            if (!user) {
                user = await SuperAdmin.findByPk(decoded.id);
            }

            if (!user) {
                console.warn('[Auth] No user found in database for ID:', decoded.id);
                return res.status(401).json({ error: 'something went wrong try to login again' });
            }

            // check if user is logged in
            if (user.isLoggedIn === false && user.role !== 'super_admin') {
                console.warn('[Auth] Access denied: user.isLoggedIn is false');
                return res.status(401).json({ error: 'something went wrong try to login again' });
            }

            // check if company still exists (for non-super-admins)
            if (user.companyId && user.role !== 'super_admin') {
                const { Company } = require('../models_sql');
                const companyExists = await Company.findByPk(user.companyId);
                if (!companyExists) {
                    console.warn('[Auth] Access denied: Company not found');
                    user.isLoggedIn = false;
                    await user.save().catch(() => { });
                    return res.status(401).json({ error: 'something went wrong try to login again' });
                }
            }

            req.user = user;
            console.log('[Auth] Authorization successful');
            return next();
        } catch (error) {
            console.error('[AuthMiddleware] Verification Error');
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    } else {
        console.warn('[Auth] No Bearer token found in Authorization header. Headers:', JSON.stringify(req.headers));
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

const checkCompanyAccess = (req, res, next) => {
    // Some routes use companyId, some use id
    const companyId = req.params.companyId || req.params.id;

    // Super Admin can access everything
    if (req.user.role === 'super_admin') return next();

    // Check if the companyId in path matches the user's companyId
    if (String(req.user.companyId) !== String(companyId)) {
        return res.status(403).json({
            error: 'Access Denied: You cannot access data from another company'
        });
    }
    next();
};

module.exports = { protect, authorize, checkCompanyAccess };
