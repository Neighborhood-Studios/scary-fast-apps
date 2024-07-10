import uuid

from django.apps import apps
from django.http import JsonResponse
from rest_framework.decorators import api_view

from comet_chat.models import UserChatLink
from users.models.user import User


@api_view(['POST'])
def get_auth_token(request):
    initiator_user_id = request.user.username

    chat_link = UserChatLink.objects.filter(user_id=initiator_user_id).first()
    client = apps.get_app_config('comet_chat').client

    if not chat_link:
        new_uid = str(uuid.uuid4()).lower()
        user = User.objects.get(auth0id=initiator_user_id)
        user_profile = None
        # user_profile = UserProfile.objects.filter(user=user).first()
        if not user_profile:
            return JsonResponse({'status': 'error', 'message': 'user does has no profile'}, status=400)
        if client.create_user(
                uid=new_uid,
                email=user.email,
                name=user_profile.first_name + ' ' + user_profile.last_name,
                phone_number=user.phone_number,
        ):
            chat_link = UserChatLink(user=user, uid=new_uid)
            chat_link.save()
    token = client.get_auth_token(chat_link.uid)
    return JsonResponse({'status': 'ok', 'auth_token': token})
