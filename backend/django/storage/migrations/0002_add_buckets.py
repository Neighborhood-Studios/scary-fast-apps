from django.db import migrations


def python_mig(apps, schema_editor):
    StorageBucket = apps.get_model('storage', 'Buckets')
    # public bucket is supposed to be available for all users
    StorageBucket(id="public").save()
    # files in private bucket are supposed to be available to file owner and manager
    StorageBucket(id="private").save()


class Migration(migrations.Migration):

    dependencies = [
        ('storage', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(python_mig),
    ]
