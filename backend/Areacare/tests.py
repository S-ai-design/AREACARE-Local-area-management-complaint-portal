from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Address, category, complaint, user


class AuthenticationFlowTests(TestCase):
	def setUp(self):
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
