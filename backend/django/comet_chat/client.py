import requests
from requests import HTTPError


class CometChatClient:
    def __init__(self, api_url, api_key):
        self.base_url = api_url
        self.session = requests.Session()
        self.session.headers.update({
            'apikey': api_key
        })

    def create_user(self, uid: str, name, email, phone_number=None):
        """ expected response:
        {
          "data": {
            "uid": "12345",
            "name": "qwerty",
            "metadata": {
              "@private": {
                "email": "user@email.com",
                "contactNumber": "0123456789"
              }
            },
            "status": "offline",
            "role": "default",
            "createdAt": 1711537704
          }
        }
        """

        assert uid == uid.lower()
        payload = {
            "metadata": {
                # these @private fields are for notifications, that if we do plan to use them...
                "@private": {
                    "email": email,
                    "contactNumber": phone_number
                }
            },
            "uid": uid,
            "name": name
        }

        url = self.base_url + '/v3/users'
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
        except HTTPError as e:
            if e.response is not None:
                if 'ERR_UID_ALREADY_EXISTS' in e.response.text:
                    # user with this UID already exists
                    return True
            # unexpected
            raise
        return True

    def get_auth_token(self, uid: str):
        """ expected response:
        {
          "data": {
            "uid": "12345",
            "authToken": "12345_171153797645205c46d06e7e35865dfb3b9c81db",
            "createdAt": 1711537976
          }
        }
        """

        assert uid == uid.lower()

        url = self.base_url + f'/v3/users/{uid}/auth_tokens'
        response = self.session.post(url)
        # todo: add error handling when know what can go wrong here...
        response.raise_for_status()

        data = response.json()
        return data['data']['authToken']
