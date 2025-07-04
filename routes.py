from flask import render_template, request, jsonify
from app import app

@app.route('/')
def index():
    """Home page route"""
    return render_template('index.html')

@app.route('/about')
def about():
    """About page route"""
    return render_template('about.html')

@app.route('/api/health')
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Flask application is running'
    })

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    """Contact form route (placeholder for future implementation)"""
    if request.method == 'POST':
        # Placeholder for form processing
        return render_template('index.html', message="Form submitted successfully!")
    return render_template('index.html')
