from django.db import models
from django.contrib.auth.models import User as AuthUser

class TimeStumpedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
class user(TimeStumpedModel):
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, unique=True)
    contact = models.BigIntegerField()
    is_action = models.BooleanField(default=True)
    def __str__(self):
        return f"{self.name} - {self.email} - {self.contact}"
    
class category(TimeStumpedModel):
    catego = models.CharField(max_length=100)
    is_action = models.BooleanField(default=True)
    def __str__(self):
        return self.catego

class Address(TimeStumpedModel):
    area = models.CharField(max_length=500)
    road = models.CharField(max_length=500)
    city = models.CharField(max_length=500)
    pincode = models.IntegerField()
    state =models.CharField(max_length=500)
    is_action = models.BooleanField(default=True)
    def __str__(self):
        return f"{self.area} - {self.road} - {self.city} - {self.pincode} - {self.state}"

class FieldStaff(TimeStumpedModel):
    account = models.OneToOneField(AuthUser, on_delete=models.CASCADE, related_name='field_staff_profile')
    full_name = models.CharField(max_length=100, default='')
    phone = models.BigIntegerField()
    department = models.CharField(max_length=100)
    is_action = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.account.get_full_name() or self.account.username} - {self.department}"
    
class complaint(TimeStumpedModel):
    User = models.ForeignKey(user, on_delete=models.CASCADE)
    Category = models.ForeignKey(category, on_delete=models.CASCADE)
    Address = models.ForeignKey(Address, on_delete=models.CASCADE)
    complaint_at = models.DateTimeField(auto_now_add=True)
    Solved_at =  models.DateTimeField (null=True, blank=True)
    decription = models.TextField()
    complaint_title = models.CharField(max_length=100)
    PRIORITY_CHOICES = [('LOW','Low'),('MEDIUM','Medium'),('HIGH','High')]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    STATUS_CHOICES = [('SUBMITTED', 'Submitted'), ('IN_PROGRESS', 'In Progress'), ('RESOLVED', 'Resolved'), ('CLOSED', 'Closed'), ('REJECTED', 'Rejected')]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')
    worker_name = models.CharField(max_length=100, blank=True, default='')
    worker_phone = models.BigIntegerField(null=True, blank=True)
    sla_due_at = models.DateTimeField(null=True, blank=True, db_index=True)
    overdue_at = models.DateTimeField(null=True, blank=True)
    is_action = models.BooleanField(default=True)
    def __str__(self):
        return f"{self.User} - {self.Category} - {self.Address} - {self.complaint_at} - {self.Solved_at} - {self.decription} - {self.complaint_title} - {self.priority}"


class ComplaintHistory(models.Model):
    complaint = models.ForeignKey(complaint, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=40)
    from_status = models.CharField(max_length=20, blank=True, default='')
    to_status = models.CharField(max_length=20, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(AuthUser, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['complaint', '-created_at'])]


class AutomationLog(models.Model):
    complaint = models.ForeignKey(complaint, on_delete=models.CASCADE, related_name='automation_logs')
    action = models.CharField(max_length=80)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']


class AdminNotification(models.Model):
    complaint = models.ForeignKey(complaint, null=True, blank=True, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)



