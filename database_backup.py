#!/usr/bin/env python3
"""
Database Backup Script for Trading Platform
Exports all strategy data and essential tables for local development
"""

import os
import json
import logging
from datetime import datetime
from app import app, db
from models import OptionStrategy, BrokerSettings, PaperTradingSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backup_database():
    """Create a complete backup of database tables and data"""
    
    backup_data = {
        'backup_info': {
            'created_at': datetime.utcnow().isoformat(),
            'version': '1.0',
            'platform': 'trading_platform'
        },
        'tables': {}
    }
    
    try:
        with app.app_context():
            # Backup Option Strategies
            logger.info("Backing up option strategies...")
            strategies = OptionStrategy.query.all()
            backup_data['tables']['option_strategies'] = [strategy.to_dict() for strategy in strategies]
            logger.info(f"Backed up {len(strategies)} option strategies")
            
            # Backup Broker Settings (without sensitive data)
            logger.info("Backing up broker settings...")
            brokers = BrokerSettings.query.all()
            broker_data = []
            for broker in brokers:
                broker_dict = {
                    'user_id': broker.user_id,
                    'brokername': broker.brokername,
                    'broker_user_id': broker.broker_user_id,
                    'app_name': broker.app_name,
                    'app_source': broker.app_source,
                    'clientid': broker.clientid,
                    'appkey': '[REDACTED]',
                    'redirect_url': broker.redirect_url,
                    'pin': '[REDACTED]',
                    'useremail': broker.useremail,
                    'usermobileno': broker.usermobileno,
                    'pan': '[REDACTED]',
                    'dob': broker.dob,
                    'access_token': '[REDACTED]',
                    'refresh_token': '[REDACTED]',
                    'access_token_created_at': broker.access_token_created_at,
                    'refresh_token_created_at': broker.refresh_token_created_at,
                    'created_at': broker.created_at
                }
                broker_data.append(broker_dict)
            backup_data['tables']['broker_settings'] = broker_data
            logger.info(f"Backed up {len(broker_data)} broker configurations")
            
            # Backup Paper Trading Settings
            logger.info("Backing up paper trading settings...")
            paper_settings = PaperTradingSettings.query.all()
            paper_data = []
            for setting in paper_settings:
                # Use basic serialization since we don't know the exact fields yet
                setting_dict = {}
                for column in setting.__table__.columns:
                    value = getattr(setting, column.name)
                    setting_dict[column.name] = value
                paper_data.append(setting_dict)
            backup_data['tables']['paper_trading_settings'] = paper_data
            logger.info(f"Backed up {len(paper_data)} paper trading configurations")
            
            # Get table schemas for reference
            backup_data['schemas'] = get_table_schemas()
            
        # Save backup file
        backup_filename = f"trading_platform_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_filename, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"✅ Backup completed successfully: {backup_filename}")
        logger.info(f"📊 Total strategies: {len(backup_data['tables']['option_strategies'])}")
        return backup_filename
        
    except Exception as e:
        logger.error(f"❌ Backup failed: {str(e)}")
        return None

def get_table_schemas():
    """Get basic table schema information"""
    schemas = {}
    
    # Option Strategies schema
    schemas['option_strategies'] = {
        'columns': [
            'id', 'name', 'category', 'description', 'market_condition', 
            'risk_profile', 'max_profit', 'max_loss', 'breakeven_points',
            'construction', 'adjustments', 'source_book', 'author', 
            'page_reference', 'examples', 'created_at'
        ],
        'primary_key': 'id'
    }
    
    return schemas

if __name__ == "__main__":
    print("🔄 Starting database backup...")
    backup_file = backup_database()
    if backup_file:
        print(f"✅ Backup saved to: {backup_file}")
        print("📝 You can now use this file to restore your database locally!")
    else:
        print("❌ Backup failed!")