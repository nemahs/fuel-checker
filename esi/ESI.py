"""Provides an framework for making calls to EVE's ESI API."""
from typing import List, Callable, Any
from functools import reduce
from .CommonFunctions import _makeCall, _makePagedCall, METHOD

def getIDs(names : List[str]):
    """Get IDs from a set of names.

    @param names    List of names to get ids for.
    @return         JSON response containing requested ids.
    """
    if not names:
        return list()

    return _makeCall("universe/ids/", method=METHOD.POST, data=list(set(names)))


def getNames(ids : List[int]):
    """Get names from a set of IDs.

    @param ids  List of IDs to get names for.
    @return     JSON response containing requested names.
    """
    if not ids:
        return list()

    return _makeCall("universe/names/", method=METHOD.POST, data=list(set(ids)))


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