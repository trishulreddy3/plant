/**
 * solarService.js
 * Logic moved to scripts/DB_scripts/panel_logic.js for tracking and DB portability.
 */
const panelLogic = require('../scripts/DB_scripts/panel_logic');

module.exports = {
    normalizePlantDetails: panelLogic.normalizePlantDetails,
    generatePanelData: panelLogic.generatePanelData,
    queryFaults: panelLogic.queryFaults
};
