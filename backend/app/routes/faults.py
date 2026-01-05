from flask import Blueprint, request, jsonify
from ..services.fault_service import query_panel_faults

faults_bp = Blueprint('faults', __name__, url_prefix='/api')

@faults_bp.route('/companies/<company_id>/faults', methods=['GET'])
def get_faults(company_id):
    table_id = request.args.get('table_id')
    date_from = request.args.get('from')
    date_to = request.args.get('to')

    date_range = None
    if date_from and date_to:
        date_range = {'from': date_from, 'to': date_to}

    result = query_panel_faults(company_id, table_id, date_range)

    return jsonify(result)
