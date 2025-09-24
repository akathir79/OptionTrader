#!/usr/bin/env python3
"""
Database Restore Script for Trading Platform
Restores strategy data and essential tables for local development
"""

import os
import json
import logging
from datetime import datetime
from app import app, db
from models import OptionStrategy, BrokerSettings, PaperTradingSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def restore_database(backup_file):
    """Restore database from backup file"""
    
    if not os.path.exists(backup_file):
        logger.error(f"❌ Backup file not found: {backup_file}")
        return False
    
    try:
        # Load backup data
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        
        logger.info(f"📂 Loading backup from: {backup_file}")
        logger.info(f"📅 Backup created: {backup_data['backup_info']['created_at']}")
        
        with app.app_context():
            # Create all tables if they don't exist
            logger.info("🔧 Creating database tables...")
            db.create_all()
            
            # Restore Option Strategies
            if 'option_strategies' in backup_data['tables']:
                restore_option_strategies(backup_data['tables']['option_strategies'])
            
            # Restore Broker Settings (template data only)
            if 'broker_settings' in backup_data['tables']:
                restore_broker_settings(backup_data['tables']['broker_settings'])
            
            # Restore Paper Trading Settings
            if 'paper_trading_settings' in backup_data['tables']:
                restore_paper_trading_settings(backup_data['tables']['paper_trading_settings'])
            
            db.session.commit()
            logger.info("✅ Database restore completed successfully!")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Restore failed: {str(e)}")
        return False

def restore_option_strategies(strategies_data):
    """Restore option strategies"""
    logger.info("📊 Restoring option strategies...")
    
    # Check if strategies already exist
    existing_count = OptionStrategy.query.count()
    if existing_count > 0:
        logger.info(f"⚠️  Found {existing_count} existing strategies, skipping...")
        return
    
    restored_count = 0
    for strategy_data in strategies_data:
        try:
            # Remove id to let database auto-generate
            strategy_data.pop('id', None)
            
            # Convert created_at string back to datetime if needed
            if 'created_at' in strategy_data and isinstance(strategy_data['created_at'], str):
                strategy_data['created_at'] = datetime.fromisoformat(strategy_data['created_at'].replace('Z', '+00:00'))
            
            strategy = OptionStrategy(**strategy_data)
            db.session.add(strategy)
            restored_count += 1
            
        except Exception as e:
            logger.warning(f"⚠️  Failed to restore strategy {strategy_data.get('name', 'Unknown')}: {str(e)}")
    
    logger.info(f"✅ Restored {restored_count} option strategies")

def restore_broker_settings(broker_data):
    """Restore broker settings (as templates)"""
    logger.info("🔐 Restoring broker settings templates...")
    
    # Check if broker settings already exist
    existing_count = BrokerSettings.query.count()
    if existing_count > 0:
        logger.info(f"⚠️  Found {existing_count} existing broker settings, skipping...")
        return
    
    restored_count = 0
    for broker in broker_data:
        try:
            # Remove id and sensitive data
            broker.pop('id', None)
            sensitive_fields = ['appkey', 'access_token', 'refresh_token', 'pin', 'pan']
            for field in sensitive_fields:
                if field in broker and broker[field] == '[REDACTED]':
                    broker[field] = None
            
            # Convert datetime fields
            datetime_fields = ['created_at', 'access_token_created_at', 'refresh_token_created_at']
            for field in datetime_fields:
                if field in broker and broker[field] and isinstance(broker[field], str):
                    broker[field] = datetime.fromisoformat(broker[field].replace('Z', '+00:00'))
            
            # Convert date fields
            if 'dob' in broker and broker['dob'] and isinstance(broker['dob'], str):
                broker['dob'] = datetime.fromisoformat(broker['dob']).date()
            
            broker_setting = BrokerSettings(**broker)
            db.session.add(broker_setting)
            restored_count += 1
            
        except Exception as e:
            logger.warning(f"⚠️  Failed to restore broker {broker.get('brokername', 'Unknown')}: {str(e)}")
    
    logger.info(f"✅ Restored {restored_count} broker configuration templates")

def restore_paper_trading_settings(settings_data):
    """Restore paper trading settings"""
    logger.info("📈 Restoring paper trading settings...")
    
    # Check if settings already exist
    existing_count = PaperTradingSettings.query.count()
    if existing_count > 0:
        logger.info(f"⚠️  Found {existing_count} existing paper trading settings, skipping...")
        return
    
    restored_count = 0
    for setting in settings_data:
        try:
            # Remove id to let database auto-generate
            setting.pop('id', None)
            
            # Convert datetime fields
            datetime_fields = ['created_at', 'updated_at']
            for field in datetime_fields:
                if field in setting and setting[field] and isinstance(setting[field], str):
                    setting[field] = datetime.fromisoformat(setting[field].replace('Z', '+00:00'))
            
            paper_setting = PaperTradingSettings(**setting)
            db.session.add(paper_setting)
            restored_count += 1
            
        except Exception as e:
            logger.warning(f"⚠️  Failed to restore paper trading setting for user {setting.get('user_id', 'Unknown')}: {str(e)}")
    
    logger.info(f"✅ Restored {restored_count} paper trading configurations")

def initialize_fresh_database():
    """Initialize a fresh database with default data"""
    logger.info("🚀 Initializing fresh database...")
    
    with app.app_context():
        # Create all tables
        db.create_all()
        logger.info("✅ Database tables created")
        
        # Look for any existing backup files
        backup_files = [f for f in os.listdir('.') if f.startswith('trading_platform_backup_') and f.endswith('.json')]
        
        if backup_files:
            # Use the most recent backup
            latest_backup = max(backup_files)
            logger.info(f"📂 Found backup file: {latest_backup}")
            return restore_database(latest_backup)
        else:
            logger.info("📝 No backup files found. Database initialized with empty tables.")
            return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        backup_file = sys.argv[1]
        print(f"🔄 Restoring from backup: {backup_file}")
        success = restore_database(backup_file)
    else:
        print("🔄 Initializing fresh database...")
        success = initialize_fresh_database()
    
    if success:
        print("✅ Database restore/initialization completed!")
    else:
        print("❌ Database restore/initialization failed!")