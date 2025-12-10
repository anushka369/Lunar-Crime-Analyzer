import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export class DatabaseMigrator {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir?: string) {
    this.pool = pool;
    this.migrationsDir = migrationsDir || path.join(__dirname);
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    console.log('Starting database migration...');
    
    // Ensure migrations table exists
    await this.ensureMigrationsTable();
    
    // Get list of migration files
    const migrationFiles = this.getMigrationFiles();
    
    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Filter out already applied migrations
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(this.getVersionFromFilename(file))
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found.');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations.`);
    
    // Run each pending migration
    for (const migrationFile of pendingMigrations) {
      await this.runMigration(migrationFile);
    }
    
    console.log('Migration completed successfully.');
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    console.log('Starting migration rollback...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }
    
    // Get the last applied migration
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    
    // Check if rollback file exists
    const rollbackFile = path.join(this.migrationsDir, `${lastMigration}_rollback.sql`);
    
    if (!fs.existsSync(rollbackFile)) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }
    
    // Run rollback
    const rollbackSql = fs.readFileSync(rollbackFile, 'utf8');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(rollbackSql);
      await client.query(
        'DELETE FROM schema_migrations WHERE version = $1',
        [lastMigration]
      );
      await client.query('COMMIT');
      console.log(`Rolled back migration: ${lastMigration}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{ version: string; applied_at: Date; description: string }[]> {
    const result = await this.pool.query(
      'SELECT version, applied_at, description FROM schema_migrations ORDER BY version'
    );
    return result.rows;
  }

  private async ensureMigrationsTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        description TEXT
      );
    `;
    
    await this.pool.query(createTableSql);
  }

  private getMigrationFiles(): string[] {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.endsWith('_rollback.sql'))
      .sort();
    
    return files;
  }

  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      // If table doesn't exist, return empty array
      return [];
    }
  }

  private getVersionFromFilename(filename: string): string {
    return filename.replace('.sql', '');
  }

  private async runMigration(migrationFile: string): Promise<void> {
    const version = this.getVersionFromFilename(migrationFile);
    const migrationPath = path.join(this.migrationsDir, migrationFile);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Running migration: ${version}`);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(migrationSql);
      
      await client.query('COMMIT');
      console.log(`Migration completed: ${version}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${version}`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default DatabaseMigrator;