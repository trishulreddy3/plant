const fs = require('fs').promises;
const path = require('path');
const { hashPassword } = require('./utils/passwordUtils');

/**
 * Password Migration Script
 * 
 * This script migrates existing plain text passwords to hashed passwords
 * Run this script once to upgrade your existing user data
 */

const COMPANIES_DIR = path.join(__dirname, 'companies');

async function migratePasswords() {
  console.log('🔐 Starting password migration...');
  
  try {
    const companies = await fs.readdir(COMPANIES_DIR);
    let migratedCount = 0;
    
    for (const companyId of companies) {
      const companyPath = path.join(COMPANIES_DIR, companyId);
      const stats = await fs.stat(companyPath);
      
      if (!stats.isDirectory()) continue;
      
      console.log(`\n📁 Processing company: ${companyId}`);
      
      // Migrate admin password
      const adminPath = path.join(companyPath, 'admin.json');
      try {
        const adminData = await fs.readFile(adminPath, 'utf8');
        const admin = JSON.parse(adminData);
        
        // Check if password is already hashed (starts with $2a$)
        if (admin.password && !admin.password.startsWith('$2a$')) {
          console.log(`  🔑 Hashing admin password for ${admin.companyName}`);
          admin.password = await hashPassword(admin.password);
          
          await fs.writeFile(adminPath, JSON.stringify(admin, null, 2));
          migratedCount++;
        } else {
          console.log(`  ✅ Admin password already hashed`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing admin for ${companyId}:`, error.message);
      }
      
      // Migrate user passwords
      const usersPath = path.join(companyPath, 'users.json');
      try {
        const usersData = await fs.readFile(usersPath, 'utf8');
        const users = JSON.parse(usersData.trim());
        
        let usersMigrated = 0;
        for (const user of users) {
          // Check if password is already hashed
          if (user.password && !user.password.startsWith('$2a$')) {
            console.log(`  🔑 Hashing password for user: ${user.email}`);
            user.password = await hashPassword(user.password);
            usersMigrated++;
          }
        }
        
        if (usersMigrated > 0) {
          await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
          migratedCount += usersMigrated;
          console.log(`  ✅ Migrated ${usersMigrated} user passwords`);
        } else {
          console.log(`  ✅ All user passwords already hashed`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing users for ${companyId}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Password migration completed!`);
    console.log(`📊 Total passwords migrated: ${migratedCount}`);
    
    if (migratedCount > 0) {
      console.log(`\n⚠️  Important:`);
      console.log(`   - All passwords have been hashed`);
      console.log(`   - Original plain text passwords are no longer recoverable`);
      console.log(`   - Users will need to use their existing passwords`);
      console.log(`   - Consider implementing password reset functionality`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migratePasswords()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePasswords };





