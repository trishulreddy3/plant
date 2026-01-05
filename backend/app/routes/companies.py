from flask import Blueprint, request, jsonify
from ..models import db, Company, User, Entry, Ticket, Table
from datetime import datetime
import json
import math

companies_bp = Blueprint('companies', __name__, url_prefix='/api')

# Panel data generation function (ported from old JavaScript)
def generate_panel_data(panel_count, voltage_per_panel, current_per_panel, existing_data=None):
    def to_fixed_len(arr, length, fill_val):
        a = arr[:length] if arr else []
        while len(a) < length:
            a.append(fill_val)
        return a

    voltage = []
    current = []
    power = []
    panel_health = []
    panel_states = []
    actual_fault_status = []

    if existing_data:
        voltage = to_fixed_len(existing_data.get('voltage', []), panel_count, voltage_per_panel)
        current = to_fixed_len(existing_data.get('current', []), panel_count, current_per_panel)
        power = to_fixed_len(existing_data.get('power', []), panel_count, 0)
        power = [round(v * c, 1) for v, c in zip(voltage, current)]

        if 'health' in existing_data:
            panel_health = to_fixed_len(existing_data['health'], panel_count, 100)
        else:
            expected = voltage_per_panel * current_per_panel
            panel_health = [max(0, min(100, round((p / expected) * 100))) for p in power]

        panel_states = to_fixed_len(existing_data.get('states', []), panel_count, 'good')
        actual_fault_status = to_fixed_len(existing_data.get('actualFaultStatus', []), panel_count, False)
    else:
        voltage = [round(voltage_per_panel, 1)] * panel_count
        current = [round(current_per_panel, 1)] * panel_count
        expected = round(voltage_per_panel * current_per_panel, 1)
        power = [expected] * panel_count
        panel_health = [100] * panel_count
        panel_states = ['good'] * panel_count
        actual_fault_status = [False] * panel_count

    expected = round(voltage_per_panel * current_per_panel, 1)
    fault_index = next((i for i, c in enumerate(current) if c < current_per_panel), -1)

    if fault_index >= 0:
        fault_current = current[fault_index]
        for i in range(fault_index + 1, panel_count):
            current[i] = fault_current

    power = [round(v * c, 1) for v, c in zip(voltage, current)]
    panel_health = [max(0, min(100, round((p / expected) * 100))) for p in power]
    panel_states = ['fault' if h < 20 else 'repairing' if h < 90 else 'good' for h in panel_health]
    actual_fault_status = [False] * panel_count
    if fault_index >= 0:
        actual_fault_status[fault_index] = True

    return {
        'voltage': voltage,
        'current': current,
        'power': power,
        'health': panel_health,
        'states': panel_states,
        'actualFaultStatus': actual_fault_status,
        'seriesState': panel_states[fault_index] if fault_index >= 0 else 'good',
        'seriesHealth': panel_health[fault_index] if fault_index >= 0 else 100,
        'actualFaultyIndex': fault_index if fault_index >= 0 else None,
    }

@companies_bp.route('/companies', methods=['GET'])
def get_companies():
    companies = Company.query.all()
    return jsonify([{
        'id': c.company_id,
        'name': c.company_name,
        'folderPath': f'/companies/{c.company_id}',
        'createdAt': c.created_at.isoformat(),
        **c.to_dict()
    } for c in companies])

@companies_bp.route('/companies', methods=['POST'])
def create_company():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['companyId', 'companyName', 'voltagePerPanel', 'currentPerPanel', 'plantPowerKW', 'adminEmail', 'adminPassword', 'adminName']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        db.session.begin()

        company = Company(
            company_id=data['companyId'],
            company_name=data['companyName'],
            voltage_per_panel=data['voltagePerPanel'],
            current_per_panel=data['currentPerPanel'],
            power_per_panel=data['voltagePerPanel'] * data['currentPerPanel'],
            plant_power_kw=data['plantPowerKW']
        )
        db.session.add(company)
        db.session.flush()  # Get company.id

        # Create admin user
        admin = User(
            company_id=company.id,
            email=data['adminEmail'],
            name=data['adminName'],
            role='admin',
            created_by='super_admin'
        )
        admin.password = data['adminPassword']
        db.session.add(admin)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Company created successfully',
            'companyPath': f'/companies/{company.company_id}'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/companies/<company_id>', methods=['GET'])
def get_company(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    # Regenerate panel data
    for table in company.tables:
        if table.top_panels:
            table.topPanels = generate_panel_data(
                table.panels_top,
                company.voltage_per_panel,
                company.current_per_panel,
                json.loads(table.top_panels)
            )
            table.top_panels = json.dumps(table.topPanels)
        if table.bottom_panels:
            table.bottomPanels = generate_panel_data(
                table.panels_bottom,
                company.voltage_per_panel,
                company.current_per_panel,
                json.loads(table.bottom_panels)
            )
            table.bottom_panels = json.dumps(table.bottomPanels)

    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify(company.to_dict())

@companies_bp.route('/companies/<company_id>/admin', methods=['GET'])
def get_admin(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    admin = User.query.filter_by(company_id=company.id, role='admin').first()
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404

    return jsonify({
        'email': admin.email,
        'password': admin.password_hash,  # Note: returning hash for compatibility
        'name': admin.name,
        'createdAt': admin.created_at.isoformat()
    })

@companies_bp.route('/companies/<company_id>/technicians', methods=['GET'])
def get_technicians(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    technicians = User.query.filter_by(company_id=company.id, role='technician').all()

    # Enrich with phone numbers from entries
    entries = {e.email: e.phone_number for e in company.entries if e.role == 'technician'}
    enriched = []
    for tech in technicians:
        enriched.append({
            **tech.to_dict(),
            'phoneNumber': tech.phone_number or entries.get(tech.email, '')
        })

    return jsonify(enriched)

@companies_bp.route('/companies/<company_id>/technicians', methods=['POST'])
def add_technician(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data or not all(k in data for k in ['email', 'password', 'role', 'createdBy']):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        technician = User(
            company_id=company.id,
            email=data['email'],
            name=data.get('name', data['email'].split('@')[0]),
            role='technician',
            created_by=data['createdBy']
        )
        technician.password = data['password']
        db.session.add(technician)
        db.session.commit()

        return jsonify({'success': True, 'technician': technician.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/companies/<company_id>/management', methods=['GET'])
def get_management(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    management = User.query.filter_by(company_id=company.id, role='management').all()

    # Enrich with phone numbers
    entries = {e.email: e.phone_number for e in company.entries if e.role == 'management'}
    enriched = []
    for mgmt in management:
        enriched.append({
            **mgmt.to_dict(),
            'phoneNumber': mgmt.phone_number or entries.get(mgmt.email, '')
        })

    return jsonify(enriched)

@companies_bp.route('/companies/<company_id>/users', methods=['GET'])
def get_users(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    admin = User.query.filter_by(company_id=company.id, role='admin').first()
    technicians = User.query.filter_by(company_id=company.id, role='technician').all()
    management = User.query.filter_by(company_id=company.id, role='management').all()

    return jsonify({
        'admin': admin.to_dict() if admin else None,
        'technicians': [t.to_dict() for t in technicians],
        'management': [m.to_dict() for m in management]
    })

@companies_bp.route('/companies/<company_id>/entries', methods=['GET'])
def get_entries(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    # Sync entries from users
    for user in company.users:
        if not any(e.email == user.email and e.role == user.role for e in company.entries):
            entry = Entry(
                company_id=company.id,
                company_name=company.company_name,
                name=user.name,
                role=user.role,
                email=user.email,
                phone_number=user.phone_number,
                created_by=user.created_by
            )
            db.session.add(entry)

    # Filter out main admin
    admin = User.query.filter_by(company_id=company.id, role='admin').first()
    admin_email = admin.email if admin else None

    entries = [e for e in company.entries if not (e.role == 'admin' and e.email == admin_email)]

    db.session.commit()
    return jsonify([e.to_dict() for e in entries])

@companies_bp.route('/companies/<company_id>/entries', methods=['POST'])
def add_entry(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        db.session.begin()

        # Create entry
        entry = Entry(
            company_id=company.id,
            company_name=data.get('companyName', company.company_name),
            name=data.get('name', ''),
            role=data.get('role', 'technician'),
            email=data.get('email', ''),
            phone_number=data.get('phoneNumber', ''),
            created_by=data.get('createdBy', 'super_admin')
        )
        db.session.add(entry)
        db.session.flush()

        # Create or update user if role is technician/management/admin
        if data['role'] in ['technician', 'management', 'admin']:
            user = User.query.filter_by(company_id=company.id, email=data['email']).first()
            if user:
                user.name = data.get('name', user.name)
                user.phone_number = data.get('phoneNumber', user.phone_number)
            else:
                user = User(
                    company_id=company.id,
                    email=data['email'],
                    name=data.get('name', data['email'].split('@')[0]),
                    role=data['role'],
                    phone_number=data.get('phoneNumber'),
                    created_by=data.get('createdBy', 'super_admin')
                )
                user.password = data.get('password', 'defaultpass')
                db.session.add(user)

        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/companies/<company_id>/entries/<entry_id>', methods=['PUT'])
def update_entry(company_id, entry_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    entry = Entry.query.filter_by(id=int(entry_id), company_id=company.id).first()
    if not entry:
        # Try to find by user ID format
        if entry_id.startswith('user-'):
            user = User.query.filter_by(id=int(entry_id.split('-')[1]), company_id=company.id).first()
            if user:
                entry = Entry.query.filter_by(email=user.email, role=user.role, company_id=company.id).first()
                if not entry:
                    entry = Entry(
                        company_id=company.id,
                        company_name=company.company_name,
                        name=user.name,
                        role=user.role,
                        email=user.email,
                        phone_number=user.phone_number,
                        created_by=user.created_by
                    )
                    db.session.add(entry)

    if not entry:
        return jsonify({'error': 'Entry not found'}), 404

    data = request.get_json() or {}
    for key in ['companyName', 'name', 'role', 'email', 'phoneNumber']:
        if key in data:
            setattr(entry, key.lower().replace('companyname', 'company_name').replace('phonenumber', 'phone_number'), data[key])

    # Update corresponding user
    user = User.query.filter_by(email=entry.email, company_id=company.id).first()
    if user:
        user.name = entry.name
        user.phone_number = entry.phone_number

    db.session.commit()
    return jsonify({'success': True, 'entry': entry.to_dict()})

@companies_bp.route('/companies/<company_id>/entries/<entry_id>', methods=['DELETE'])
def delete_entry(company_id, entry_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    entry = Entry.query.filter_by(id=int(entry_id), company_id=company.id).first()
    if not entry:
        # Try user ID
        if entry_id.startswith('user-'):
            user = User.query.filter_by(id=int(entry_id.split('-')[1]), company_id=company.id).first()
            if user:
                entry = Entry.query.filter_by(email=user.email, role=user.role, company_id=company.id).first()

    if not entry:
        return jsonify({'error': 'Entry not found'}), 404

    # Delete corresponding user
    user = User.query.filter_by(email=entry.email, company_id=company.id).first()
    if user:
        db.session.delete(user)

    db.session.delete(entry)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Entry deleted successfully'})

@companies_bp.route('/companies/<company_id>/tables', methods=['POST'])
def create_table(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data or 'panelsTop' not in data or 'panelsBottom' not in data:
        return jsonify({'error': 'Missing panel counts'}), 400

    top_count = int(data.get('panelsTop', 0))
    bottom_count = int(data.get('panelsBottom', 0))

    if top_count < 0 or bottom_count < 0 or top_count > 20 or bottom_count > 20 or (top_count == 0 and bottom_count == 0):
        return jsonify({'error': 'Invalid panel counts'}), 400

    # Generate serial number
    max_num = 0
    for table in company.tables:
        import re
        match = re.search(r'TBL-(\d+)', table.serial_number)
        if match:
            max_num = max(max_num, int(match.group(1)))
    next_num = max_num + 1
    serial = f"TBL-{next_num:04d}"

    try:
        db.session.begin()

        top_panels = generate_panel_data(top_count, company.voltage_per_panel, company.current_per_panel)
        bottom_panels = generate_panel_data(bottom_count, company.voltage_per_panel, company.current_per_panel)

        table = Table(
            company_id=company.id,
            serial_number=data.get('serialNumber', serial),
            panels_top=top_count,
            panels_bottom=bottom_count,
            top_panels=json.dumps(top_panels),
            bottom_panels=json.dumps(bottom_panels)
        )
        db.session.add(table)

        company.last_updated = datetime.utcnow()
        db.session.commit()

        return jsonify({'success': True, 'message': 'Table created', 'table': table.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/companies/<company_id>/tables/<table_id>', methods=['PUT'])
def update_table(company_id, table_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    table = Table.query.filter_by(id=int(table_id), company_id=company.id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    data = request.get_json() or {}
    if 'panelsTop' in data:
        table.panels_top = int(data['panelsTop'])
        table.topPanels = generate_panel_data(table.panels_top, company.voltage_per_panel, company.current_per_panel, json.loads(table.top_panels) if table.top_panels else None)
        table.top_panels = json.dumps(table.topPanels)
    if 'panelsBottom' in data:
        table.panels_bottom = int(data['panelsBottom'])
        table.bottomPanels = generate_panel_data(table.panels_bottom, company.voltage_per_panel, company.current_per_panel, json.loads(table.bottom_panels) if table.bottom_panels else None)
        table.bottom_panels = json.dumps(table.bottomPanels)
    if 'serialNumber' in data:
        table.serial_number = data['serialNumber']

    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Table updated successfully', 'table': table.to_dict()})

@companies_bp.route('/companies/<company_id>/tables/<table_id>', methods=['DELETE'])
def delete_table(company_id, table_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    table = Table.query.filter_by(id=int(table_id), company_id=company.id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    db.session.delete(table)
    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Table deleted successfully'})

@companies_bp.route('/companies/<company_id>/plant', methods=['PUT'])
def update_plant(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data or 'voltagePerPanel' not in data or 'currentPerPanel' not in data:
        return jsonify({'error': 'Missing voltage/current values'}), 400

    company.voltage_per_panel = float(data['voltagePerPanel'])
    company.current_per_panel = float(data['currentPerPanel'])
    company.power_per_panel = company.voltage_per_panel * company.current_per_panel

    # Regenerate all table panel data
    for table in company.tables:
        if table.panels_top > 0:
            table.topPanels = generate_panel_data(
                table.panels_top,
                company.voltage_per_panel,
                company.current_per_panel,
                json.loads(table.top_panels) if table.top_panels else None
            )
            table.top_panels = json.dumps(table.topPanels)
        if table.panels_bottom > 0:
            table.bottomPanels = generate_panel_data(
                table.panels_bottom,
                company.voltage_per_panel,
                company.current_per_panel,
                json.loads(table.bottom_panels) if table.bottom_panels else None
            )
            table.bottom_panels = json.dumps(table.bottomPanels)

    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Plant settings updated', 'plant': company.to_dict()})

@companies_bp.route('/companies/<company_id>/refresh-panel-data', methods=['PUT'])
def refresh_panel_data(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    # Regenerate all panel data
    for table in company.tables:
        if table.panels_top > 0:
            table.topPanels = generate_panel_data(
                table.panels_top,
                company.voltage_per_panel,
                company.current_per_panel,
                json.loads(table.top_panels) if table.top_panels else None
            )
            table.top_panels = json.dumps(table.topPanels)
        if table.panels_bottom > 0:
            table.bottomPanels = generate_panel_data(
                table.panels_bottom,
                company.voltage_per_panel,
                company.current_per_panel,
                json.loads(table.bottom_panels) if table.bottom_panels else None
            )
            table.bottom_panels = json.dumps(table.bottomPanels)

    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Panel data refreshed',
        'updatedAt': company.last_updated.isoformat(),
        'tables': len(company.tables),
        'simulation': 'proper-series-connection'
    })

@companies_bp.route('/companies/<company_id>/panels/current', methods=['PUT'])
def set_panel_current(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data or not all(k in data for k in ['tableId', 'position', 'index', 'current']):
        return jsonify({'error': 'Missing required fields'}), 400

    table = Table.query.filter_by(id=int(data['tableId']), company_id=company.id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    position = data['position']
    index = int(data['index'])
    current = float(data['current'])
    propagate_series = data.get('propagateSeries', False)

    if position not in ['top', 'bottom']:
        return jsonify({'error': 'Invalid position'}), 400

    panels_key = 'top_panels' if position == 'top' else 'bottom_panels'
    count_key = 'panels_top' if position == 'top' else 'panels_bottom'

    panels_data = json.loads(getattr(table, panels_key) or '{}')
    if not panels_data:
        panels_data = generate_panel_data(getattr(table, count_key), company.voltage_per_panel, company.current_per_panel)

    panels_data['current'][index] = current
    panels_data['voltage'][index] = company.voltage_per_panel
    panels_data['power'][index] = round(company.voltage_per_panel * current, 1)

    if propagate_series:
        panels_data['actualFaultyIndex'] = index
        panels_data['seriesState'] = 'fault'
        panels_data['actualFaultStatus'] = [i == index for i in range(len(panels_data['actualFaultStatus']))]
    elif propagate_series is False:
        panels_data['actualFaultyIndex'] = -1
        panels_data['seriesState'] = 'good'
        panels_data['actualFaultStatus'] = [False] * len(panels_data['actualFaultStatus'])

    setattr(table, panels_key, json.dumps(panels_data))
    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Panel current updated', 'plant': company.to_dict()})

@companies_bp.route('/companies/<company_id>/resolve-panel', methods=['PUT'])
def resolve_panel(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data or not all(k in data for k in ['tableId', 'position', 'index']):
        return jsonify({'error': 'Missing required fields'}), 400

    table = Table.query.filter_by(id=int(data['tableId']), company_id=company.id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    position = data['position']
    index = int(data['index'])

    if position not in ['top', 'bottom']:
        return jsonify({'error': 'Invalid position'}), 400

    panels_key = 'top_panels' if position == 'top' else 'bottom_panels'
    count_key = 'panels_top' if position == 'top' else 'panels_bottom'

    panels_data = generate_panel_data(getattr(table, count_key), company.voltage_per_panel, company.current_per_panel)
    setattr(table, panels_key, json.dumps(panels_data))

    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Panel resolved and values reset', 'plant': company.to_dict()})

@companies_bp.route('/companies/<company_id>/tables/<table_id>/panels/<panel_id>', methods=['DELETE'])
def delete_panel(company_id, table_id, panel_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    table = Table.query.filter_by(id=int(table_id), company_id=company.id).first()
    if not table:
        return jsonify({'error': 'Table not found'}), 404

    # Parse panel ID: format like "top-0" or "bottom-1"
    parts = panel_id.split('-')
    if len(parts) < 2:
        return jsonify({'error': 'Invalid panel ID'}), 400

    position = parts[-2]
    index = int(parts[-1])

    if position not in ['top', 'bottom']:
        return jsonify({'error': 'Invalid position'}), 400

    panels_key = 'top_panels' if position == 'top' else 'bottom_panels'
    count_key = 'panels_top' if position == 'top' else 'panels_bottom'

    panels_data = json.loads(getattr(table, panels_key) or '{}')
    if not panels_data or 'voltage' not in panels_data:
        return jsonify({'error': 'No panel data'}), 400

    # Remove panel at index
    for key in ['voltage', 'current', 'power', 'health', 'states', 'actualFaultStatus']:
        if key in panels_data and isinstance(panels_data[key], list):
            panels_data[key].pop(index)

    setattr(table, count_key, getattr(table, count_key) - 1)
    setattr(table, panels_key, json.dumps(panels_data))

    company.last_updated = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Panel deleted successfully', 'updatedTable': table.to_dict()})

@companies_bp.route('/companies/<company_id>/tickets/resolve', methods=['POST'])
def resolve_ticket(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    if not data or not all(k in data for k in ['trackId', 'fault', 'category', 'resolvedAt', 'resolvedBy']):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check for existing ticket
    existing = Ticket.query.filter_by(
        company_id=company.id,
        track_id=data['trackId'],
        fault=data['fault']
    ).first()

    if existing:
        existing.reason = data.get('reason')
        existing.category = data['category']
        existing.power_loss = data.get('powerLoss', 0)
        existing.predicted_loss = data.get('predictedLoss')
        existing.resolved_at = datetime.fromisoformat(data['resolvedAt'].replace('Z', '+00:00'))
        existing.resolved_by = data['resolvedBy']
        ticket = existing
    else:
        ticket = Ticket(
            company_id=company.id,
            track_id=data['trackId'],
            fault=data['fault'],
            reason=data.get('reason'),
            category=data['category'],
            power_loss=data.get('powerLoss', 0),
            predicted_loss=data.get('predictedLoss'),
            resolved_at=datetime.fromisoformat(data['resolvedAt'].replace('Z', '+00:00')),
            resolved_by=data['resolvedBy']
        )
        db.session.add(ticket)

    db.session.commit()

    return jsonify({'success': True, 'ticket': ticket.to_dict()})

@companies_bp.route('/companies/<company_id>/tickets', methods=['GET'])
def get_tickets(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    status = request.args.get('status')
    if status != 'resolved':
        return jsonify({'error': 'Unsupported status'}), 400

    tickets = Ticket.query.filter_by(company_id=company.id).all()
    return jsonify([t.to_dict() for t in tickets])

@companies_bp.route('/companies/<company_id>', methods=['DELETE'])
def delete_company(company_id):
    company = Company.query.filter_by(company_id=company_id).first()
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    db.session.delete(company)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Company deleted successfully'})

@companies_bp.route('/verify-super-admin-password', methods=['POST'])
def verify_super_admin_password():
    data = request.get_json()
    if not data or 'password' not in data:
        return jsonify({'error': 'Password required'}), 400

    # Simple check - in production, use secure method
    correct_password = 'super_admin_password'
    if data['password'] == correct_password:
        return jsonify({'success': True, 'message': 'Password verified successfully'})
    else:
        return jsonify({'success': False, 'error': 'Invalid password'}), 401
