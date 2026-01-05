from flask import Blueprint, jsonify

example_bp = Blueprint('example', __name__, url_prefix='/api')

@example_bp.route('/example', methods=['GET'])
def get_example():
    return jsonify({
        'message': 'This is an example API endpoint',
        'data': {
            'timestamp': '2024-01-01T00:00:00Z',
            'version': '1.0.0'
        }
    })
