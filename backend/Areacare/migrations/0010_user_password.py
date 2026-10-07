from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('Areacare', '0009_complaint_extended_statuses'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='password',
            field=models.CharField(default='', max_length=128),
        ),
        migrations.AlterField(
            model_name='user',
            name='contact',
            field=models.BigIntegerField(default=0),
        ),
    ]
