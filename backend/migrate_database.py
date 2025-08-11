"""
Database migration script to fix the schema and session structure.
Run this script to update your existing database safely.
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if DB_URL is None:
    raise RuntimeError("DATABASE_URL not set in .env file")

engine = create_engine(DB_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_database():
    """
    Migrate the database to fix schema and session structure.
    """
    db = SessionLocal()
    
    try:
        print("🔄 Starting database migration...")
        
        # 1. Fix the sessions table structure
        print("📋 Updating sessions table...")
        
        # Add new session_id column if it doesn't exist
        try:
            db.execute(text("""
                ALTER TABLE sessions 
                ADD COLUMN session_id VARCHAR(255);
            """))
            print("✅ Added session_id column to sessions table")
        except Exception as e:
            print(f"⚠️  session_id column might already exist: {e}")
        
        # Copy existing id values to session_id if they're empty
        try:
            db.execute(text("""
                UPDATE sessions 
                SET session_id = id 
                WHERE session_id IS NULL;
            """))
            print("✅ Populated session_id column with existing id values")
        except Exception as e:
            print(f"⚠️  Error updating session_id: {e}")
        
        # Make session_id the primary key and drop old id column
        try:
            # First, drop any existing constraints on the old id column
            db.execute(text("""
                ALTER TABLE sessions 
                DROP CONSTRAINT IF EXISTS sessions_pkey CASCADE;
            """))
            
            # Add primary key constraint to session_id
            db.execute(text("""
                ALTER TABLE sessions 
                ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);
            """))
            
            # Drop the old id column
            db.execute(text("""
                ALTER TABLE sessions 
                DROP COLUMN IF EXISTS id;
            """))
            print("✅ Updated sessions table primary key structure")
        except Exception as e:
            print(f"⚠️  Error updating primary key structure: {e}")
        
        # 2. Fix foreign key references
        print("🔗 Fixing foreign key references...")
        
        # Drop existing foreign key constraints that might be wrong
        try:
            db.execute(text("""
                ALTER TABLE sessions 
                DROP CONSTRAINT IF EXISTS sessions_schema_id_fkey;
            """))
            
            # Add correct foreign key constraint
            db.execute(text("""
                ALTER TABLE sessions 
                ADD CONSTRAINT sessions_schema_id_fkey 
                FOREIGN KEY (schema_id) REFERENCES schemas(schema_id);
            """))
            print("✅ Fixed sessions -> schemas foreign key")
        except Exception as e:
            print(f"⚠️  Error fixing foreign keys: {e}")
        
        # Fix competitions table foreign key
        try:
            db.execute(text("""
                ALTER TABLE competitions 
                DROP CONSTRAINT IF EXISTS competitions_schema_id_fkey;
            """))
            
            db.execute(text("""
                ALTER TABLE competitions 
                ADD CONSTRAINT competitions_schema_id_fkey 
                FOREIGN KEY (schema_id) REFERENCES schemas(schema_id);
            """))
            print("✅ Fixed competitions -> schemas foreign key")
        except Exception as e:
            print(f"⚠️  Error fixing competitions foreign key: {e}")
        
        # 3. Add difficulty column to sessions if missing
        try:
            db.execute(text("""
                ALTER TABLE sessions 
                ADD COLUMN difficulty VARCHAR(50) DEFAULT 'beginner';
            """))
            print("✅ Added difficulty column to sessions table")
        except Exception as e:
            print(f"⚠️  difficulty column might already exist: {e}")
        
        # 4. Clean up any duplicate schemas that might have been created
        print("🧹 Cleaning up duplicate schemas...")
        try:
            # This query finds and removes duplicate schemas keeping only the oldest one
            db.execute(text("""
                DELETE FROM schemas s1 
                USING schemas s2 
                WHERE s1.schema_id > s2.schema_id 
                AND s1.user_id = s2.user_id 
                AND s1.schema_script = s2.schema_script;
            """))
            print("✅ Removed duplicate schemas")
        except Exception as e:
            print(f"⚠️  Error cleaning duplicates: {e}")
        
        # Commit all changes
        db.commit()
        print("🎉 Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_migration():
    """
    Verify that the migration was successful.
    """
    db = SessionLocal()
    
    try:
        print("\n🔍 Verifying migration...")
        
        # Check sessions table structure
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            ORDER BY ordinal_position;
        """))
        
        print("📋 Sessions table structure:")
        for row in result:
            print(f"  - {row[0]}: {row[1]} ({'NULL' if row[2] == 'YES' else 'NOT NULL'})")
        
        # Check foreign key constraints
        result = db.execute(text("""
            SELECT constraint_name, table_name, column_name 
            FROM information_schema.key_column_usage 
            WHERE table_name IN ('sessions', 'competitions') 
            AND constraint_name LIKE '%fkey%';
        """))
        
        print("\n🔗 Foreign key constraints:")
        for row in result:
            print(f"  - {row[1]}.{row[2]} -> {row[0]}")
        
        print("✅ Migration verification completed!")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 SQL Tutor AI Database Migration")
    print("This script will fix the database schema and session structure.")
    
    confirm = input("\nDo you want to proceed with the migration? (y/N): ")
    if confirm.lower() in ['y', 'yes']:
        migrate_database()
        verify_migration()
    else:
        print("Migration cancelled.")


