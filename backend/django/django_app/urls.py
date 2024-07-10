"""
URL configuration for template project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
# from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # path('admin/', admin.site.urls),
    path('da/api/v1/', include([
        path('', include('users.urls')),
        path('phone/', include('twilio_app.urls')),

        path('email/', include('sendgrid_app.urls')),
        path('chat/', include('comet_chat.urls')),
        path('plaid/', include('plaid_app.urls')),
        path('treasuryprime/', include('treasuryprime_app.urls')),
        path('signwell/', include('signwell.urls')),
        path('', include('stripe_app.urls')),
        path('', include('expo_notifications.urls')),
    ])),
]
