#!/usr/bin/env python3
"""
Script to populate the OptionStrategy database with comprehensive strategies
from "The Option Trader Handbook" by George Jabbour and Philip Budwick
"""

from app import app, db
from models import OptionStrategy
import sys

def create_basic_strategies():
    """Create basic option strategies"""
    strategies = [
        {
            'name': 'Long Call',
            'category': 'Bullish',
            'description': 'Buying a call option to profit from upward price movement. Most basic bullish strategy with limited risk and unlimited profit potential.',
            'market_condition': 'Moderately to strongly bullish',
            'risk_profile': 'Limited risk (premium paid), unlimited profit potential',
            'max_profit': 'Unlimited (Stock Price - Strike Price - Premium Paid)',
            'max_loss': 'Limited to premium paid',
            'breakeven_points': 'Strike Price + Premium Paid',
            'construction': 'Buy 1 Call Option at desired strike price and expiration',
            'adjustments': '''Adjustments when profitable:
- Roll up to higher strike to capture more profit
- Convert to bull call spread by selling higher strike call
- Take partial profits by selling portion of position

Adjustments when losing:
- Roll down to lower strike if still bullish
- Roll out to later expiration for more time
- Convert to protective put on underlying stock
- Close position to limit losses''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 47',
            'examples': 'Buy 1 XYZ 100 Call for $2. Max profit: Unlimited. Max loss: $200. Breakeven: $102.'
        },
        {
            'name': 'Short Call',
            'category': 'Bearish',
            'description': 'Selling a call option to collect premium, expecting the stock to stay below the strike price. High probability but limited profit strategy.',
            'market_condition': 'Neutral to moderately bearish',
            'risk_profile': 'Limited profit (premium received), unlimited risk',
            'max_profit': 'Limited to premium received',
            'max_loss': 'Unlimited (Strike Price - Stock Price + Premium Received)',
            'breakeven_points': 'Strike Price + Premium Received',
            'construction': 'Sell 1 Call Option at desired strike price and expiration',
            'adjustments': '''Adjustments when profitable:
- Buy back call early to capture profit
- Roll down to lower strike for more premium
- Let expire worthless if out of the money

Adjustments when losing:
- Buy back call to limit losses
- Roll up and out for credit
- Convert to covered call by buying underlying stock
- Create spread by buying higher strike call''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 48',
            'examples': 'Sell 1 XYZ 105 Call for $1.50. Max profit: $150. Max loss: Unlimited. Breakeven: $106.50.'
        },
        {
            'name': 'Long Put',
            'category': 'Bearish',
            'description': 'Buying a put option to profit from downward price movement. Most basic bearish strategy with limited risk and substantial profit potential.',
            'market_condition': 'Moderately to strongly bearish',
            'risk_profile': 'Limited risk (premium paid), substantial profit potential',
            'max_profit': 'Strike Price - Premium Paid (occurs at stock price = 0)',
            'max_loss': 'Limited to premium paid',
            'breakeven_points': 'Strike Price - Premium Paid',
            'construction': 'Buy 1 Put Option at desired strike price and expiration',
            'adjustments': '''Adjustments when profitable:
- Roll down to lower strike to capture more profit
- Convert to bear put spread by selling lower strike put
- Take partial profits by selling portion of position

Adjustments when losing:
- Roll up to higher strike if still bearish
- Roll out to later expiration for more time
- Convert to protective call on short stock position
- Close position to limit losses''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 48',
            'examples': 'Buy 1 XYZ 95 Put for $3. Max profit: $9,200 (at $0). Max loss: $300. Breakeven: $92.'
        },
        {
            'name': 'Short Put',
            'category': 'Bullish',
            'description': 'Selling a put option to collect premium, expecting the stock to stay above the strike price. Used to generate income or acquire stock at lower price.',
            'market_condition': 'Neutral to moderately bullish',
            'risk_profile': 'Limited profit (premium received), substantial risk',
            'max_profit': 'Limited to premium received',
            'max_loss': 'Strike Price - Premium Received (occurs at stock price = 0)',
            'breakeven_points': 'Strike Price - Premium Received',
            'construction': 'Sell 1 Put Option at desired strike price and expiration',
            'adjustments': '''Adjustments when profitable:
- Buy back put early to capture profit
- Roll up to higher strike for more premium
- Let expire worthless if out of the money

Adjustments when losing:
- Buy back put to limit losses
- Roll down and out for credit
- Accept assignment if willing to own stock
- Create spread by buying lower strike put''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 50',
            'examples': 'Sell 1 XYZ 90 Put for $2. Max profit: $200. Max loss: $8,800 (at $0). Breakeven: $88.'
        }
    ]
    return strategies

def create_spread_strategies():
    """Create basic spread strategies"""
    strategies = [
        {
            'name': 'Bull Call Spread',
            'category': 'Bullish',
            'description': 'Buying a lower strike call and selling a higher strike call to profit from moderate upward movement with reduced cost and risk.',
            'market_condition': 'Moderately bullish',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Difference in strike prices - net premium paid',
            'max_loss': 'Net premium paid',
            'breakeven_points': 'Lower strike price + net premium paid',
            'construction': 'Buy 1 Call (lower strike), Sell 1 Call (higher strike), same expiration',
            'adjustments': '''Adjustments when profitable:
- Close both legs early to capture profit
- Roll up both strikes to capture more upside
- Convert to protective put on underlying stock

Adjustments when losing:
- Roll out to later expiration
- Close the position to limit losses
- Convert to ratio spread by buying additional lower strike calls
- Let short call expire and manage long call''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 50',
            'examples': 'Buy XYZ 100 Call for $3, Sell XYZ 105 Call for $1. Net cost: $2. Max profit: $3. Breakeven: $102.'
        },
        {
            'name': 'Bear Put Spread',
            'category': 'Bearish',
            'description': 'Buying a higher strike put and selling a lower strike put to profit from moderate downward movement with reduced cost and risk.',
            'market_condition': 'Moderately bearish',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Difference in strike prices - net premium paid',
            'max_loss': 'Net premium paid',
            'breakeven_points': 'Higher strike price - net premium paid',
            'construction': 'Buy 1 Put (higher strike), Sell 1 Put (lower strike), same expiration',
            'adjustments': '''Adjustments when profitable:
- Close both legs early to capture profit
- Roll down both strikes to capture more downside
- Convert to protective call on short stock position

Adjustments when losing:
- Roll out to later expiration
- Close the position to limit losses
- Convert to ratio spread by buying additional higher strike puts
- Let short put expire and manage long put''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 51',
            'examples': 'Buy XYZ 95 Put for $4, Sell XYZ 90 Put for $2. Net cost: $2. Max profit: $3. Breakeven: $93.'
        },
        {
            'name': 'Bull Put Spread',
            'category': 'Bullish',
            'description': 'Selling a higher strike put and buying a lower strike put to collect premium while limiting risk, expecting stock to stay above higher strike.',
            'market_condition': 'Neutral to moderately bullish',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Net premium received',
            'max_loss': 'Difference in strike prices - net premium received',
            'breakeven_points': 'Higher strike price - net premium received',
            'construction': 'Sell 1 Put (higher strike), Buy 1 Put (lower strike), same expiration',
            'adjustments': '''Adjustments when profitable:
- Close both legs early to capture profit
- Roll up both strikes for more premium
- Let both options expire worthless if possible

Adjustments when losing:
- Roll out to later expiration for more time
- Close the position to limit losses
- Convert to iron condor by adding call spread
- Roll down the entire spread for credit''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 51',
            'examples': 'Sell XYZ 95 Put for $3, Buy XYZ 90 Put for $1. Net credit: $2. Max profit: $2. Max loss: $3. Breakeven: $93.'
        },
        {
            'name': 'Bear Call Spread',
            'category': 'Bearish',
            'description': 'Selling a lower strike call and buying a higher strike call to collect premium while limiting risk, expecting stock to stay below lower strike.',
            'market_condition': 'Neutral to moderately bearish',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Net premium received',
            'max_loss': 'Difference in strike prices - net premium received',
            'breakeven_points': 'Lower strike price + net premium received',
            'construction': 'Sell 1 Call (lower strike), Buy 1 Call (higher strike), same expiration',
            'adjustments': '''Adjustments when profitable:
- Close both legs early to capture profit
- Roll down both strikes for more premium
- Let both options expire worthless if possible

Adjustments when losing:
- Roll out to later expiration for more time
- Close the position to limit losses
- Convert to iron condor by adding put spread
- Roll up the entire spread for credit''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 52',
            'examples': 'Sell XYZ 105 Call for $2, Buy XYZ 110 Call for $0.50. Net credit: $1.50. Max profit: $1.50. Max loss: $3.50. Breakeven: $106.50.'
        }
    ]
    return strategies

def create_volatility_strategies():
    """Create volatility-based strategies"""
    strategies = [
        {
            'name': 'Long Straddle',
            'category': 'Volatility',
            'description': 'Buying both a call and put at the same strike price, expecting significant price movement in either direction. Pure volatility play.',
            'market_condition': 'High volatility expected, direction unknown',
            'risk_profile': 'Limited risk, unlimited profit potential on upside, substantial profit potential on downside',
            'max_profit': 'Unlimited on upside (Stock Price - Strike - Premium), substantial on downside (Strike - Premium - Stock Price)',
            'max_loss': 'Total premium paid for both options',
            'breakeven_points': 'Upper: Strike + Total Premium; Lower: Strike - Total Premium',
            'construction': 'Buy 1 Call and Buy 1 Put at same strike price and expiration',
            'adjustments': '''Adjustments when profitable:
- Take profits on profitable leg, hold losing leg for reversal
- Convert to strangle by rolling profitable leg further out
- Add butterfly spread to capture additional premium

Adjustments when losing (low volatility):
- Roll out to later expiration for more time
- Convert to calendar straddle
- Convert to iron butterfly by selling outer strikes
- Close position if volatility outlook changes''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 53',
            'examples': 'Buy XYZ 100 Call for $2.50, Buy XYZ 100 Put for $2.50. Total cost: $5. Breakeven: $95 and $105.'
        },
        {
            'name': 'Long Strangle',
            'category': 'Volatility',
            'description': 'Buying a call and put at different strike prices, expecting significant movement while reducing cost compared to straddle.',
            'market_condition': 'High volatility expected, wider breakeven range acceptable',
            'risk_profile': 'Limited risk, unlimited profit potential on upside, substantial profit potential on downside',
            'max_profit': 'Unlimited on upside (Stock Price - Call Strike - Premium), substantial on downside (Put Strike - Premium - Stock Price)',
            'max_loss': 'Total premium paid for both options',
            'breakeven_points': 'Upper: Call Strike + Total Premium; Lower: Put Strike - Total Premium',
            'construction': 'Buy 1 Call (higher strike) and Buy 1 Put (lower strike), same expiration',
            'adjustments': '''Adjustments when profitable:
- Take profits on profitable leg, manage losing leg
- Convert to straddle by adjusting strikes
- Roll profitable leg to capture more movement

Adjustments when losing (low volatility):
- Roll out to later expiration
- Convert to calendar strangle
- Convert to iron butterfly
- Adjust strikes to reduce breakeven points''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 54',
            'examples': 'Buy XYZ 105 Call for $1.50, Buy XYZ 95 Put for $1.50. Total cost: $3. Breakeven: $92 and $108.'
        },
        {
            'name': 'Short Straddle',
            'category': 'Neutral/Income',
            'description': 'Selling both a call and put at the same strike price, expecting low volatility and sideways movement to collect premium.',
            'market_condition': 'Low volatility expected, sideways movement',
            'risk_profile': 'Limited profit, unlimited risk',
            'max_profit': 'Total premium received from both options',
            'max_loss': 'Unlimited on both sides (minus premium received)',
            'breakeven_points': 'Upper: Strike + Total Premium; Lower: Strike - Total Premium',
            'construction': 'Sell 1 Call and Sell 1 Put at same strike price and expiration',
            'adjustments': '''Adjustments when profitable (low volatility):
- Buy back both options early to capture profit
- Roll to later expiration for more premium
- Let both expire worthless if at strike price

Adjustments when losing (high volatility):
- Buy back losing side to limit damage
- Convert to long straddle by buying back both sides
- Roll the entire position out for more time
- Create iron butterfly by buying protective options''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 54',
            'examples': 'Sell XYZ 100 Call for $2.50, Sell XYZ 100 Put for $2.50. Total credit: $5. Breakeven: $95 and $105.'
        },
        {
            'name': 'Short Strangle',
            'category': 'Neutral/Income',
            'description': 'Selling a call and put at different strike prices to collect premium while having wider profit zone than short straddle.',
            'market_condition': 'Low to moderate volatility expected, range-bound movement',
            'risk_profile': 'Limited profit, unlimited risk',
            'max_profit': 'Total premium received from both options',
            'max_loss': 'Unlimited on both sides (minus premium received)',
            'breakeven_points': 'Upper: Call Strike + Total Premium; Lower: Put Strike - Total Premium',
            'construction': 'Sell 1 Call (higher strike) and Sell 1 Put (lower strike), same expiration',
            'adjustments': '''Adjustments when profitable (within range):
- Buy back options early to capture profit
- Roll to later expiration for more premium
- Let both expire worthless if between strikes

Adjustments when losing (breakout):
- Buy back threatened side to limit damage
- Convert to long strangle by buying back both sides
- Roll the entire position out for more time
- Create protective wings with butterfly spreads''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 56',
            'examples': 'Sell XYZ 105 Call for $1.50, Sell XYZ 95 Put for $1.50. Total credit: $3. Breakeven: $92 and $108.'
        }
    ]
    return strategies

def create_advanced_strategies():
    """Create advanced spread strategies"""
    strategies = [
        {
            'name': 'Call Ratio Spread',
            'category': 'Neutral/Bearish',
            'description': 'Buying calls at lower strike and selling more calls at higher strike, creating a position that profits from moderate upward movement but loses on large moves.',
            'market_condition': 'Neutral to moderately bullish, limited upside expected',
            'risk_profile': 'Limited risk below, unlimited risk above',
            'max_profit': 'Occurs between strikes: (Higher Strike - Lower Strike + Net Credit) × 100',
            'max_loss': 'Net debit paid (if any), unlimited above upper breakeven',
            'breakeven_points': 'Lower: varies by ratio; Upper: Higher Strike + Max Profit ÷ Extra Shorts',
            'construction': 'Buy 1 Call (lower strike), Sell 2+ Calls (higher strike), same expiration',
            'adjustments': '''Adjustments when profitable (moderate move up):
- Close entire position to capture profit
- Buy back some short calls to reduce risk
- Roll up long call to higher strike

Adjustments when losing (large move up):
- Buy back short calls to limit unlimited risk
- Convert to calendar spread
- Roll out entire position for time
- Add protective long calls above short strikes''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 57',
            'examples': 'Buy 1 XYZ 100 Call for $3, Sell 2 XYZ 105 Calls for $1.50 each. Net cost: $0. Risk/reward varies by stock movement.'
        },
        {
            'name': 'Put Ratio Spread',
            'category': 'Neutral/Bullish',
            'description': 'Buying puts at higher strike and selling more puts at lower strike, profiting from moderate downward movement but losing on large declines.',
            'market_condition': 'Neutral to moderately bearish, limited downside expected',
            'risk_profile': 'Limited risk above, substantial risk below',
            'max_profit': 'Occurs between strikes: (Higher Strike - Lower Strike + Net Credit) × 100',
            'max_loss': 'Net debit paid (if any), substantial below lower breakeven',
            'breakeven_points': 'Upper: varies by ratio; Lower: Lower Strike - Max Profit ÷ Extra Shorts',
            'construction': 'Buy 1 Put (higher strike), Sell 2+ Puts (lower strike), same expiration',
            'adjustments': '''Adjustments when profitable (moderate move down):
- Close entire position to capture profit
- Buy back some short puts to reduce risk
- Roll down long put to lower strike

Adjustments when losing (large move down):
- Buy back short puts to limit assignment risk
- Convert to calendar spread
- Roll out entire position for time
- Add protective long puts below short strikes''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 58',
            'examples': 'Buy 1 XYZ 95 Put for $2, Sell 2 XYZ 90 Puts for $1 each. Net cost: $0. Risk/reward varies by stock movement.'
        },
        {
            'name': 'Long Iron Butterfly',
            'category': 'Neutral',
            'description': 'Combining bull put spread and bear call spread at same center strike, profiting when stock stays near center strike at expiration.',
            'market_condition': 'Low volatility, stock expected to stay near center strike',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Net credit received (when stock is at center strike at expiration)',
            'max_loss': 'Wing spread width - net credit received',
            'breakeven_points': 'Upper: Center Strike + Net Credit; Lower: Center Strike - Net Credit',
            'construction': 'Sell call and put at center strike, buy call above and put below',
            'adjustments': '''Adjustments when profitable (at center strike):
- Close position early to capture profit
- Let position expire at maximum profit
- Adjust wings if needed for defense

Adjustments when losing (moving away from center):
- Close position to limit losses
- Convert to iron condor for wider profit zone
- Roll out to later expiration
- Adjust threatened wing only''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 7, Page 320',
            'examples': 'Sell XYZ 100 Call/Put, Buy XYZ 95 Put and 105 Call. Credit received determines profit potential.'
        },
        {
            'name': 'Call Calendar Spread',
            'category': 'Neutral',
            'description': 'Selling near-term call and buying longer-term call at same strike, profiting from time decay and potential volatility increase.',
            'market_condition': 'Neutral to slightly bullish, expecting time decay advantage',
            'risk_profile': 'Limited risk, moderate profit potential',
            'max_profit': 'Occurs at strike price at near-term expiration',
            'max_loss': 'Net debit paid for the spread',
            'breakeven_points': 'Varies based on volatility and time to expiration',
            'construction': 'Sell near-term call, buy longer-term call at same strike',
            'adjustments': '''Adjustments when profitable:
- Close spread before near-term expiration
- Roll up both strikes if stock moves higher
- Convert to diagonal spread

Adjustments when losing:
- Close position if outlook changes
- Roll out near-term option
- Convert to butterfly spread
- Adjust strike price if needed''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 3, Page 155',
            'examples': 'Sell XYZ 100 Call (1 month) for $2, Buy XYZ 100 Call (3 months) for $4. Net cost: $2.'
        }
    ]
    return strategies

def create_stock_strategies():
    """Create stock-based option strategies"""
    strategies = [
        {
            'name': 'Protective Put',
            'category': 'Insurance/Hedging',
            'description': 'Buying a put option while owning the underlying stock to protect against downside risk. Often called "married put" or portfolio insurance.',
            'market_condition': 'Bullish long-term but concerned about short-term downside',
            'risk_profile': 'Limited downside risk, unlimited upside potential',
            'max_profit': 'Unlimited (stock appreciation minus put premium)',
            'max_loss': 'Stock price - Put strike price + Put premium',
            'breakeven_points': 'Stock purchase price + Put premium paid',
            'construction': 'Own 100 shares of stock + Buy 1 Put option',
            'adjustments': '''Adjustments when stock moves higher:
- Let put expire worthless and keep profits
- Roll put up to higher strike to protect more gains
- Sell calls against position (covered call)

Adjustments when stock moves lower:
- Exercise put to limit losses at strike price
- Roll put down and out for more protection
- Convert to bear put spread by selling lower strike put
- Sell covered calls to generate income''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 3, Page 66',
            'examples': 'Own 100 XYZ at $102, Buy XYZ 95 Put for $1. Protected below $95, cost $1. Breakeven: $103.'
        },
        {
            'name': 'Covered Call',
            'category': 'Income/Neutral',
            'description': 'Selling call options against owned stock to generate income, accepting to sell stock if called away above strike price.',
            'market_condition': 'Neutral to moderately bullish, income generation',
            'risk_profile': 'Reduced risk due to income, limited upside potential',
            'max_profit': 'Strike price - stock cost + premium received',
            'max_loss': 'Stock cost - premium received (if stock goes to zero)',
            'breakeven_points': 'Stock cost - premium received',
            'construction': 'Own 100 shares of stock + Sell 1 Call option',
            'adjustments': '''Adjustments when stock moves higher (call threatened):
- Buy back call to keep stock, sell new call higher
- Roll up and out for additional credit
- Accept assignment and keep premium
- Convert to collar by buying protective put

Adjustments when stock moves lower:
- Buy back call for profit, sell new call
- Let call expire worthless, sell new call
- Add protective put to limit downside
- Roll call down and out if possible''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 3, Page 83',
            'examples': 'Own 100 XYZ at $98, Sell XYZ 105 Call for $2. Max profit: $9 (7+2). Breakeven: $96.'
        },
        {
            'name': 'Collar',
            'category': 'Hedging/Income',
            'description': 'Combining protective put and covered call on owned stock to create a risk-defined position with limited profit and loss.',
            'market_condition': 'Neutral, seeking protection and income',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Call strike - stock cost + net credit (or minus net debit)',
            'max_loss': 'Stock cost - put strike + net debit (or minus net credit)',
            'breakeven_points': 'Stock cost +/- net debit or credit',
            'construction': 'Own stock + Buy put (lower strike) + Sell call (higher strike)',
            'adjustments': '''Adjustments when profitable:
- Close collar early to capture profit
- Roll both strikes up to capture more upside
- Let call expire and sell new call higher

Adjustments when between strikes:
- Let both options expire worthless
- Roll out to later expiration
- Adjust strikes to new range

Adjustments when threatened:
- Roll threatened side out for more time
- Close collar and manage stock separately
- Adjust collar strikes for better range''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 3, Page 94',
            'examples': 'Own 100 XYZ at $100, Buy 95 Put for $1, Sell 105 Call for $1.50. Net credit: $0.50.'
        },
        {
            'name': 'Call Replacement',
            'category': 'Leveraged Bullish',
            'description': 'Using long calls instead of owning stock to gain leveraged exposure with less capital and limited risk.',
            'market_condition': 'Strongly bullish, seeking leverage',
            'risk_profile': 'Limited risk (premium), leveraged profit potential',
            'max_profit': 'Unlimited (like stock ownership but leveraged)',
            'max_loss': 'Premium paid for calls',
            'breakeven_points': 'Strike price + premium paid',
            'construction': 'Buy deep ITM or ATM calls instead of stock (delta ~0.70-0.90)',
            'adjustments': '''Adjustments when profitable:
- Take partial profits by selling some calls
- Roll up to higher strikes to stay leveraged
- Convert to vertical spread by selling higher calls
- Exercise calls to own stock

Adjustments when losing:
- Roll out to later expiration for more time
- Roll down to lower strike if still bullish
- Close position to limit losses
- Add protective puts if converting to stock''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 3, Page 80',
            'examples': 'Instead of buying 100 XYZ at $100, buy 1 XYZ 95 Call for $7. Same upside, $700 vs $10,000 risk.'
        }
    ]
    return strategies

def create_combination_strategies():
    """Create combination strategies"""
    strategies = [
        {
            'name': 'Iron Condor',
            'category': 'Neutral/Income',
            'description': 'Combining bull put spread and bear call spread to profit from range-bound movement while collecting premium.',
            'market_condition': 'Low volatility, range-bound movement expected',
            'risk_profile': 'Limited risk and limited profit, high probability strategy',
            'max_profit': 'Net credit received when stock stays between short strikes',
            'max_loss': 'Wing spread width - net credit received',
            'breakeven_points': 'Lower: Put strike - net credit; Upper: Call strike + net credit',
            'construction': 'Sell put spread (bull put) + Sell call spread (bear call) with different strikes',
            'adjustments': '''Adjustments when profitable (within range):
- Close early to capture profit (typically 25-50% max profit)
- Let expire worthless if staying in range
- Roll out to later expiration for more credit

Adjustments when tested (near breakout):
- Close threatened side only
- Convert to iron butterfly for more credit
- Roll entire position out for more time
- Adjust strikes to follow stock movement''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 7, Page 324',
            'examples': 'Sell 95-90 put spread and 105-110 call spread. Profit if XYZ stays between 95-105.'
        },
        {
            'name': 'Butterfly Spread',
            'category': 'Neutral',
            'description': 'Long two options at different strikes and short two options at middle strike, profiting when stock stays near middle strike.',
            'market_condition': 'Low volatility, stock expected near center strike',
            'risk_profile': 'Limited risk and limited profit',
            'max_profit': 'Center strike spread - net debit (at center strike)',
            'max_loss': 'Net debit paid',
            'breakeven_points': 'Lower: Lower strike + net debit; Upper: Upper strike - net debit',
            'construction': 'Buy 1 option, Sell 2 options (middle), Buy 1 option (using calls or puts)',
            'adjustments': '''Adjustments when profitable (near center):
- Close position early to capture profit
- Let position expire at maximum profit
- Adjust if stock moves away from center

Adjustments when losing (away from center):
- Close position to limit losses
- Convert to calendar spread
- Roll entire position to follow stock
- Adjust to iron butterfly for credit''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 61',
            'examples': 'Buy XYZ 95 Call, Sell 2 XYZ 100 Calls, Buy XYZ 105 Call. Profits if XYZ near $100.'
        },
        {
            'name': 'Ratio Write',
            'category': 'Income/Neutral',
            'description': 'Owning stock and selling more calls than stock positions, generating income but creating upside risk on excess calls.',
            'market_condition': 'Neutral to moderately bullish, high implied volatility',
            'risk_profile': 'Enhanced income, unlimited upside risk on naked calls',
            'max_profit': 'Call strike × number of shares + net premium - stock cost',
            'max_loss': 'Unlimited above upper breakeven point',
            'breakeven_points': 'Lower: stock cost - total premium; Upper: call strike + excess call profit per share',
            'construction': 'Own 100 shares + Sell 2+ calls (creating naked call exposure)',
            'adjustments': '''Adjustments when profitable (within target range):
- Close calls early to capture time decay
- Let calls expire worthless if out of money
- Roll calls up and out for more premium

Adjustments when threatened (large upside move):
- Buy back excess calls to limit naked risk
- Roll calls up and out for credit
- Buy additional stock to cover naked calls
- Convert to covered call position''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 3, Page 101',
            'examples': 'Own 100 XYZ at $98, Sell 2 XYZ 105 Calls for $2 each. Enhanced income but upside risk.'
        },
        {
            'name': 'Synthetic Long Stock',
            'category': 'Bullish',
            'description': 'Buying call and selling put at same strike to replicate stock ownership with less capital and different risk profile.',
            'market_condition': 'Bullish, seeking stock-like exposure with less capital',
            'risk_profile': 'Similar to stock ownership but with different assignment/exercise features',
            'max_profit': 'Unlimited (similar to owning stock)',
            'max_loss': 'Strike price + net debit (or - net credit)',
            'breakeven_points': 'Strike price + net debit paid (or - net credit received)',
            'construction': 'Buy 1 Call + Sell 1 Put at same strike and expiration',
            'adjustments': '''Adjustments when profitable:
- Take profits by closing both legs
- Exercise call and accept put assignment to own stock
- Roll up both strikes to stay leveraged

Adjustments when losing:
- Close position to limit losses
- Accept put assignment if wanting to own stock
- Roll out both legs for more time
- Convert to actual stock ownership''',
            'source_book': 'The Option Trader Handbook',
            'author': 'George Jabbour & Philip Budwick',
            'page_reference': 'Chapter 2, Page 42',
            'examples': 'Buy XYZ 100 Call for $2.50, Sell XYZ 100 Put for $2.50. Net cost: $0. Acts like owning stock at $100.'
        }
    ]
    return strategies

def populate_database():
    """Populate the database with all strategies"""
    print("🔄 Populating Option Trading Strategies Database...")
    
    try:
        # Get all strategy collections
        all_strategies = []
        all_strategies.extend(create_basic_strategies())
        all_strategies.extend(create_spread_strategies())
        all_strategies.extend(create_volatility_strategies())
        all_strategies.extend(create_advanced_strategies())
        all_strategies.extend(create_stock_strategies())
        all_strategies.extend(create_combination_strategies())
        
        # Clear existing strategies (optional - comment out to keep existing)
        # OptionStrategy.query.delete()
        
        # Add new strategies
        strategies_added = 0
        for strategy_data in all_strategies:
            # Check if strategy already exists
            existing = OptionStrategy.query.filter_by(name=strategy_data['name']).first()
            if not existing:
                strategy = OptionStrategy(**strategy_data)
                db.session.add(strategy)
                strategies_added += 1
                print(f"✅ Added: {strategy_data['name']} ({strategy_data['category']})")
            else:
                print(f"⚠️  Exists: {strategy_data['name']} - Skipping")
        
        # Commit all changes
        db.session.commit()
        
        print(f"\n🎉 Successfully added {strategies_added} new strategies!")
        print(f"📊 Total strategies in database: {OptionStrategy.query.count()}")
        
    except Exception as e:
        print(f"❌ Error populating database: {e}")
        db.session.rollback()
        return False
    
    return True

if __name__ == "__main__":
    with app.app_context():
        success = populate_database()
        if success:
            print("\n✅ Strategy population completed successfully!")
        else:
            print("\n❌ Strategy population failed!")
            sys.exit(1)