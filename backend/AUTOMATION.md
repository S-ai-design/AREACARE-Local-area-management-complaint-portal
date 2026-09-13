# Complaint automation

The backend owns SLA evaluation. Run this Django management command from the backend directory on a recurring Windows Task Scheduler task or cron job:

```powershell
python manage.py migrate
python manage.py run_complaint_automation
```

Run it at least hourly. The command is idempotent for each complaint breach: it sets `overdue_at`, creates a `ComplaintHistory` event, writes an `AutomationLog` entry, and creates an unread `AdminNotification` in one database transaction. The dashboard reads overdue and SLA-breached counts from `sla_due_at` and exposes the audit records in the complaint detail API.

New complaint deadlines are calculated from priority: high 24 hours, medium 72 hours, and low 120 hours. Existing complaints receive a deadline during migration `0007`.
