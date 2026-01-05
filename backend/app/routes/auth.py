from flask import Blueprint, request, jsonify
from ..services.login_service import check_login_credentials
from ..services.log_service import log_login_attempt

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email')
    password = data.get('password')
    company_name = data.get('companyName')

    if not all([email, password, company_name]):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check credentials
    result = check_login_credentials(email, password, company_name)

    # Log attempt
    ip = request.remote_addr
    log_login_attempt(email, company_name, result['valid'], ip)

    if result['valid']:
        return jsonify({
            'success': True,
            'user': result['user']
        })
    else:
        return jsonify({
            'success': False,
            'error': result['message']
        }), 401
