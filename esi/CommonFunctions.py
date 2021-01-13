"""Common ESI functions for making calls to ESI."""
from gevent import monkey
from functools import lru_cache, wraps
from datetime import datetime, timedelta
monkey.patch_all()

from enum import Enum
import grequests
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


  endpointURL: str = f"{BASE_URL}/{version}/{endpoint}"
  response = requests.get(endpointURL, headers=headers)

  if response:
    result = response.json()
    tasks = [grequests.get(endpointURL, headers=headers, params={'page': page}) for page in range(2, int(response.headers['X-Pages']) + 1)]

    responses = grequests.map(tasks)


    for response in responses:
      result.extend(response.json())

    return result
  else:
    raise Exception("Failed to contact ESI: " +  response.text + f"\nURL: {BASE_URL}/{version}/{endpoint}")


def _timed_lru_cache(timer: int, maxItems:int = 128):
  def wrapper_cache(func):
    func = lru_cache(maxsize=maxItems)(func)
    func.lifetime = timedelta(seconds=timer)
    func.expiration = datetime.utcnow() + func.lifetime

    @wraps(func)
    def wrapped_func(*args, **kwargs):
      if datetime.utcnow() >= func.expiration:
        func.cache_clear()
        func.expiration = datetime.utcnow() + func.lifetime

      return func(*args, *kwargs)
    
    return wrapped_func

  return wrapper_cache