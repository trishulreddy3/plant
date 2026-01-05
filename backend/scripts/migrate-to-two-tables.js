const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env.development' });
const connectDB = require('../db/db');
const Company = require('../models/Plant');
const LoginCredentials = require('../models/LoginCredentials');
const LoginDetails = require('../models/LoginDetails');

async function migrate() {
    try {
        await connectDB();
        console.log('Connected to MongoDB for migration...');

        // Use raw collection to get data because the schema has already changed
        const rawCompanies = await mongoose.connection.db.collection('companies').find({}).toArray();
        console.log(`Found ${rawCompanies.length} companies to migrate (Raw).`);

        for (const rawCompany of rawCompanies) {
            console.log(`Migrating company: ${rawCompany.companyName} (${rawCompany.companyId})`);

            const arraysToProcess = ['management', 'technicians', 'entries'];
            const companyDoc = await Company.findById(rawCompany._id);

            // Process Admin
            if (rawCompany.admin && !rawCompany.admin.loginCredentials) {
                const legacy = rawCompany.admin;
                console.log(`  Migrating Admin: ${legacy.email || 'no-email'}`);

                if (legacy.email) {
                    const userId = legacy.userId || `admin-${Date.now()}`;
                    const mapped = {
                        loginCredentials: {
                            userId: userId,
                            userName: legacy.name || legacy.userName || legacy.employeeName || 'Admin',
                            email: legacy.email,
                            password: legacy.password || '',
                            employeeName: legacy.employeeName || legacy.name || 'Admin',
                            phoneNumber: legacy.phoneNumber || '',
                            companyName: rawCompany.companyName,
                            role: legacy.role || 'admin',
                            joinedOn: legacy.createdAt || new Date()
                        },
                        loginDetails: {
                            userId: userId,
                            userName: legacy.name || legacy.userName || legacy.employeeName || 'Admin',
                            sessions: [],
                            accountStatus: legacy.accountStatus || 'active',
                            attempts: legacy.failedLoginAttempts || 0
                        }
                    };
                    companyDoc.admin = mapped;
                    await LoginCredentials.findOneAndUpdate({ userId }, { ...mapped.loginCredentials, companyId: rawCompany.companyId }, { upsert: true });
                    await LoginDetails.findOneAndUpdate({ userId }, { ...mapped.loginDetails, companyId: rawCompany.companyId }, { upsert: true });
                }
            }

            // Process Arrays
            for (const arrName of arraysToProcess) {
                const legacyArray = rawCompany[arrName] || [];
                const newArray = [];

                for (const legacy of legacyArray) {
                    if (legacy.loginCredentials) {
                        newArray.push(legacy);
                        continue;
                    }

                    if (legacy.email) {
                        console.log(`  Migrating ${arrName} member: ${legacy.email}`);
                        const userId = legacy.userId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        const mapped = {
                            loginCredentials: {
                                userId: userId,
                                userName: legacy.name || legacy.userName || legacy.employeeName || 'Staff',
                                email: legacy.email,
                                password: legacy.password || '',
                                employeeName: legacy.employeeName || legacy.name || 'Staff',
                                phoneNumber: legacy.phoneNumber || '',
                                companyName: rawCompany.companyName,
                                role: legacy.role || 'technician',
                                joinedOn: legacy.createdAt || new Date()
                            },
                            loginDetails: {
                                userId: userId,
                                userName: legacy.name || legacy.userName || legacy.employeeName || 'Staff',
                                sessions: [],
                                accountStatus: legacy.accountStatus || 'active',
                                attempts: legacy.failedLoginAttempts || 0
                            }
                        };
                        newArray.push(mapped);
                        await LoginCredentials.findOneAndUpdate({ userId }, { ...mapped.loginCredentials, companyId: rawCompany.companyId }, { upsert: true });
                        await LoginDetails.findOneAndUpdate({ userId }, { ...mapped.loginDetails, companyId: rawCompany.companyId }, { upsert: true });
                    }
                }
                companyDoc[arrName] = newArray;
                companyDoc.markModified(arrName);
            }

            await companyDoc.save();
            console.log(`Successfully migrated ${rawCompany.companyName}`);
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
