from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from Areacare.models import Address, category, complaint, user


COMPLAINTS = [
    ('Garbage not collected', 'Rahul Sharma', 'Ward 12', 'Main Road', 'HIGH', 'IN_PROGRESS', 'Amit Patil', '22 Sep 2026, 10:30 AM'),
    ('Streetlight not working', 'Priya Verma', 'Shanti Nagar', 'Shanti Nagar Road', 'MEDIUM', 'ASSIGNED', 'Neha Joshi', '22 Sep 2026, 9:15 AM'),
    ('Water leakage', 'Suresh Kumar', 'Gandhi Chowk', 'Gandhi Chowk Road', 'HIGH', 'IN_PROGRESS', 'Ravi Singh', '21 Sep 2026, 4:45 PM'),
    ('Pothole on road', 'Anjali Deshmukh', 'Station Road', 'Station Road', 'HIGH', 'SUBMITTED', 'Vijay More', '21 Sep 2026, 2:20 PM'),
    ('Illegal dumping', 'Kavita Rao', 'Market Area', 'Market Road', 'MEDIUM', 'UNDER_REVIEW', 'Pooja Kulkarni', '20 Sep 2026, 11:40 AM'),
    ('Broken footpath', 'Manish Gupta', 'Civil Lines', 'Civil Lines Road', 'LOW', 'ASSIGNED', 'Rohit Pawar', '19 Sep 2026, 3:30 PM'),
    ('Stray animal complaint', 'Sneha Joshi', 'Ganesh Nagar', 'Ganesh Nagar Road', 'MEDIUM', 'IN_PROGRESS', 'Nitin Wankhede', '19 Sep 2026, 12:15 PM'),
    ('Sewage overflow', 'Deepak Yadav', 'Laxmi Nagar', 'Laxmi Nagar Road', 'HIGH', 'ESCALATED', 'Arjun Thakur', '18 Sep 2026, 5:25 PM'),
    ('Noise complaint', 'Meena Shah', 'Central Market', 'Central Market Road', 'LOW', 'RESOLVED', 'Akash Desai', '18 Sep 2026, 8:00 PM'),
]


class Command(BaseCommand):
    help = 'Create the sample complaint queue shown in the admin dashboard.'

    def handle(self, *args, **options):
        created_count = 0
        for index, (title, name, area, road, priority, status, worker_name, updated_text) in enumerate(COMPLAINTS, start=1):
            email = f'demo-complainant-{index}@areacare.local'
            citizen, _ = user.objects.get_or_create(
                email=email,
                defaults={'name': name, 'contact': 9100000000 + index},
            )
            category_name = title.split()[0].lower()
            complaint_category, _ = category.objects.get_or_create(catego=category_name)
            address, _ = Address.objects.get_or_create(
                area=area,
                road=road,
                city='AreaCare City',
                pincode=110000 + index,
                state='Maharashtra',
            )
            updated_at = timezone.make_aware(datetime.strptime(updated_text, '%d %b %Y, %I:%M %p'))
            record, created = complaint.objects.get_or_create(
                complaint_title=title,
                User=citizen,
                defaults={
                    'Category': complaint_category,
                    'Address': address,
                    'decription': f'Demo complaint: {title}.',
                    'priority': priority,
                    'status': status,
                    'worker_name': worker_name,
                    'sla_due_at': updated_at,
                },
            )
            if not created:
                record.Category = complaint_category
                record.Address = address
                record.priority = priority
                record.status = status
                record.worker_name = worker_name
                record.save(update_fields=['Category', 'Address', 'priority', 'status', 'worker_name', 'updated_at'])
            complaint.objects.filter(pk=record.pk).update(created_at=updated_at, updated_at=updated_at)
            created_count += int(created)

        self.stdout.write(self.style.SUCCESS(f'Complaint seed complete. Created {created_count} new records; existing records were refreshed.'))
