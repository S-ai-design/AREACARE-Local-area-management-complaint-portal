from django.db import migrations


def backfill_history(apps, schema_editor):
    Complaint = apps.get_model('Areacare', 'complaint')
    History = apps.get_model('Areacare', 'ComplaintHistory')
    for record in Complaint.objects.all().iterator():
        if not History.objects.filter(complaint_id=record.id).exists():
            History.objects.create(
                complaint_id=record.id,
                action='SUBMITTED',
                to_status=record.status,
                details={'source': 'legacy_backfill'},
            )


class Migration(migrations.Migration):
    dependencies = [('Areacare', '0007_complaint_overdue_at_complaint_sla_due_at_and_more')]
    operations = [migrations.RunPython(backfill_history, migrations.RunPython.noop)]
