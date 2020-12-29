"""Contains authentication specific ESI calls."""
from enum import Enum
from typing import List
from functools import reduce
import requests
from base64 import urlsafe_b64encode


BASE_LOGIN_URL: str = "https://login.eveonline.com"

class ESI_SCOPES(str, Enum):
    """Enum of different ESI scopes and their ESI names."""

    READ_CONTRACTS="esi-contracts.read_character_contracts.v1"
    READ_CORP_CONTRACTS="esi-contracts.read_corporation_contracts.v1"
    READ_STRUCTURES="esi-universe.read_structures.v1"
    OPEN_WINDOWS="esi-ui.open_window.v1"
    CHECK_ONLINE="esi-location.read_online.v1"


def refreshToken(refresh_token: str, client_id: str, secret_key: str) -> str:
    """Refresh an expired access token.

    @param refresh_token    User's refresh token.

    @return                 New access token.
    """
    AUTH_STRING: bytes = urlsafe_b64encode(f"{client_id}:{secret_key}".encode('utf-8'))
    AUTH_URL: str = BASE_LOGIN_URL + "/v2/oauth/token"
    HEADERS = {
        "Content-Type" : "application/x-www-form-urlencoded",
        "Host" : "login.eveonline.com",
        'Authorization': b'Basic ' + AUTH_STRING
    }

    response = requests.post(AUTH_URL, headers=HEADERS, data={'grant_type': 'refresh_token', 'refresh_token': refresh_token})

    if response.status_code == requests.codes['ok']:
        return response.json()

    raise Exception("Failed to refreh token")


def authenticateUser(code: str, secret_key: str, client_id: str):
    """Authenticate user and get Oauth tokens.

    @param code         OAuth code acquired from the application's call_back.
    @param secret_key   Application's secret key.
    @param client_id    Application's client id.


    @return             Dict containing token information.
    @throws             Exception if an error occurred contacting ESI.
    """
    AUTH_STRING: bytes = urlsafe_b64encode(f"{client_id}:{secret_key}".encode('utf-8'))
    AUTH_URL: str = BASE_LOGIN_URL + "/v2/oauth/token"
    HEADERS = {'Content-type': 'application/x-www-form-urlencoded',
               'Host': 'login.eveonline.com',
               'Authorization': b'Basic ' + AUTH_STRING
              }

    response = requests.post(AUTH_URL, headers=HEADERS, data={'grant_type': 'authorization_code', 'code': code})

    if response.status_code == requests.codes['ok']:
        return response.json()

    raise Exception("Failed to authenticate user: " + response.text)


def validateUser(accessKey: str):
    """Validate an access key and get information about the user.

    @param accessKey    ESI access key to validate.

    @return             Dict of user information.
    @throws             Exception if access key validation fails.
    """
    VALIDATE_URL: str = BASE_LOGIN_URL + "/oauth/verify"
    HEADERS = {'Authorization' : f"Bearer {accessKey}"}

    response = requests.get(VALIDATE_URL, headers=HEADERS)

    if response.status_code == requests.codes['ok']:
        return response.json()

    raise Exception("Failed to validate access key")


def getLoginURL(app_id, redirect_url, scopes: List[ESI_SCOPES]) -> str:
    """Get the login URL to redirect users to.

    @param app_id       Application ID given by CCP
    @param redirect_url Login URL to redirect to after successful authentication
    @param scopes       List of ESI scopes to request from the user

    @return             Login URL to send the user to.
    """
    LOGIN_URL: str = f"{BASE_LOGIN_URL}/v2/oauth/authorize/?response_type=code&redirect_uri={redirect_url}&client_id={app_id}"

    scope_query: str = reduce(lambda x, y: x + f"%20{y.value}", scopes)     # type: ignore

    return f"{LOGIN_URL}&scope={scope_query}&state=blah"