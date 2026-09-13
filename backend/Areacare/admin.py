

from django.contrib import admin 

from .models import *
# Register your models here.
admin.site.register(user)
admin.site.register(Address)
admin.site.register(category)
admin.site.register(complaint)
admin.site.register(ComplaintHistory)
admin.site.register(AutomationLog)
admin.site.register(AdminNotification)
@admin.register(FieldStaff)
class FieldStaffAdmin(admin.ModelAdmin):
	list_display = ('full_name', 'account', 'phone', 'department', 'is_action')
	list_filter = ('department', 'is_action')
	search_fields = ('full_name', 'account__username', 'account__email', 'phone')
