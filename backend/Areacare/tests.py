from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import Address, category, complaint, user


class AuthenticationFlowTests(TestCase):
	def setUp(self):
		cache.clear()
		self.admin = get_user_model().objects.create_superuser(
			username='admin', password='Admin-password-123', email='admin@example.com'
		)
		self.staff = get_user_model().objects.create_user(
			username='roads-staff', password='Staff-password-123', email='staff@example.com', is_staff=True
		)
		self.citizen = user.objects.create(name='Citizen One', email='citizen@example.com', contact=9876543210)
		self.other_citizen = user.objects.create(name='Citizen Two', email='other@example.com', contact=9876543211)
		complaint_category = category.objects.create(catego='roads')
		address = Address.objects.create(area='Area', road='Road', city='City', pincode=110001, state='State')
		self.record = complaint.objects.create(
			User=self.citizen,
			Category=complaint_category,
			Address=address,
			complaint_title='Broken streetlight',
			decription='The light is out.',
		)
		self.record.User = self.other_citizen
		self.other_record = complaint.objects.create(
			User=self.other_citizen,
			Category=complaint_category,
			Address=address,
			complaint_title='Other issue',
			decription='Not yours.',
		)
		self.record.User = self.citizen

	def test_each_login_accepts_only_its_role(self):
		admin_response = self.client.post(reverse('admin-login'), {'username': 'admin', 'password': 'Admin-password-123'}, content_type='application/json')
		self.assertEqual(admin_response.status_code, 200)
		self.assertEqual(self.client.get(reverse('auth-session')).json()['role'], 'admin')

		self.client.post(reverse('auth-logout'))
		staff_response = self.client.post(reverse('staff-login'), {'username': 'roads-staff', 'password': 'Staff-password-123'}, content_type='application/json')
		self.assertEqual(staff_response.status_code, 200)
		self.assertEqual(self.client.get(reverse('auth-session')).json()['role'], 'staff')

		self.client.post(reverse('auth-logout'))
		citizen_response = self.client.post(reverse('citizen-login'), {'email': 'citizen@example.com', 'phone': '9876543210'}, content_type='application/json')
		self.assertEqual(citizen_response.status_code, 200)
		self.assertEqual(self.client.get(reverse('auth-session')).json()['role'], 'citizen')

	def test_local_debug_admin_demo_login_accepts_arbitrary_nonempty_credentials(self):
		response = self.client.post(
			reverse('admin-login'),
			{'username': 'anything', 'password': 'anything'},
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.json()['demo_mode'])
		self.assertEqual(response.json()['redirect'], '/admin/dashboard')
		self.assertEqual(self.client.get(reverse('auth-session')).json()['role'], 'admin')
		self.assertEqual(self.client.get(reverse('admin-dashboard')).status_code, 200)

		complaint_url = reverse('complaint-detail', args=[f'CP-2026-{self.record.id:04d}'])
		self.assertEqual(self.client.get(complaint_url).status_code, 200)
		self.assertEqual(
			self.client.patch(
				complaint_url,
				{'status': 'RESOLVED'},
				content_type='application/json',
			).status_code,
			200,
		)

	@override_settings(DEBUG=False)
	def test_arbitrary_admin_credentials_are_rejected_when_debug_is_disabled(self):
		response = self.client.post(
			reverse('admin-login'),
			{'username': 'anything', 'password': 'anything'},
			content_type='application/json',
		)

		self.assertEqual(response.status_code, 401)
		self.assertNotIn('demo_mode', response.json())

	def test_arbitrary_admin_credentials_are_rejected_for_non_local_clients(self):
		response = self.client.post(
			reverse('admin-login'),
			{'username': 'anything', 'password': 'anything'},
			content_type='application/json',
			REMOTE_ADDR='203.0.113.1',
		)

		self.assertEqual(response.status_code, 401)
		self.assertNotIn('demo_mode', response.json())

	def test_wrong_role_and_unauthenticated_access_are_rejected(self):
		self.client.post(reverse('staff-login'), {'username': 'roads-staff', 'password': 'Staff-password-123'}, content_type='application/json')
		self.assertEqual(self.client.get(reverse('admin-dashboard')).status_code, 401)
		self.assertEqual(self.client.patch(reverse('complaint-detail', args=['CP-2026-0001']), {'status': 'RESOLVED'}, content_type='application/json').status_code, 403)

		self.client.post(reverse('auth-logout'))
		self.assertEqual(self.client.get(reverse('complaint-detail', args=[f'CP-2026-{self.record.id:04d}'])).status_code, 401)

	def test_citizen_can_only_view_owned_complaint_and_logout_expires_session(self):
		self.client.post(reverse('citizen-login'), {'email': 'citizen@example.com', 'phone': '9876543210'}, content_type='application/json')
		own_url = reverse('complaint-detail', args=[f'CP-2026-{self.record.id:04d}'])
		other_url = reverse('complaint-detail', args=[f'CP-2026-{self.other_record.id:04d}'])
		self.assertEqual(self.client.get(own_url).status_code, 200)
		self.assertEqual(self.client.get(other_url).status_code, 401)

		self.client.post(reverse('auth-logout'))
		self.assertEqual(self.client.get(reverse('auth-session')).status_code, 401)

	def test_staff_registration_flow(self):
		register_payload = {
			'fullName': 'Water Officer',
			'username': 'water-staff',
			'email': 'water@example.com',
			'phone': '9876543220',
			'department': 'water',
			'password': 'Staff-password-123',
		}
		response = self.client.post(reverse('staff-register'), register_payload, content_type='application/json')
		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.json()['message'], 'Staff account created successfully.')

		# Test login with the newly created staff
		login_response = self.client.post(reverse('staff-login'), {
			'username': 'water-staff',
			'password': 'Staff-password-123',
		}, content_type='application/json')
		self.assertEqual(login_response.status_code, 200)
		self.assertEqual(self.client.get(reverse('auth-session')).json()['role'], 'staff')

	def test_admin_login_rate_limiting_and_lockout(self):
		url = reverse('admin-login')
		# First 4 failed attempts should return 401 with attempt countdown warnings
		for attempt in range(1, 5):
			res = self.client.post(url, {'username': 'admin', 'password': 'wrong-password'}, content_type='application/json')
			self.assertEqual(res.status_code, 401)
			self.assertEqual(res.json()['attempts_left'], 5 - attempt)

		# 5th failed attempt should trigger 429 Too Many Requests
		fifth_res = self.client.post(url, {'username': 'admin', 'password': 'wrong-password'}, content_type='application/json')
		self.assertEqual(fifth_res.status_code, 429)
		self.assertTrue(fifth_res.json().get('lockout'))
		self.assertIn('Retry-After', fifth_res.headers)

		# Subsequent attempts during lockout (even with correct password) must be rejected with 429
		locked_res = self.client.post(url, {'username': 'admin', 'password': 'Admin-password-123'}, content_type='application/json')
		self.assertEqual(locked_res.status_code, 429)

	def test_successful_login_clears_failed_attempts(self):
		url = reverse('admin-login')
		# Fail 2 times
		self.client.post(url, {'username': 'admin', 'password': 'wrong-password'}, content_type='application/json')
		self.client.post(url, {'username': 'admin', 'password': 'wrong-password'}, content_type='application/json')

		# Correct login should succeed and clear attempts
		success_res = self.client.post(url, {'username': 'admin', 'password': 'Admin-password-123'}, content_type='application/json')
		self.assertEqual(success_res.status_code, 200)

		# Next failure should have full 4 attempts left (i.e. attempt 1 of 5)
		next_fail = self.client.post(url, {'username': 'admin', 'password': 'wrong-password'}, content_type='application/json')
		self.assertEqual(next_fail.status_code, 401)
		self.assertEqual(next_fail.json()['attempts_left'], 4)

	def test_citizen_login_rate_limiting(self):
		url = reverse('citizen-login')
		for _ in range(4):
			res = self.client.post(url, {'email': 'citizen@example.com', 'phone': '0000000000'}, content_type='application/json')
			self.assertEqual(res.status_code, 401)

		fifth_res = self.client.post(url, {'email': 'citizen@example.com', 'phone': '0000000000'}, content_type='application/json')
		self.assertEqual(fifth_res.status_code, 429)
		self.assertTrue(fifth_res.json().get('lockout'))

	def test_staff_login_rate_limiting(self):
		url = reverse('staff-login')
		for _ in range(4):
			res = self.client.post(url, {'username': 'roads-staff', 'password': 'wrong-password'}, content_type='application/json')
			self.assertEqual(res.status_code, 401)

		fifth_res = self.client.post(url, {'username': 'roads-staff', 'password': 'wrong-password'}, content_type='application/json')
		self.assertEqual(fifth_res.status_code, 429)
		self.assertTrue(fifth_res.json().get('lockout'))
