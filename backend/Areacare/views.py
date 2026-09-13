import re

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Address, AdminNotification, ComplaintHistory, FieldStaff, category, complaint, user

SLA_HOURS = {'LOW': 120, 'MEDIUM': 72, 'HIGH': 24}

def record_history(record, action, actor=None, from_status='', to_status='', details=None):
	ComplaintHistory.objects.create(complaint=record, action=action, actor=actor,
		from_status=from_status, to_status=to_status, details=details or {})


def department_category_terms(department):
	department_categories = {
		'roads': ['roads', 'pothole', 'road'],
		'water': ['water', 'drainage'],
		'electricity': ['streetlight', 'street light', 'electricity'],
		'waste': ['waste', 'garbage'],
		'parks': ['park', 'public space'],
	}
	return department_categories.get(department.lower(), [department.lower()])


def require_staff(request):
	return request.user.is_authenticated and request.user.is_staff and not request.user.is_superuser


def require_admin(request):
	return request.user.is_authenticated and request.user.is_superuser


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def auth_session(request):
	if request.user.is_authenticated:
		role = 'admin' if request.user.is_superuser else 'staff' if request.user.is_staff else None
		if role:
			return Response({'authenticated': True, 'role': role, 'username': request.user.get_username()})
	citizen_id = request.session.get('citizen_id')
	if citizen_id:
		try:
			citizen = user.objects.get(id=citizen_id, is_action=True)
			return Response({'authenticated': True, 'role': 'citizen', 'username': citizen.name})
		except user.DoesNotExist:
			request.session.flush()
	return Response({'authenticated': False}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def auth_logout(request):
	logout(request)
	request.session.flush()
	return Response({'message': 'Signed out successfully.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def admin_login(request):
	username = str(request.data.get('username', '')).strip()
	password = request.data.get('password', '')

	if not username or not isinstance(password, str) or not password:
		return Response(
			{'error': 'Username and password are required.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	user = authenticate(request, username=username, password=password)
	if user is None and '@' in username:
		from django.contrib.auth import get_user_model

		account = get_user_model().objects.filter(email__iexact=username).first()
		if account is not None:
			user = authenticate(request, username=account.get_username(), password=password)

	if user is None or not user.is_superuser:
		return Response(
			{'error': 'Invalid superuser credentials.'},
			status=status.HTTP_401_UNAUTHORIZED,
		)

	request.session.pop('citizen_id', None)
	login(request, user)
	return Response(
		{'message': 'Admin login successful.'},
		status=status.HTTP_200_OK,
	)


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_register(request):
	data = request.data
	username = str(data.get('username', '')).strip()
	password = data.get('password', '')
	name = str(data.get('fullName', '')).strip()
	department = str(data.get('department', '')).strip()
	phone_digits = re.sub(r'\D', '', str(data.get('phone', '')))
	if not all([username, password, name, department, phone_digits]):
		return Response({'error': 'All staff registration fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
	if get_user_model().objects.filter(username=username).exists():
		return Response({'error': 'Username already exists.'}, status=status.HTTP_409_CONFLICT)
	if data.get('email') and get_user_model().objects.filter(email__iexact=data['email'].strip()).exists():
		return Response({'error': 'Email already exists.'}, status=status.HTTP_409_CONFLICT)
	try:
		phone = int(phone_digits)
		if FieldStaff.objects.filter(phone=phone).exists():
			return Response({'error': 'Phone number already exists.'}, status=status.HTTP_409_CONFLICT)
		with transaction.atomic():
			account = get_user_model().objects.create_user(username=username, email=data.get('email', '').strip(), password=password, first_name=name)
			account.is_staff = True
			account.save(update_fields=['is_staff'])
			FieldStaff.objects.create(account=account, full_name=name, phone=phone, department=department)
	except Exception:
		return Response({'error': 'Staff account could not be created.'}, status=status.HTTP_400_BAD_REQUEST)
	return Response({'message': 'Staff account created successfully.'}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def staff_login(request):
	login_id = str(request.data.get('username', '')).strip()
	password = request.data.get('password', '')
	if not login_id or not isinstance(password, str) or not password:
		return Response({'error': 'Username/email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

	account = authenticate(request, username=login_id, password=password)
	if account is None and '@' in login_id:
		account = get_user_model().objects.filter(email__iexact=login_id, is_active=True).first()
		if account is not None:
			account = authenticate(request, username=account.get_username(), password=password)
	if account is None or not account.is_staff or account.is_superuser:
		return Response({'error': 'Invalid staff credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
	request.session.pop('citizen_id', None)
	login(request, account)
	return Response({'message': 'Staff login successful.', 'username': account.get_username()}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_complaint(request):
	data = request.data
	required_fields = [
		'title', 'category', 'area', 'road', 'city', 'pincode',
		'state', 'description', 'name', 'phone',
	]
	missing_fields = [field for field in required_fields if not str(data.get(field, '')).strip()]
	if missing_fields:
		return Response(
			{'error': 'Required fields are missing.', 'fields': missing_fields},
			status=status.HTTP_400_BAD_REQUEST,
		)

	try:
		pincode = int(data['pincode'])
		phone_digits = re.sub(r'\D', '', str(data['phone']))
		if not phone_digits:
			raise ValueError
		contact = int(phone_digits)
	except (TypeError, ValueError):
		return Response(
			{'error': 'Pincode and phone number must contain only numbers.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	priority = {'normal': 'MEDIUM', 'high': 'HIGH', 'critical': 'HIGH'}.get(
		data.get('urgency', 'normal'), 'MEDIUM'
	)

	try:
		with transaction.atomic():
			citizen, created = user.objects.get_or_create(
				email=data['email'].strip() if data.get('email') else f'{contact}@citizen.local',
				defaults={'name': data['name'].strip(), 'contact': contact},
			)
			if not created:
				citizen.name = data['name'].strip()
				citizen.contact = contact
				citizen.save(update_fields=['name', 'contact', 'updated_at'])

			complaint_category, _ = category.objects.get_or_create(
				catego=data['category'].strip()
			)
			address = Address.objects.create(
				area=data['area'].strip(),
				road=data['road'].strip(),
				city=data['city'].strip(),
				pincode=pincode,
				state=data['state'].strip(),
			)
			record = complaint.objects.create(
				User=citizen,
				Category=complaint_category,
				Address=address,
				complaint_title=data['title'].strip(),
				decription=data['description'].strip(),
				priority=priority,
				sla_due_at=timezone.now() + timedelta(hours=SLA_HOURS[priority]),
			)
			record_history(record, 'SUBMITTED', details={'source': 'citizen'})
	except Exception:
		return Response(
			{'error': 'The complaint could not be saved.'},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR,
		)

	return Response(
		{
			'message': 'Complaint submitted successfully.',
			'complaint_id': f'CP-{record.created_at.year}-{record.id:04d}',
		},
		status=status.HTTP_201_CREATED,
	)


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def citizen_login(request):
	email = str(request.data.get('email', '')).strip()
	phone_digits = re.sub(r'\D', '', str(request.data.get('phone', '')))
	if not email or not phone_digits:
		return Response({'error': 'Email and phone number are required.'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		citizen = user.objects.get(email__iexact=email, contact=int(phone_digits), is_action=True)
	except (user.DoesNotExist, ValueError):
		return Response({'error': 'No citizen account matches these details.'}, status=status.HTTP_401_UNAUTHORIZED)

	logout(request)
	request.session['citizen_id'] = citizen.id
	request.session.set_expiry(60 * 60 * 24)
	return Response({'message': 'Citizen login successful.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_complaints(request):
	if not request.user.is_authenticated or not request.user.is_staff or request.user.is_superuser:
		return Response({'error': 'Staff authorization required.'}, status=status.HTTP_401_UNAUTHORIZED)

	try:
		staff_profile = request.user.field_staff_profile
	except FieldStaff.DoesNotExist:
		return Response({'error': 'Staff profile not found.'}, status=status.HTTP_403_FORBIDDEN)

	category_terms = department_category_terms(staff_profile.department)
	records = complaint.objects.select_related('User', 'Category', 'Address').filter(
		Category__catego__iregex='|'.join(category_terms)
	).order_by('-created_at')
	complaints = [
		{
			'id': f'CP-{record.created_at.year}-{record.id:04d}',
			'title': record.complaint_title,
			'category': record.Category.catego,
			'detail': 'Citizen complaint',
			'ward': record.Address.city,
			'priority': record.priority,
			'status': record.status,
			'upvotes': 0,
		}
		for record in records
	]
	return Response({'complaints': complaints}, status=status.HTTP_200_OK)


def complaint_payload(record):
	now = timezone.now()
	is_open = record.status not in ('RESOLVED', 'CLOSED', 'REJECTED')
	overdue = bool(record.sla_due_at and is_open and record.sla_due_at <= now)
	return {
		'id': f'CP-{record.created_at.year}-{record.id:04d}',
		'title': record.complaint_title,
		'category': record.Category.catego,
		'complainant': record.User.name,
		'contact': str(record.User.contact),
		'location': f'{record.Address.area}, {record.Address.road}, {record.Address.city}',
		'created_at': record.created_at.strftime('%d %b %Y, %I:%M %p'),
		'priority': record.priority,
		'status': record.status,
		'assigned_staff': record.worker_name or 'Unassigned',
		'last_updated': record.updated_at.strftime('%d %b %Y, %I:%M %p'),
		'expected_resolution': record.sla_due_at.strftime('%d %b %Y, %I:%M %p') if record.sla_due_at else None,
		'sla_due_at': record.sla_due_at.isoformat() if record.sla_due_at else None,
		'overdue': overdue,
		'sla_breached': overdue,
		'description': record.decription,
	}


@api_view(['GET'])
@ensure_csrf_cookie
def admin_dashboard(request):
	if not require_admin(request):
		return Response({'error': 'Administrator authorization required.'}, status=status.HTTP_401_UNAUTHORIZED)

	records = complaint.objects.select_related('User', 'Category', 'Address').all()
	query = str(request.query_params.get('search', '')).strip()
	status_filter = str(request.query_params.get('status', '')).strip().upper()
	priority_filter = str(request.query_params.get('priority', '')).strip().upper()
	category_filter = str(request.query_params.get('category', '')).strip()
	location_filter = str(request.query_params.get('location', '')).strip()
	staff_filter = str(request.query_params.get('staff', '')).strip()
	date_from = str(request.query_params.get('date_from', '')).strip()
	date_to = str(request.query_params.get('date_to', '')).strip()
	sort = str(request.query_params.get('sort', '-created_at')).strip()
	overdue_filter = request.query_params.get('overdue') == '1'
	if query:
		records = records.filter(Q(complaint_title__icontains=query) | Q(User__name__icontains=query) | Q(User__email__icontains=query) | Q(Address__city__icontains=query))
	if status_filter:
		records = records.filter(status=status_filter)
	if priority_filter:
		records = records.filter(priority=priority_filter)
	if category_filter:
		records = records.filter(Category__catego__icontains=category_filter)
	if location_filter:
		records = records.filter(Address__city__icontains=location_filter)
	if staff_filter:
		records = records.filter(worker_name__icontains=staff_filter)
	if date_from:
		records = records.filter(created_at__date__gte=date_from)
	if date_to:
		records = records.filter(created_at__date__lte=date_to)
	if overdue_filter:
		records = records.filter(status__in=('SUBMITTED', 'IN_PROGRESS'), sla_due_at__isnull=False, sla_due_at__lte=timezone.now())

	allowed_sorts = {'created_at', '-created_at', 'updated_at', '-updated_at', 'sla_due_at', '-sla_due_at', 'priority', '-priority'}
	rows = [complaint_payload(record) for record in records.order_by(sort if sort in allowed_sorts else '-created_at')]
	all_records = complaint.objects.all()
	now = timezone.now()
	open_records = all_records.exclude(status__in=('RESOLVED', 'CLOSED', 'REJECTED'))
	overdue_records = open_records.filter(sla_due_at__isnull=False, sla_due_at__lte=now)
	counts = {key: all_records.filter(status=value).count() for key, value in (
		('new', 'SUBMITTED'), ('in_progress', 'IN_PROGRESS'), ('resolved', 'RESOLVED'),
		('closed', 'CLOSED'), ('rejected', 'REJECTED'),
	)}
	assigned = all_records.exclude(worker_name='').count()
	category_data = list(all_records.values('Category__catego').annotate(count=Count('id')).order_by('-count'))
	priority_data = list(all_records.values('priority').annotate(count=Count('id')).order_by('-count'))
	status_data = list(all_records.values('status').annotate(count=Count('id')).order_by('-count'))
	staff_data = []
	for staff in get_user_model().objects.filter(is_staff=True, is_superuser=False).order_by('first_name', 'username'):
		staff_records = all_records.filter(worker_name__iexact=staff.get_full_name() or staff.username)
		staff_overdue = staff_records.filter(status__in=('SUBMITTED', 'IN_PROGRESS'), sla_due_at__isnull=False, sla_due_at__lte=now)
		staff_data.append({
			'name': staff.get_full_name() or staff.username,
			'total': staff_records.count(),
			'pending': staff_records.filter(status='SUBMITTED').count(),
			'in_progress': staff_records.filter(status='IN_PROGRESS').count(),
			'resolved': staff_records.filter(status='RESOLVED').count(),
			'closed': staff_records.filter(status='CLOSED').count(),
			'overdue': staff_overdue.count(), 'sla_breached': staff_overdue.count(), 'unresolved': staff_records.exclude(status__in=('RESOLVED', 'CLOSED', 'REJECTED')).count(),
		})
	return Response({
		'complaints': rows,
		'filters': {
			'categories': list(all_records.values_list('Category__catego', flat=True).distinct().order_by('Category__catego')),
			'locations': list(all_records.values_list('Address__city', flat=True).distinct().order_by('Address__city')),
			'staff': [item['name'] for item in staff_data],
		},
		'summary': {
			'total': all_records.count(), 'new': counts['new'], 'assigned': assigned,
			'in_progress': counts['in_progress'], 'resolved': counts['resolved'],
			'closed': counts['closed'], 'rejected': counts['rejected'], 'overdue': overdue_records.count(),
			'sla_breached': overdue_records.count(), 'unresolved': open_records.count(),
			'high_priority': all_records.filter(priority='HIGH').count(),
		},
		'analytics': {'status': status_data, 'category': category_data, 'priority': priority_data},
		'notifications': list(AdminNotification.objects.filter(is_read=False).values('id', 'complaint_id', 'message', 'created_at')[:20]),
		'staff_performance': staff_data,
	}, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
@transaction.atomic
def complaint_detail(request, complaint_id):
	if request.method == 'PATCH' and not (require_staff(request) or require_admin(request)):
		return Response({'error': 'Staff authorization required.'}, status=status.HTTP_401_UNAUTHORIZED)

	try:
		record_id = int(complaint_id.rsplit('-', 1)[-1])
		record = complaint.objects.select_related('Category', 'Address', 'User').get(id=record_id)
	except (ValueError, complaint.DoesNotExist):
		return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

	if request.user.is_staff and not request.user.is_superuser:
		try:
			staff_profile = request.user.field_staff_profile
		except FieldStaff.DoesNotExist:
			return Response({'error': 'Staff profile not found.'}, status=status.HTTP_403_FORBIDDEN)
		category_terms = department_category_terms(staff_profile.department)
		if not any(term in record.Category.catego.lower() for term in category_terms):
			return Response({'error': 'This complaint belongs to another department.'}, status=status.HTTP_403_FORBIDDEN)
	if request.method == 'GET':
		if require_admin(request) or require_staff(request):
			pass
		elif request.session.get('citizen_id') == record.User_id:
			pass
		else:
			return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

	if request.method == 'PATCH':
		new_status = request.data.get('status')
		valid_statuses = dict(complaint.STATUS_CHOICES)
		new_priority = request.data.get('priority')
		worker_name = request.data.get('worker_name')
		worker_phone = request.data.get('worker_phone')
		if new_status is not None and new_status not in valid_statuses:
			return Response({'error': 'Invalid complaint status.'}, status=status.HTTP_400_BAD_REQUEST)
		if new_priority is not None and new_priority not in dict(complaint.PRIORITY_CHOICES):
			return Response({'error': 'Invalid complaint priority.'}, status=status.HTTP_400_BAD_REQUEST)
		old_status = record.status
		old_priority = record.priority
		old_worker = record.worker_name
		if new_status is not None:
			record.status = new_status
		if new_priority is not None:
			record.priority = new_priority
		if worker_name is not None:
			record.worker_name = str(worker_name).strip()
		if worker_phone is not None:
			phone_digits = re.sub(r'\D', '', str(worker_phone))
			record.worker_phone = int(phone_digits) if phone_digits else None
		if new_status == 'RESOLVED':
			from django.utils import timezone

			record.Solved_at = timezone.now()
		elif new_status is not None:
			record.Solved_at = None
		record.save(update_fields=['status', 'priority', 'Solved_at', 'worker_name', 'worker_phone', 'updated_at'])
		if old_status != record.status:
			record_history(record, 'STATUS_CHANGED', request.user, old_status, record.status)
		if old_priority != record.priority:
			record_history(record, 'PRIORITY_CHANGED', request.user, details={'from': old_priority, 'to': record.priority})
		if old_worker != record.worker_name:
			record_history(record, 'ASSIGNED', request.user, details={'from': old_worker, 'to': record.worker_name})

	return Response({
		'id': f'CP-{record.created_at.year}-{record.id:04d}',
		'title': record.complaint_title,
		'category': record.Category.catego,
		'description': record.decription,
		'priority': record.priority,
		'status': record.status,
		'address': f'{record.Address.area}, {record.Address.road}, {record.Address.city}, {record.Address.pincode}, {record.Address.state}',
		'created_at': record.created_at.strftime('%d %b %Y, %I:%M %p'),
		'worker_name': record.worker_name,
		'worker_phone': str(record.worker_phone) if record.worker_phone else '',
		'sla_due_at': record.sla_due_at.isoformat() if record.sla_due_at else None,
		'overdue': bool(record.sla_due_at and record.status not in ('RESOLVED', 'CLOSED', 'REJECTED') and record.sla_due_at <= timezone.now()),
		'history': [{'action': item.action, 'from_status': item.from_status, 'to_status': item.to_status, 'details': item.details, 'actor': item.actor.get_username() if item.actor else 'System', 'created_at': item.created_at.strftime('%d %b %Y, %I:%M %p')} for item in record.history.select_related('actor').all()],
		'automation_logs': [{'action': item.action, 'details': item.details, 'created_at': item.created_at.strftime('%d %b %Y, %I:%M %p')} for item in record.automation_logs.all()],
	}, status=status.HTTP_200_OK)
