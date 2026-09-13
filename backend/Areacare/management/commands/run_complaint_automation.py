from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from Areacare.models import AdminNotification, AutomationLog, ComplaintHistory, complaint


class Command(BaseCommand):
    help = 'Detect SLA breaches and persist escalation, notification, and audit records.'

    def handle(self, *args, **options):
        now = timezone.now()
        records = complaint.objects.filter(
            status__in=('SUBMITTED', 'IN_PROGRESS'),
            sla_due_at__isnull=False,
            sla_due_at__lte=now,
            overdue_at__isnull=True,
        )
        processed = 0
        for record in records:
            with transaction.atomic():
                record.overdue_at = now
                record.save(update_fields=['overdue_at', 'updated_at'])
                AutomationLog.objects.create(
                    complaint=record,
                    action='SLA_BREACHED',
                    details={'due_at': record.sla_due_at.isoformat(), 'status': record.status},
                )
                ComplaintHistory.objects.create(
                    complaint=record,
                    action='SLA_BREACHED',
                    details={'due_at': record.sla_due_at.isoformat()},
                )
                AdminNotification.objects.create(
                    complaint=record,
                    message=f'SLA breached for complaint {record.id}. Escalation required.',
                )
                processed += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {processed} SLA breach(es).'))
