"""
Database connection utilities for the trading platform
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Get a PostgreSQL database connection
    Returns connection with RealDictCursor for easy JSON serialization
    """
    try:
        # Get database URL from environment
        database_url = os.environ.get("DATABASE_URL")
        
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not found")
        
        # Create connection with RealDictCursor for JSON-friendly results
        conn = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor
        )
        
        return conn
        
    except psycopg2.Error as e:
        logger.error(f"Database connection error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error connecting to database: {e}")
        raise