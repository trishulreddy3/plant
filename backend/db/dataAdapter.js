/**
 * dataAdapter.js
 * MongoDB Implementation
 */

const Company = require('../models/Plant');

class DataAdapter {
    /**
     * Finds if a company exists.
     * Returns true/false or the company object (mocking folder path behavior).
     */
    async findCompanyFolder(companyId) {
        try {
            // Check if company exists in Company collection
            const company = await Company.findOne({
                $or: [
                    { companyId: companyId },
                    { companyName: new RegExp(`^${companyId}$`, 'i') }
                ]
            });
            return company ? company.companyId : null;
        } catch (e) {
            console.error('findCompanyFolder failed:', e);
            return null;
        }
    }

    // Deprecated for direct usage, but kept for compatibility if needed.
    // In Mongo migration, we stop using these.
    async readJSON(filePath) { return {}; }
    async writeJSON(filePath, data) { return true; }

    // --- Plant Details Methods ---

    async getPlantDetails(companyId) {
        try {
            const company = await Company.findOne({ companyId });
            if (!company) return null;
            // Return only the plantDetails part, but maybe inject companyId/Name if callers need it
            // The callers expect the "plant object" with tables etc.
            // Our schema puts this in 'plantDetails'.
            const details = company.plantDetails ? company.plantDetails.toObject() : {};
            return {
                ...details,
                companyId: company.companyId,
                companyName: company.companyName
            };
        } catch (e) {
            console.error('getPlantDetails failed:', e);
            return null;
        }
    }

    async savePlantDetails(companyId, data) {
        try {
            // Data is the 'plantDetails' object (plus maybe companyId/name at root, which we ignore/extract)
            // We need to update 'plantDetails' field in the doc.

            const { _id, companyId: cId, companyName, createdAt, updatedAt, ...detailsData } = data;

            // We use dot notation to update sub-fields or just set the whole object.
            // Setting the whole object is safer to ensure it matches 'data'.

            await Company.findOneAndUpdate(
                { companyId },
                { $set: { plantDetails: detailsData } },
                { upsert: true, new: true }
            );
            return true;
        } catch (e) {
            console.error('savePlantDetails failed:', e);
            return false;
        }
    }
}

module.exports = new DataAdapter();
