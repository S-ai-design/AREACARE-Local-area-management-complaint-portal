from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('Areacare', '0008_backfill_complaint_history'),
    ]

    operations = [
        migrations.AlterField(
            model_name='complaint',
            name='status',
            field=models.CharField(
                choices=[
                    ('SUBMITTED', 'Submitted'),
                    ('ASSIGNED', 'Assigned'),
                    ('IN_PROGRESS', 'In Progress'),
                    ('UNDER_REVIEW', 'Under Review'),
                    ('ESCALATED', 'Escalated'),
                    ('RESOLVED', 'Resolved'),
                    ('CLOSED', 'Closed'),
                    ('REJECTED', 'Rejected'),
                ],
                default='SUBMITTED',
                max_length=20,
            ),
        ),
    ]
