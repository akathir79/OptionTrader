# Flask Web Application

## Overview

This is a clean, minimal Flask web application designed as a foundation for custom development. It follows Flask best practices with proper separation of concerns, error handling, and a responsive Bootstrap-based frontend.

## System Architecture

### Frontend Architecture
- **Template Engine**: Jinja2 templates with a base template inheritance pattern
- **CSS Framework**: Bootstrap 5 with dark theme
- **Icons**: Font Awesome 6.0 for consistent iconography
- **JavaScript**: Vanilla JavaScript with component initialization pattern
- **Responsive Design**: Mobile-first approach using Bootstrap's grid system

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Structure**: Modular approach with separate files for routes, main application, and configuration
- **Error Handling**: Custom error pages for 404 and 500 errors
- **Logging**: Debug-level logging configured for development
- **Session Management**: Flask sessions with configurable secret key

### Application Structure
```
├── app.py              # Main Flask application factory
├── main.py             # Application entry point
├── routes.py           # Route definitions
├── templates/          # Jinja2 templates
│   ├── base.html       # Base template with navigation
│   ├── index.html      # Home page
│   ├── about.html      # About page
│   └── error.html      # Error page template
└── static/             # Static assets
    ├── css/style.css   # Custom CSS
    └── js/main.js      # JavaScript functionality
```

## Key Components

### Core Flask Application (app.py)
- Configures Flask app with environment-based secret key
- Sets up debug logging
- Implements centralized error handling
- Imports routes after app creation to avoid circular imports

### Routing System (routes.py)
- **Home Route** (`/`): Serves the main landing page
- **About Route** (`/about`): Displays application information
- **Health Check** (`/api/health`): JSON endpoint for monitoring
- **Contact Route** (`/contact`): Placeholder for future form handling

### Template System
- **Base Template**: Provides consistent layout with navigation and footer
- **Component Templates**: Modular pages extending the base template
- **Error Templates**: User-friendly error pages with navigation back to safety

### Static Assets
- **CSS**: Custom styles with hover effects and responsive utilities
- **JavaScript**: Component initialization and smooth scrolling functionality

## Data Flow

1. **Request Processing**: Flask receives HTTP requests and routes them through the URL dispatcher
2. **Route Handling**: Routes process requests and prepare data for templates
3. **Template Rendering**: Jinja2 renders HTML templates with context data
4. **Response**: Flask returns rendered HTML or JSON responses
5. **Error Handling**: Custom error handlers catch exceptions and render appropriate error pages

## External Dependencies

### CDN Dependencies
- **Bootstrap 5**: CSS framework for responsive design
- **Font Awesome 6**: Icon library for UI elements
- **Bootstrap Agent Dark Theme**: Custom dark theme CSS

### Python Dependencies
- **Flask**: Core web framework
- **Jinja2**: Template engine (included with Flask)
- **Werkzeug**: WSGI utilities (included with Flask)

### Environment Configuration
- **SESSION_SECRET**: Environment variable for session security (falls back to development key)

## Deployment Strategy

### Development Setup
- **Debug Mode**: Enabled for development with auto-reload
- **Host Configuration**: Binds to `0.0.0.0:5000` for Replit compatibility
- **Entry Points**: Both `app.py` and `main.py` can serve as entry points

### Production Considerations
- **Secret Key**: Should be set via environment variable in production
- **Debug Mode**: Must be disabled in production
- **Static Files**: Can be served by web server (nginx/Apache) in production
- **Error Handling**: Custom error pages provide user-friendly experience

### Scalability Preparation
- **Modular Structure**: Easy to extend with additional routes and templates
- **Static Assets**: Organized for potential CDN deployment
- **API Endpoints**: Health check endpoint ready for load balancer integration

## Changelog
- July 04, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.