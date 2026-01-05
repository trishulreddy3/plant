# Login service - integrates login_check.py functionality
from ..models import db, Company, User

def check_login_credentials(email, password, company_name):
    """
    Check login credentials against stored data.
    """
    try:
        # Find company by name
        company = Company.query.filter_by(company_name=company_name).first()
        if not company:
            return {'valid': False, 'user': None, 'message': 'Company not found'}

        # Find user by email and company
        user = User.query.filter_by(email=email, company_id=company.id).first()
        if not user or not user.verify_password(password):
            return {'valid': False, 'user': None, 'message': 'Invalid credentials'}

        # Return user data
        return {
            'valid': True,
            'user': {
                'id': f"{user.role}-{company.company_id}",
                'email': user.email,
                'role': user.role if user.role != 'admin' else 'plant_admin',
                'name': user.name,
                'companyName': company.company_name,
                'companyId': company.company_id
            }
        }
    except Exception as e:
        return {'valid': False, 'user': None, 'message': str(e)}
