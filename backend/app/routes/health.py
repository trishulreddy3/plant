from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)

@health_bp.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'Solar Plant Backend API',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'status': '/api/status',
            'api': '/api/*'
        }
    })

@health_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'solar-plant-backend'
    })

@health_bp.route('/api/status', methods=['GET'])
def api_status():
    return jsonify({
        'status': 'ok',
        'message': 'API is operational',
        'timestamp': '2024-01-01T00:00:00Z'
    })
