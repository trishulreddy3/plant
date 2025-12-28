
const fs = require('fs');
const path = require('path');

// Root of the project
const ROOT_DIR = path.join(__dirname, '../../');
const COMPANIES_DIR = path.join(ROOT_DIR, 'companies');

// Defaults
const DEFAULT_TEMP = 30;
const DEFAULT_LIGHT = 950;
const DEFAULT_CURRENT = 9.5;

async function migrateLocalFiles() {
    try {
        if (!fs.existsSync(COMPANIES_DIR)) {
            console.log('Companies directory not found.');
            return;
        }

        const companyFolders = fs.readdirSync(COMPANIES_DIR);

        for (const folder of companyFolders) {
            const plantPath = path.join(COMPANIES_DIR, folder, 'plant_details.json');

            if (fs.existsSync(plantPath)) {
                console.log(`Processing ${plantPath}...`);

                const rawData = fs.readFileSync(plantPath, 'utf8');
                const plantDetails = JSON.parse(rawData);

                if (plantDetails.tables && Array.isArray(plantDetails.tables)) {
                    let updated = false;

                    const newTables = plantDetails.tables.map(table => {
                        // Check if already migrated
                        if (table.panelVoltages && !table.topPanels) {
                            return table;
                        }

                        console.log(` - Migrating table ${table.serialNumber || table.id}...`);
                        updated = true;

                        // Extract Voltages
                        let vTop = [];
                        let vBottom = [];

                        if (table.topPanels && Array.isArray(table.topPanels.voltage)) {
                            vTop = table.topPanels.voltage;
                        }
                        if (table.bottomPanels && Array.isArray(table.bottomPanels.voltage)) {
                            vBottom = table.bottomPanels.voltage;
                        }

                        // Fallbacks
                        if (vTop.length === 0 && table.panelsTop > 0) vTop = Array(table.panelsTop).fill(38.5);
                        if (vBottom.length === 0 && table.panelsBottom > 0) vBottom = Array(table.panelsBottom).fill(38.5);

                        const allVoltages = [...vTop, ...vBottom];

                        return {
                            node: table.serialNumber || `TBL-${table.id}`,
                            time: new Date().toISOString(),
                            temperature: parseFloat((DEFAULT_TEMP + (Math.random() * 5)).toFixed(1)),
                            lightIntensity: Math.floor(DEFAULT_LIGHT + (Math.random() * 100)),
                            current: table.current || DEFAULT_CURRENT,
                            panelVoltages: allVoltages,

                            id: table.id,
                            serialNumber: table.serialNumber,
                            panelsCount: allVoltages.length
                        };
                    });

                    if (updated) {
                        plantDetails.tables = newTables;
                        plantDetails.lastUpdated = new Date().toISOString();
                        fs.writeFileSync(plantPath, JSON.stringify(plantDetails, null, 2));
                        console.log(' - Updated and saved json file.');
                    } else {
                        console.log(' - Already in new format.');
                    }
                }
            }
        }
        console.log('Local Migration Complete.');
    } catch (err) {
        console.error('Error:', err);
    }
}

migrateLocalFiles();
