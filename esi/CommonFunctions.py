"""Common ESI functions for making calls to ESI."""
from enum import Enum
import asyncio
import requests


class METHOD(Enum):
  """HTTP Method to use in call."""

  GET=1
  POST=2

BASE_URL: str = f"https://esi.evetech.net"
HEADERS = {'accept': 'application/json' }

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
  headers = HEADERS
  if access_token is not None:
    headers["Authorization"] = f"Bearer {access_token}"

  url: str = f"{BASE_URL}/{version}/{endpoint}"

  if method == METHOD.GET:
    params = {}
    if page is not None:
      params['page'] = page

    response = requests.get(url, headers=headers, params=params)
  else:
    response = requests.post(url, headers=headers, json=data)

  if response.status_code == requests.codes['ok']:
    return response.json()

  raise Exception("Failed to contact ESI: " +  response.text + f"\nURL: {url}")


async def _makeCallAsync(endpoint: str, access_token: str = None, version: str = "latest", page: int = None):
  """Async version of _makeCall."""
  return _makeCall(endpoint, access_token, version, page)


def _makePagedCall(endpoint: str, access_token: str = None, version: str = "latest"):
  """Make a call to a paged endpoint. Retrieves all pages.

  @param endpoint       Endpoint to call.
  @param access_token   User access token. Optional
  @param version        ESI version to use. Defaults to latest

  @return               JSON response.
  """
  headers = HEADERS
  if access_token is not None:
    headers["Authorization"] = f"Bearer {access_token}"

  response = requests.get(f"{BASE_URL}/{version}/{endpoint}", headers=headers)

  if response:
    result = response.json()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    tasks = [_makeCallAsync(endpoint, access_token, version, page) for page in range(2, int(response.headers['X-Pages']) + 1)]

    pagedResults = loop.run_until_complete(asyncio.gather(*tasks))

    for page in pagedResults:
      result += page

    return result
  else:
    raise Exception("Failed to contact ESI: " +  response.text + f"\nURL: {BASE_URL}/{version}/{endpoint}")
