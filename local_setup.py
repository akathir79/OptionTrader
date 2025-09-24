#!/usr/bin/env python3
"""
Local Development Setup Script
Prepares your trading platform for local development with all data
"""

import os
import subprocess
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_local_environment():
    """Setup local development environment"""
    
    print("🚀 Trading Platform Local Setup")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        logger.error("❌ Python 3.8 or higher required!")
        return False
    
    logger.info(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Install requirements
    print("\n📦 Installing Python dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        logger.info("✅ Dependencies installed")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install dependencies: {e}")
        print("Manual installation required: pip install flask flask-sqlalchemy psycopg2-binary")
        return False
    except FileNotFoundError:
        logger.warning("⚠️  requirements.txt not found, install manually:")
        print("pip install flask flask-sqlalchemy psycopg2-binary fyers-apiv3 requests pytz")
    
    # Setup environment variables
    print("\n🔧 Environment Setup:")
    print("Set these environment variables for local development:")
    print("DATABASE_URL=postgresql://user:password@localhost:5432/trading_db")
    print("SESSION_SECRET=your-secret-key-here")
    print("DEBUG=True")
    
    # Database setup
    print("\n💾 Database Setup:")
    print("1. Install PostgreSQL locally")
    print("2. Create database: createdb trading_db")
    print("3. Run restore script with your backup file")
    
    # Show backup files
    backup_files = [f for f in os.listdir('.') if f.startswith('trading_platform_backup_')]
    if backup_files:
        latest_backup = max(backup_files)
        print(f"\n📂 Found backup file: {latest_backup}")
        print(f"Run: python3 database_restore.py {latest_backup}")
    else:
        print("\n📂 No backup files found")
        print("Create one first: python3 database_backup.py")
    
    print("\n🏃 Running the Application:")
    print("python3 main.py")
    print("Visit: http://localhost:5000")
    
    print("\n" + "=" * 50)
    print("✅ Local setup guide complete!")
    
    return True

def create_requirements_file():
    """Create requirements.txt for local development"""
    
    requirements = """
flask==3.0.0
flask-sqlalchemy==3.1.1
psycopg2-binary==2.9.9
fyers-apiv3==3.3.0
requests==2.31.0
pytz==2023.3
gunicorn==21.2.0
werkzeug==3.0.1
sqlalchemy==2.0.23
numpy==1.26.2
email-validator==2.1.0
trafilatura==1.6.4
""".strip()
    
    with open('requirements.txt', 'w') as f:
        f.write(requirements)
    
    logger.info("✅ requirements.txt created")

if __name__ == "__main__":
    print("Creating requirements.txt...")
    create_requirements_file()
    
    print("\nSetting up local environment...")
    setup_local_environment()