from django.db import models


class User(models.Model):
    auth0id = models.CharField(max_length=70, null=False, primary_key=True)
    name = models.CharField(max_length=150, null=True)
    last_seen = models.DateTimeField(null=True)

    phone_number = models.CharField(max_length=20, null=True)
    email = models.CharField(max_length=200, null=True)

