#!/usr/bin/env node

// Migration script to update existing database to support 'claimed' status
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'task-coordinator.db');

console.log('=== Database Migration: Adding claimed status ===\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log(`Connected to database at ${dbPath}`);
  
  // Check if the table exists and get its schema
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'", (err, row) => {
    if (err) {
      console.error('Error checking table:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (!row) {
      console.log('Tasks table does not exist. No migration needed.');
      db.close();
      process.exit(0);
    }
    
    const currentSchema = row.sql;
    console.log('Current schema:', currentSchema);
    
    // Check if 'claimed' is already in the schema
    if (currentSchema.includes("'claimed'")) {
      console.log('\n✓ Database already supports claimed status. No migration needed.');
      db.close();
      process.exit(0);
    }
    
    // Perform migration
    console.log('\nMigrating database...');
    
    db.serialize(() => {
      // Start transaction
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          console.error('Error starting transaction:', err.message);
          db.close();
          process.exit(1);
        }
        
        // Create new table with updated schema
        db.run(`
          CREATE TABLE tasks_new (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('available', 'claimed', 'working', 'done', 'failed')),
            worker TEXT,
            dependencies TEXT,
            output TEXT,
            error TEXT,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating new table:', err.message);
            db.run('ROLLBACK');
            db.close();
            process.exit(1);
          }
          
          // Copy data from old table
          db.run(`
            INSERT INTO tasks_new (id, description, status, worker, dependencies, output, error, started_at, completed_at, created_at)
            SELECT id, description, status, worker, dependencies, output, error, started_at, completed_at, created_at
            FROM tasks
          `, (err) => {
            if (err) {
              console.error('Error copying data:', err.message);
              db.run('ROLLBACK');
              db.close();
              process.exit(1);
            }
            
            // Drop old table
            db.run('DROP TABLE tasks', (err) => {
              if (err) {
                console.error('Error dropping old table:', err.message);
                db.run('ROLLBACK');
                db.close();
                process.exit(1);
              }
              
              // Rename new table
              db.run('ALTER TABLE tasks_new RENAME TO tasks', (err) => {
                if (err) {
                  console.error('Error renaming table:', err.message);
                  db.run('ROLLBACK');
                  db.close();
                  process.exit(1);
                }
                
                // Recreate indexes
                db.run('CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status)', (err) => {
                  if (err) {
                    console.error('Error creating index:', err.message);
                    db.run('ROLLBACK');
                    db.close();
                    process.exit(1);
                  }
                  
                  // Commit transaction
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing transaction:', err.message);
                      db.close();
                      process.exit(1);
                    }
                    
                    console.log('\n✓ Database migration completed successfully!');
                    console.log('The tasks table now supports the claimed status.');
                    
                    db.close((err) => {
                      if (err) {
                        console.error('Error closing database:', err.message);
                      }
                      process.exit(0);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});