from django.contrib import admin

from .models.user import User


class BaseAdmin(admin.ModelAdmin):
    fields = None


admin.site.register(User, BaseAdmin)
