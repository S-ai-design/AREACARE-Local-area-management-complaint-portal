import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Address, AdminNotification, ComplaintHistory, FieldStaff, category, complaint, user
from .rate_limit import (
	check_login_rate_limit,
	clear_login_attempts,
	failed_attempt_response,
	lockout_response,
	record_failed_attempt,
)

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


def is_local_demo_request(request):
	host = request.get_host().split(':', 1)[0].lower()
	client_ip = request.META.get('REMOTE_ADDR')
	return (
		settings.DEBUG
		and host in {'localhost', '127.0.0.1', 'testserver'}
		and client_ip in {'127.0.0.1', '::1'}
	)


def is_local_demo_admin(request):
	return is_local_demo_request(request) and request.session.get('areacare_demo_admin') is True


def require_admin(request):
	return (request.user.is_authenticated and request.user.is_superuser) or is_local_demo_admin(request)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def auth_session(request):
	if is_local_demo_admin(request):
		return Response({
			'authenticated': True,
			'role': 'admin',
			'username': request.session.get('areacare_demo_username', 'Local demo admin'),
		})
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


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def admin_login(request):
	if request.method == 'GET':
		# GET is used only to set the CSRF cookie; return 200
		return Response({'detail': 'CSRF cookie set.'}, status=status.HTTP_200_OK)
	username = str(request.data.get('username', '')).strip()
	password = request.data.get('password', '')

	if not username or not isinstance(password, str) or not password:
		return Response(
			{'error': 'Username and password are required.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if is_local_demo_request(request):
		logout(request)
		request.session['areacare_demo_admin'] = True
		request.session['areacare_demo_username'] = username
		clear_login_attempts(request, username, 'admin')
		return Response(
			{
				'message': 'Local demo login successful.',
				'authenticated': True,
				'role': 'admin',
				'redirect': '/admin/dashboard',
				'username': username,
				'demo_mode': True,
			},
			status=status.HTTP_200_OK,
		)

	is_locked, remaining = check_login_rate_limit(request, username, 'admin')
	if is_locked:
		return lockout_response(remaining)

	account = authenticate(request, username=username, password=password)
	if account is None:
		from django.contrib.auth import get_user_model
		account_obj = (
			get_user_model().objects.filter(username__iexact=username, is_active=True).first()
			or get_user_model().objects.filter(email__iexact=username, is_active=True).first()
		)
		if account_obj is not None:
			account = authenticate(request, username=account_obj.get_username(), password=password)

	if account is None or not (account.is_superuser or account.is_staff):
		is_locked, remaining, attempts_left = record_failed_attempt(request, username, 'admin')
		if is_locked:
			return lockout_response(remaining)
		return failed_attempt_response(attempts_left, 'Invalid credentials.')

	clear_login_attempts(request, username, 'admin')
	request.session.pop('citizen_id', None)
	login(request, account)
	if account.is_superuser:
		request.session.set_expiry(365 * 24 * 60 * 60)  # 1 year — admin stays logged in indefinitely
		return Response(
			{
				'message': 'Admin login successful.',
				'authenticated': True,
				'role': 'admin',
				'redirect': '/admin/dashboard',
				'username': account.get_username(),
			},
			status=status.HTTP_200_OK,
		)
	else:
		return Response(
			{
				'message': 'Staff login successful. Redirecting to staff dashboard...',
				'authenticated': True,
				'role': 'staff',
				'redirect': '/staff/dashboard',
				'username': account.get_username(),
			},
			status=status.HTTP_200_OK,
		)


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
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
	except Exception as exc:
		return Response({'error': f'Staff account could not be created: {str(exc)}'}, status=status.HTTP_400_BAD_REQUEST)
	return Response({'message': 'Staff account created successfully.'}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def staff_login(request):
	login_id = str(request.data.get('username', '')).strip()
	password = request.data.get('password', '')
	if not login_id or not isinstance(password, str) or not password:
		return Response({'error': 'Username/email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

	is_locked, remaining = check_login_rate_limit(request, login_id, 'staff')
	if is_locked:
		return lockout_response(remaining)

	account = authenticate(request, username=login_id, password=password)
	if account is None:
		from django.contrib.auth import get_user_model
		account_obj = (
			get_user_model().objects.filter(username__iexact=login_id, is_active=True).first()
			or get_user_model().objects.filter(email__iexact=login_id, is_active=True).first()
		)
		if account_obj is not None:
			account = authenticate(request, username=account_obj.get_username(), password=password)

	if account is None or not (account.is_staff or account.is_superuser):
		is_locked, remaining, attempts_left = record_failed_attempt(request, login_id, 'staff')
		if is_locked:
			return lockout_response(remaining)
		return failed_attempt_response(attempts_left, 'Invalid staff credentials.')

	clear_login_attempts(request, login_id, 'staff')
	request.session.pop('citizen_id', None)
	request.session.pop('areacare_demo_admin', None)
	request.session.pop('areacare_demo_username', None)
	login(request, account)
	if account.is_superuser:
		request.session.set_expiry(365 * 24 * 60 * 60)
		return Response(
			{
				'message': 'Admin login successful. Redirecting to admin dashboard...',
				'authenticated': True,
				'role': 'admin',
				'redirect': '/admin/dashboard',
				'username': account.get_username(),
			},
			status=status.HTTP_200_OK,
		)
	return Response(
		{
			'message': 'Staff login successful.',
			'authenticated': True,
			'role': 'staff',
			'redirect': '/staff/dashboard',
			'username': account.get_username(),
		},
		status=status.HTTP_200_OK,
	)


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def create_complaint(request):
	data = request.data
	required_fields = [
		'title', 'category', 'area', 'road', 'city', 'pincode',
		'state', 'description', 'name', 'email', 'password',
	]
	missing_fields = [field for field in required_fields if not str(data.get(field, '')).strip()]
	if missing_fields:
		return Response(
			{'error': f'Required fields are missing: {", ".join(missing_fields)}.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	pincode_raw = re.sub(r'\D', '', str(data.get('pincode', '')))
	if not pincode_raw:
		return Response({'error': 'Pincode must contain valid numbers.'}, status=status.HTTP_400_BAD_REQUEST)
	pincode = int(pincode_raw)

	lat_val = data.get('latitude')
	lon_val = data.get('longitude')
	try:
		latitude = float(lat_val) if lat_val not in (None, '', 'null', 'undefined') else None
	except (ValueError, TypeError):
		latitude = None

	try:
		longitude = float(lon_val) if lon_val not in (None, '', 'null', 'undefined') else None
	except (ValueError, TypeError):
		longitude = None

	password = str(data.get('password', '')).strip()
	if not password:
		return Response({'error': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)

	priority = {'normal': 'MEDIUM', 'high': 'HIGH', 'critical': 'HIGH'}.get(
		str(data.get('urgency', 'normal')).lower(), 'MEDIUM'
	)

	image_file = request.FILES.get('image')

	try:
		with transaction.atomic():
			email_clean = str(data['email']).strip().lower()
			name_clean = str(data['name']).strip()
			citizen = user.objects.filter(email__iexact=email_clean).first()
			if citizen is None:
				citizen = user.objects.create(
					email=email_clean,
					name=name_clean,
					password=make_password(password),
					is_action=True,
				)
			else:
				citizen.name = name_clean
				citizen.password = make_password(password)
				citizen.save(update_fields=['name', 'password', 'updated_at'])

			cat_name = str(data['category']).strip().lower()
			complaint_category, _ = category.objects.get_or_create(
				catego=cat_name,
				defaults={'is_action': True}
			)

			address = Address.objects.create(
				area=str(data['area']).strip(),
				road=str(data['road']).strip(),
				city=str(data['city']).strip(),
				pincode=pincode,
				state=str(data['state']).strip(),
				latitude=latitude,
				longitude=longitude,
				is_action=True,
			)

			record = complaint.objects.create(
				User=citizen,
				Category=complaint_category,
				Address=address,
				complaint_title=str(data['title']).strip(),
				decription=str(data['description']).strip(),
				priority=priority,
				sla_due_at=timezone.now() + timedelta(hours=SLA_HOURS.get(priority, 72)),
				image=image_file if image_file else None,
				is_action=True,
			)
			record_history(record, 'SUBMITTED', details={'source': 'citizen'})
	except Exception as exc:
		return Response(
			{'error': f'The complaint could not be saved: {str(exc)}'},
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
	password = str(request.data.get('password', ''))
	phone_digits = re.sub(r'\D', '', str(request.data.get('phone', '')))
	if not email or (not password and not phone_digits):
		return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

	ident = f'{email}:password'
	is_locked, remaining = check_login_rate_limit(request, ident, 'citizen')
	if is_locked:
		return lockout_response(remaining)

	try:
		citizen = user.objects.get(email__iexact=email, is_action=True)
		if password and not check_password(password, citizen.password):
			raise user.DoesNotExist
		if not password and citizen.contact != int(phone_digits):
			raise user.DoesNotExist
	except (user.DoesNotExist, ValueError):
		is_locked, remaining, attempts_left = record_failed_attempt(request, ident, 'citizen')
		if is_locked:
			return lockout_response(remaining)
		return failed_attempt_response(attempts_left, 'No citizen account matches these details.')

	clear_login_attempts(request, ident, 'citizen')
	logout(request)
	request.session['citizen_id'] = citizen.id
	request.session.set_expiry(60 * 60 * 24)
	return Response({'message': 'Citizen login successful.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def list_complaints(request):
	if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
		return Response({'error': 'Staff authorization required.'}, status=status.HTTP_401_UNAUTHORIZED)

	staff_profile = None
	if request.user.is_staff and not request.user.is_superuser:
		try:
			staff_profile = request.user.field_staff_profile
		except FieldStaff.DoesNotExist:
			staff_profile = None

	filter_dept = request.query_params.get('department', '').strip()
	show_all = request.query_params.get('all') == '1' or request.user.is_superuser or not staff_profile or (filter_dept.lower() == 'all')

	records = complaint.objects.select_related('User', 'Category', 'Address').all()

	if not show_all and staff_profile:
		dept_to_filter = filter_dept if filter_dept else staff_profile.department
		category_terms = department_category_terms(dept_to_filter)
		records = records.filter(Category__catego__iregex='|'.join(category_terms))

	records = records.order_by('-created_at')
	complaints = [
		{
			'id': f'CP-{record.created_at.year}-{record.id:04d}',
			'title': record.complaint_title,
			'category': record.Category.catego if record.Category else 'General',
			'detail': record.decription or 'Citizen complaint',
			'ward': record.Address.city if record.Address else '-',
			'location': f'{record.Address.area}, {record.Address.road}, {record.Address.city}' if record.Address else '-',
			'priority': record.priority,
			'status': record.status,
			'upvotes': 0,
			'assigned_staff': record.worker_name or 'Unassigned',
			'worker_name': record.worker_name or '',
			'worker_phone': str(record.worker_phone) if record.worker_phone else '',
			'complainant': record.User.name if record.User else 'Citizen',
			'contact': str(record.User.contact) if record.User else '',
			'created_at': record.created_at.strftime('%d %b %Y, %I:%M %p'),
			'expected_resolution': record.sla_due_at.strftime('%d %b %Y, %I:%M %p') if record.sla_due_at else None,
			'image': record.image.url if record.image else None,
		}
		for record in records
	]
	return Response({
		'complaints': complaints,
		'total': len(complaints),
		'staff_info': {
			'username': request.user.get_username(),
			'name': request.user.get_full_name() or (staff_profile.full_name if staff_profile else request.user.get_username()),
			'department': staff_profile.department if staff_profile else ('All Departments' if request.user.is_superuser else 'General'),
			'is_admin': request.user.is_superuser,
		}
	}, status=status.HTTP_200_OK)


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
@permission_classes([AllowAny])
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
		records = records.filter(status__in=('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'), sla_due_at__isnull=False, sla_due_at__lte=timezone.now())

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
		staff_overdue = staff_records.filter(status__in=('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'), sla_due_at__isnull=False, sla_due_at__lte=now)
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
	if request.method == 'PATCH':
		if is_local_demo_admin(request) or request.user.is_superuser:
			pass
		elif not request.user.is_authenticated:
			return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
		elif request.user.is_staff:
			try:
				request.user.field_staff_profile
			except FieldStaff.DoesNotExist:
				return Response({'error': 'Staff authorization required.'}, status=status.HTTP_403_FORBIDDEN)
		else:
			return Response({'error': 'Staff authorization required.'}, status=status.HTTP_403_FORBIDDEN)

	try:
		record_id = int(complaint_id.rsplit('-', 1)[-1])
		record = complaint.objects.select_related('Category', 'Address', 'User').get(id=record_id)
	except (ValueError, complaint.DoesNotExist):
		return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

	if request.user.is_staff and not request.user.is_superuser:
		try:
			staff_profile = request.user.field_staff_profile
		except FieldStaff.DoesNotExist:
			staff_profile = None
	if request.method == 'GET':
		citizen_id = request.session.get('citizen_id')
		if citizen_id:
			if str(record.User_id) != str(citizen_id):
				return Response({'error': 'You do not have access to this complaint.'}, status=status.HTTP_401_UNAUTHORIZED)
		elif is_local_demo_admin(request):
			pass
		elif request.user.is_authenticated:
			if not (request.user.is_staff or request.user.is_superuser):
				return Response({'error': 'Unauthorized access.'}, status=status.HTTP_401_UNAUTHORIZED)
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
