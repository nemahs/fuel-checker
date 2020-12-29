"""User model."""
from sqlalchemy import Column, Integer, String, DateTime
import sqlalchemy.types as types
from sqlalchemy.ext.mutable import MutableList
from datetime import datetime, timedelta
from typing import List, Optional
from functools import reduce
from .. import database, esi

class StringList(types.TypeDecorator):
  """Custom SQLAlchemy type for a comma separated list of strings."""

  impl = types.String

  def process_bind_param(self, value: Optional[List[str]], dialect):
    """Serialize list to string when saving to db."""
    return reduce(lambda x,y: x + f",{y}", value, "") if value is not None else None

  def process_result_value(self, value: Optional[str], dialect):
    """Deserializes db string to list."""
    return value.split(',') if value is not None and value != "" else list()

MutableStringList = MutableList.as_mutable(StringList)

class User(database.Base):
  """User object."""

  __tablename__:str = "Users"
  id              = Column(Integer, primary_key=True)
  characterName   = Column(String(50), unique = True, nullable = False)
  accessKey       = Column(String(50))
  refreshToken    = Column(String(50))
  expiryTime      = Column(DateTime)
  systemList      = Column(MutableStringList, nullable = True)

  def __init__(self, id: int, charName: str, refreshToken: str, expiryTime: datetime = None, accessKey: str = None):
    """Construct new user.

    @param charName     Character name.
    @param refreshToken ESI token used to request new access keys.
    @param expiryTime   Datetime when the current access key expires. Optional.
    @param accessKey    Access key for authenticating to ESI. Optional.
    """
    self.id = id
    self.characterName = charName
    self.refreshToken = refreshToken
    self.expiryTime = expiryTime
    self.accessKey = accessKey
    self.systemList = None


  def get_id(self):
    """Get unicode version of user ID.

    @return Unicode ID
    """
    return self.id


  @staticmethod
  def parseTokens(tokens):
    """Parse a token response from ESI.

    @return Tuple containing (access_token, refresh_token, expirationTime)
    """
    return tokens['access_token'], tokens['refresh_token'], datetime.utcnow() + timedelta(0, tokens['expires_in'])


  def getAccessKey(self, client_id: str, secret_key: str) -> int:
    """Return an active user access key. Refreshes access key if expired.

    @param client_id    Application client id. Used to refresh tokens.
    @param secret_key   Application secret key. Used to refresh tokens.
    @return             Active application key.
    """
    if datetime.utcnow() > self.expiryTime:
      result = esi.refreshToken(self.refreshToken, client_id, secret_key)
      self.accessKey, self.refreshToken, self.expiryTime = User.parseTokens(result)
      database.db_session.add(self)
      database.db_session.commit()

    return self.accessKey



  def is_authenticated(self) -> bool:
    """Determine if the user is authenticated.

    @return True
    """
    return True


  def is_active(self) -> bool:
    """Determine if the user is an active user.

    @return True
    """
    return True


  def is_anonymous(self) -> bool:
    """Determine if this is an anonymous user.

    @return False
    """
    return False