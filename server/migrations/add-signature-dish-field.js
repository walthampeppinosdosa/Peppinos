/**
 * Migration script to add isSignatureDish field to existing menu items
 * Run this script once to update all existing menu items with the new field
 */

const mongoose = require('mongoose');
const Menu = require('../models/Menu');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peppinos', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Migration function
const addSignatureDishField = async () => {
  try {
    console.log('Starting migration: Adding isSignatureDish field to existing menu items...');
    
    // Update all menu items that don't have the isSignatureDish field
    const result = await Menu.updateMany(
      { isSignatureDish: { $exists: false } }, // Find documents without the field
      { $set: { isSignatureDish: false } }     // Set default value to false
    );
    
    console.log(`Migration completed successfully!`);
    console.log(`Updated ${result.modifiedCount} menu items`);
    
    // Verify the migration
    const totalItems = await Menu.countDocuments({});
    const itemsWithField = await Menu.countDocuments({ isSignatureDish: { $exists: true } });
    
    console.log(`Total menu items: ${totalItems}`);
    console.log(`Items with isSignatureDish field: ${itemsWithField}`);
    
    if (totalItems === itemsWithField) {
      console.log('✅ Migration verification successful - all items have the isSignatureDish field');
    } else {
      console.log('⚠️  Migration verification failed - some items still missing the field');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Main execution
const runMigration = async () => {
  try {
    await connectDB();
    await addSignatureDishField();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { addSignatureDishField };
