"""Provides an framework for making calls to EVE's ESI API."""
import requests
import json
from typing import List, Callable, Any
from enum import Enum
from functools import reduce
from base64 import urlsafe_b64encode

class ESI_SCOPES(str, Enum):
    """Enum of different ESI scopes and their ESI names."""

    READ_CONTRACTS="esi-contracts.read_character_contracts.v1"
    READ_CORP_CONTRACTS="esi-contracts.read_corporation_contracts.v1"
    READ_STRUCTURES="esi-universe.read_structures.v1"
    OPEN_WINDOWS="esi-ui.open_window.v1"
    CHECK_ONLINE="esi-location.read_online.v1"

BASE_LOGIN_URL: str = "https://login.eveonline.com"

class METHOD(Enum):
    """HTTP Method to use in call."""

    GET=1
    POST=2

def _makeCall(endpoint: str, access_token: str = None, version: str = "latest", page: int = None, method: METHOD = METHOD.GET, data = None):
    """Send a call to the ESI REST server.

    @param endpoint     Endpoint to get results from.
    @param access_token Character ESI authentication token. Optional.
    @param version      ESI version to use. Defaults to latest.
    @param page         Which page of results to return. Optional.
    @param method       HTTP method to use. Defaults to GET.
    @param data         Data dict to use in call. Used for POST requests. Optional.
    @return             Results of ESI call.

    @throws Exception if ESI could not be contacted
    """
    BASE_URL: str = f"https://esi.evetech.net/{version}/"
    HEADERS = {'accept': 'application/json' }

    if access_token is not None:
        HEADERS["Authorization"] = f"Bearer {access_token}"

    if method == METHOD.GET:
        params = {}
        if page is not None:
            params['page'] = page

        response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS, params=params)
    else:
        response = requests.post(f"{BASE_URL}{endpoint}", headers=HEADERS, json=data)

    if response.status_code == requests.codes['ok']:
        return response.json()

    raise Exception("Failed to contact ESI: " +  response.text + f"\nURL: {BASE_URL}{endpoint}")


def _makePagedCall(endpoint: str, access_token: str = None, version: str = "latest"):
    BASE_URL: str = f"https://esi.evetech.net/{version}/"
    HEADERS = {'accept': 'application/json' }

    if access_token is not None:
        HEADERS["Authorization"] = f"Bearer {access_token}"

    response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS)

    if response:
        result = response.json()
        for page in range(2, int(response.headers['X-Pages']) + 1):
            result += _makeCall(endpoint, access_token, version, page)

    return result

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


def getIDs(names : List[str]):
    """Get IDs from a set of names.

    @param names    List of names to get ids for.
    @return         JSON response containing requested ids.
    """
    if not names:
        return list()

    return _makeCall("universe/ids/", method=METHOD.POST, data=names)


def getNames(ids : List[int]):
    """Get names from a set of IDs.

    @param ids  List of IDs to get names for.
    @return     JSON response containing requested names.
    """
    if not ids:
        return list()

    return _makeCall("universe/names/", method=METHOD.POST, data=ids)


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


def getAdjustedPrices(typeIDs: List[int]) -> List[float]:
    """Get the CCP Adjusted Prices for a given list of items.

    @param typeIDs  List of type IDs to get adjusted prices for.
    @return         List of adjusted prices. NOTE: May not be in the same order.
    """
    prices = _makeCall("markets/prices/")
    return [x.adjusted_price for x in prices if x.type_id in typeIDs]


def getCostIndices(systemIDs: List[int]) -> List[float]:
    """Get the cost indeces for a given list of systems.

    @param systemIDs    List of system IDs to get the cost indices of.
    @return             List of cost indices. NOTE: May not be in the same order.
    """
    indices = _makeCall("industry/systems/")
    return [x.cost_indices for x in indices if x.solar_system_id in systemIDs]


def getCorpContracts(corp_id: int, auth_token: str):
    """Get contracts for a given corp.

    @param corp_id      ID of the corp to get assets for.
    @param auth_token   Character auth token.
    @return             List of corp contracts.
    """
    return _makePagedCall(f"corporations/{corp_id}/contracts/", auth_token)


def getContracts(character_id: int, auth_token: str):
    """Get all personal contracts.

    @param character_id     ID of the character to get contracts for.
    @param auth_token       Character auth token.
    @return                 List of all personal contracts.
    """
    return _makeCall(f"characters/{character_id}/contracts/", auth_token)


def getCorpAssets(corp_id: int, auth_token: str):
    """Get all assets for a given corp.

    @param corp_id      ID of the corp to get assets for.
    @param auth_token   Character auth token.
    @return             List of corp assets.
    """
    return _makeCall(f"corporations/{corp_id}/assets/", auth_token)


def getContractDetails(contract_id: int, auth_token: str, corp_id: int = None, character_id: int = None):
    """Get the details of a given contract.

    @param contract_id  Contract to get the details of.
    @param auth_token   Character auth token.
    @param corp_id      Corporation ID. Optional.
    @param character_id Character ID. Optional.
    @return             Details of contract.
    """
    if corp_id is not None:
        endpoint: str = f"corporations/{corp_id}/contracts/{contract_id}/items"
    elif character_id is not None:
        endpoint = f"characters/{character_id}/contracts/{contract_id}/items"
    else:
        endpoint = f"contracts/public/items/{contract_id}"

    return _makeCall(endpoint, auth_token)


def getStructureInfo(structure_id: int, auth_token: str):
    """Get info about a given structure.

    @param structure_id     Structure to get info on.
    @param auth_token       Character auth token.
    """
    return _makeCall(f"universe/structures/{structure_id}", auth_token)


def getCorporationInfo(corp_id: int):
    """Get info on a given corporation.

    @param corp_id  ID of the corporation requested.
    @return         JSON response of corporation details.
    """
    return _makeCall(f"corporations/{corp_id}")