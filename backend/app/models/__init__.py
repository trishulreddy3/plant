from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .company import Company
from .user import User
from .entry import Entry
from .ticket import Ticket
from .table import Table

__all__ = ['db', 'Company', 'User', 'Entry', 'Ticket', 'Table']
