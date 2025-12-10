#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import pool from '../config/database';
import { DatabaseMigrator } from '../migrations/migrator';
import path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  const command = process.argv[2];
  const migrationsDir = path.join(__dirname, '../migrations');
  const migrator = new DatabaseMigrator(pool, migrationsDir);

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await migrator.migrate();
        break;
      
      case 'down':
      case 'rollback':
        await migrator.rollback();
        break;
      
      case 'status':
        const status = await migrator.getStatus();
        console.log('Applied migrations:');
        status.forEach(migration => {
          console.log(`  ${migration.version} - ${migration.description} (${migration.applied_at})`);
        });
        break;
      
      default:
        console.log('Usage: npm run migrate [up|down|status]');
        console.log('  up/migrate - Run pending migrations');
        console.log('  down/rollback - Rollback last migration');
        console.log('  status - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}