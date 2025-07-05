from flask import request, jsonify
from datetime import datetime, time
import pytz
from APP_Extensions.db import db
from models import MarketTime


def api_list_market_times():
    """Get all market times for the current user"""
    try:
        market_times = MarketTime.query.filter_by(user_id=0, is_active=True).all()
        return jsonify([mt.to_dict() for mt in market_times])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def api_create_market_time():
    """Create a new market time entry"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['market_name', 'country', 'exchange_code', 'local_open_time', 'local_close_time', 'timezone']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Validate time format
        try:
            datetime.strptime(data['local_open_time'], '%H:%M')
            datetime.strptime(data['local_close_time'], '%H:%M')
        except ValueError:
            return jsonify({"error": "Invalid time format. Use HH:MM"}), 400
        
        # Validate timezone
        try:
            pytz.timezone(data['timezone'])
        except pytz.UnknownTimeZoneError:
            return jsonify({"error": "Invalid timezone"}), 400
        
        # Create new market time
        market_time = MarketTime(
            user_id=0,
            market_name=data['market_name'],
            country=data['country'],
            exchange_code=data['exchange_code'],
            local_open_time=data['local_open_time'],
            local_close_time=data['local_close_time'],
            timezone=data['timezone'],
            trading_days=data.get('trading_days', '1,2,3,4,5'),
            notify_open=data.get('notify_open', True),
            notify_close=data.get('notify_close', True),
            sound_enabled=data.get('sound_enabled', True),
            premarket_start=data.get('premarket_start'),
            afterhours_end=data.get('afterhours_end'),
            lunch_start=data.get('lunch_start'),
            lunch_end=data.get('lunch_end'),
            is_active=True
        )
        
        db.session.add(market_time)
        db.session.commit()
        
        return jsonify(market_time.to_dict()), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


def api_update_market_time(market_id):
    """Update an existing market time entry"""
    try:
        market_time = MarketTime.query.filter_by(id=market_id, user_id=0).first()
        if not market_time:
            return jsonify({"error": "Market time not found"}), 404
        
        data = request.get_json()
        
        # Validate time format if provided
        if 'local_open_time' in data:
            try:
                datetime.strptime(data['local_open_time'], '%H:%M')
                market_time.local_open_time = data['local_open_time']
            except ValueError:
                return jsonify({"error": "Invalid open time format. Use HH:MM"}), 400
        
        if 'local_close_time' in data:
            try:
                datetime.strptime(data['local_close_time'], '%H:%M')
                market_time.local_close_time = data['local_close_time']
            except ValueError:
                return jsonify({"error": "Invalid close time format. Use HH:MM"}), 400
        
        # Validate timezone if provided
        if 'timezone' in data:
            try:
                pytz.timezone(data['timezone'])
                market_time.timezone = data['timezone']
            except pytz.UnknownTimeZoneError:
                return jsonify({"error": "Invalid timezone"}), 400
        
        # Update other fields
        updatable_fields = ['market_name', 'country', 'exchange_code', 'trading_days', 
                           'notify_open', 'notify_close', 'sound_enabled', 
                           'premarket_start', 'afterhours_end', 'lunch_start', 'lunch_end']
        
        for field in updatable_fields:
            if field in data:
                setattr(market_time, field, data[field])
        
        market_time.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(market_time.to_dict())
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


def api_delete_market_time(market_id):
    """Delete a market time entry"""
    try:
        market_time = MarketTime.query.filter_by(id=market_id, user_id=0).first()
        if not market_time:
            return jsonify({"error": "Market time not found"}), 404
        
        market_time.is_active = False
        market_time.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({"message": "Market time deleted successfully"})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


def api_get_current_market_status():
    """Get current status of all active markets"""
    try:
        market_times = MarketTime.query.filter_by(user_id=0, is_active=True).all()
        current_utc = datetime.utcnow()
        
        market_status = []
        
        for market in market_times:
            try:
                # Convert to market timezone
                market_tz = pytz.timezone(market.timezone)
                market_time = current_utc.replace(tzinfo=pytz.UTC).astimezone(market_tz)
                
                # Check if current day is a trading day
                current_weekday = market_time.weekday() + 1  # Monday = 1
                trading_days = [int(d) for d in market.trading_days.split(',')]
                
                is_trading_day = current_weekday in trading_days
                
                # Parse market times
                open_time = datetime.strptime(market.local_open_time, '%H:%M').time()
                close_time = datetime.strptime(market.local_close_time, '%H:%M').time()
                current_time = market_time.time()
                
                # Determine market status
                if not is_trading_day:
                    status = "closed"
                    next_event = "closed_weekend"
                elif current_time < open_time:
                    status = "pre_market"
                    next_event = "opening"
                elif current_time >= close_time:
                    status = "closed"
                    next_event = "closed_day"
                else:
                    status = "open"
                    next_event = "closing"
                
                # Check for lunch break
                if market.lunch_start and market.lunch_end and status == "open":
                    lunch_start = datetime.strptime(market.lunch_start, '%H:%M').time()
                    lunch_end = datetime.strptime(market.lunch_end, '%H:%M').time()
                    if lunch_start <= current_time <= lunch_end:
                        status = "lunch_break"
                        next_event = "lunch_end"
                
                market_status.append({
                    'id': market.id,
                    'market_name': market.market_name,
                    'country': market.country,
                    'exchange_code': market.exchange_code,
                    'status': status,
                    'next_event': next_event,
                    'local_time': market_time.strftime('%H:%M'),
                    'local_date': market_time.strftime('%Y-%m-%d'),
                    'timezone': market.timezone,
                    'is_trading_day': is_trading_day,
                    'notify_open': market.notify_open,
                    'notify_close': market.notify_close,
                    'sound_enabled': market.sound_enabled
                })
                
            except Exception as e:
                # Skip this market if there's an error processing it
                continue
        
        return jsonify(market_status)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def api_initialize_default_markets():
    """Initialize default market times from the provided data"""
    try:
        # Check if markets already exist
        existing_count = MarketTime.query.filter_by(user_id=0, is_active=True).count()
        if existing_count > 0:
            return jsonify({"message": "Markets already initialized", "count": existing_count})
        
        # Default market data based on the provided file
        default_markets = [
            {
                'market_name': 'New York Stock Exchange',
                'country': 'United States',
                'exchange_code': 'NYSE',
                'local_open_time': '09:30',
                'local_close_time': '16:00',
                'timezone': 'America/New_York',
                'trading_days': '1,2,3,4,5',
                'premarket_start': '04:00',
                'afterhours_end': '20:00'
            },
            {
                'market_name': 'NASDAQ',
                'country': 'United States',
                'exchange_code': 'NASDAQ',
                'local_open_time': '09:30',
                'local_close_time': '16:00',
                'timezone': 'America/New_York',
                'trading_days': '1,2,3,4,5',
                'premarket_start': '04:00',
                'afterhours_end': '20:00'
            },
            {
                'market_name': 'London Stock Exchange',
                'country': 'United Kingdom',
                'exchange_code': 'LSE',
                'local_open_time': '08:00',
                'local_close_time': '16:30',
                'timezone': 'Europe/London',
                'trading_days': '1,2,3,4,5'
            },
            {
                'market_name': 'Tokyo Stock Exchange',
                'country': 'Japan',
                'exchange_code': 'TSE',
                'local_open_time': '09:00',
                'local_close_time': '15:00',
                'timezone': 'Asia/Tokyo',
                'trading_days': '1,2,3,4,5',
                'lunch_start': '11:30',
                'lunch_end': '12:30'
            },
            {
                'market_name': 'Hong Kong Stock Exchange',
                'country': 'Hong Kong',
                'exchange_code': 'HKEX',
                'local_open_time': '09:30',
                'local_close_time': '16:00',
                'timezone': 'Asia/Hong_Kong',
                'trading_days': '1,2,3,4,5',
                'lunch_start': '12:00',
                'lunch_end': '13:00'
            },
            {
                'market_name': 'National Stock Exchange',
                'country': 'India',
                'exchange_code': 'NSE',
                'local_open_time': '09:15',
                'local_close_time': '15:30',
                'timezone': 'Asia/Kolkata',
                'trading_days': '1,2,3,4,5'
            },
            {
                'market_name': 'Shanghai Stock Exchange',
                'country': 'China',
                'exchange_code': 'SSE',
                'local_open_time': '09:30',
                'local_close_time': '15:00',
                'timezone': 'Asia/Shanghai',
                'trading_days': '1,2,3,4,5',
                'lunch_start': '11:30',
                'lunch_end': '13:00'
            },
            {
                'market_name': 'Singapore Exchange',
                'country': 'Singapore',
                'exchange_code': 'SGX',
                'local_open_time': '09:00',
                'local_close_time': '17:00',
                'timezone': 'Asia/Singapore',
                'trading_days': '1,2,3,4,5'
            }
        ]
        
        created_markets = []
        for market_data in default_markets:
            market = MarketTime(
                user_id=0,
                market_name=market_data['market_name'],
                country=market_data['country'],
                exchange_code=market_data['exchange_code'],
                local_open_time=market_data['local_open_time'],
                local_close_time=market_data['local_close_time'],
                timezone=market_data['timezone'],
                trading_days=market_data['trading_days'],
                notify_open=True,
                notify_close=True,
                sound_enabled=True,
                premarket_start=market_data.get('premarket_start'),
                afterhours_end=market_data.get('afterhours_end'),
                lunch_start=market_data.get('lunch_start'),
                lunch_end=market_data.get('lunch_end'),
                is_active=True
            )
            db.session.add(market)
            created_markets.append(market_data['market_name'])
        
        db.session.commit()
        
        return jsonify({
            "message": "Default markets initialized successfully",
            "created_markets": created_markets,
            "count": len(created_markets)
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500