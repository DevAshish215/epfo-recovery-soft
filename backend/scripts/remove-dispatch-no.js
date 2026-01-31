/**
 * Script to remove dispatch_no_for_letters_cps field from all office records
 * Run this script with: node scripts/remove-dispatch-no.js
 */

import mongoose from 'mongoose';
import { MONGO_URI } from '../src/config/env.js';
import Office from '../src/modules/office/office.model.js';

async function removeDispatchNoField() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Update all office documents to unset the dispatch_no_for_letters_cps field
    const result = await Office.updateMany(
      { dispatch_no_for_letters_cps: { $exists: true } },
      { $unset: { dispatch_no_for_letters_cps: "" } }
    );

    console.log(`\nSuccessfully removed 'dispatch_no_for_letters_cps' field from ${result.modifiedCount} office record(s).`);
    console.log(`Matched ${result.matchedCount} office record(s).`);

    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error removing dispatch_no_for_letters_cps field:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
removeDispatchNoField();

