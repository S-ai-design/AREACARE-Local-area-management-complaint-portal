"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from Areacare.views import admin_dashboard, admin_login, auth_logout, auth_session, citizen_login, complaint_detail, create_complaint, list_complaints, staff_login, staff_register

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/admin-login/', admin_login, name='admin-login'),
    path('api/auth/session/', auth_session, name='auth-session'),
    path('api/auth/logout/', auth_logout, name='auth-logout'),
    path('api/admin/dashboard/', admin_dashboard, name='admin-dashboard'),
    path('api/staff-login/', staff_login, name='staff-login'),
    path('api/staff-register/', staff_register, name='staff-register'),
    path('api/complaints/', create_complaint, name='create-complaint'),
    path('api/citizen-login/', citizen_login, name='citizen-login'),
    path('api/complaints/list/', list_complaints, name='list-complaints'),
    path('api/complaints/<str:complaint_id>/', complaint_detail, name='complaint-detail'),
]
