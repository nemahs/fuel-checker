"""Main flask file for application."""
from flask import Flask, render_template, request, redirect, url_for, jsonify, Response
from flask_login import LoginManager, login_user, current_user, logout_user, login_required
from sqlalchemy.orm import Session
from sassutils.wsgi import SassMiddleware

from typing import Optional, List
from datetime import datetime, timedelta
from importlib.resources import open_text, path
from functools import wraps

from . import esi
from .database import db_session, init_db, engine
from .models.User import User

app = Flask(__name__)
login_manager = LoginManager()
login_manager.init_app(app)

app.wsgi_app = SassMiddleware(app.wsgi_app, {
  __package__: {
    'sass_path': 'static/sass',
    'css_path': 'static/css',
    'wsgi_path': '/static/css',
    'strip_extension': True
  }
})

CLIENT_ID: str = "e7f7b4cce62046bc93fdd765955f4cb0"
SECRET_KEY: str = "FaGwj7piUb5mVWPxhdby3Z5yli0d91hadzeerJuL"
GOON_CORP_ID: int = 667531913
app.secret_key = SECRET_KEY

with open_text(__package__, 'systems.txt') as systems:
  systemFile = systems.readlines()
  systemList = dict()

  for line in systemFile:
    splitLine = line.split(',')
    systemList[splitLine[0].rstrip()] = int(splitLine[1].rstrip())

@login_manager.user_loader
def load_user(user_id) -> Optional[User]:
  """Load a user from database. Needed for flask_login.

  @param user_id  ID of user to get.
  @return         User object, or None if no user exists
  """
  return User.query.filter(User.id==user_id).first()


def esi_required(function):
  """Decorator for esi required endpoints.

  Populates the authToken variable with the appropriate token.

  @param function Function to decorate.
  """
  @wraps(function)
  @login_required
  def esi_find(*args, **kwargs):
    function.__globals__['authToken'] = current_user.getAccessKey(CLIENT_ID, SECRET_KEY)
    return function(*args, **kwargs)

  return esi_find


@app.route("/")
def homepage():
  SCOPES: List[esi.ESI_SCOPES] = [
    esi.ESI_SCOPES.READ_CORP_CONTRACTS,
    esi.ESI_SCOPES.READ_CONTRACTS,
    esi.ESI_SCOPES.CHECK_ONLINE,
    esi.ESI_SCOPES.READ_STRUCTURES,
    esi.ESI_SCOPES.OPEN_WINDOWS
  ]

  if current_user.is_authenticated:
    print(current_user.systemList)
  return render_template("index.html", 
    loginURL=esi.getLoginURL(CLIENT_ID, "http://localhost:5000/login", SCOPES),
    systemList=systemList.keys()
  )

@app.route("/login")
def login():
  code = request.args.get("code")

  tokens = esi.authenticateUser(code, SECRET_KEY, CLIENT_ID)
  access_token, refresh_token, expiry_time = User.parseTokens(tokens)


  userInfo = esi.validateUser(access_token)
  characterName: str = userInfo['CharacterName']

  user: Optional[User] = User.query.filter(User.characterName == characterName).first()

  if user is None:
    user = User(userInfo['CharacterID'], characterName, refresh_token, expiry_time, access_token)
  else:
    user.accessKey = access_token
    user.refreshToken = refresh_token

  db_session.add(user)
  db_session.commit()

  login_user(user, remember=True)
  return redirect(url_for(homepage.__name__))


@app.route("/systems/add/<string:name>")
@login_required
def addSystem(name: str) -> Response:
  """Endpoint to add a system to the user's system list.

  @param name System name to add.
  """
  if name not in current_user.systemList:
    db_session.add(current_user)
    current_user.systemList.append(name)
    db_session.commit()
    return Response(status=200)

  return Response(status=304)

@app.route("/systems/remove/<string:name>")
@login_required
def removeSystem(name: str) -> Response:
  """Endpoint to remove a system from the user's system list.

  @param name System name to remove.
  """
  if name in current_user.systemList:
    current_user.systemList.remove(name)
    db_session.add(current_user)
    db_session.commit()
    return Response(status=200)

  return Response(status=304)

@app.route("/contracts")
@esi_required
def getContracts() -> Response:
  """Retrieve the list of corp contracts."""
  result = esi.getCorpContracts(GOON_CORP_ID, authToken)
  result = [contract for contract in result if contract['assignee_id'] == GOON_CORP_ID and contract['status'] == 'outstanding']
  return jsonify(result)


@app.route("/contracts/<string:name>")
@esi_required
def getSystemContracts(name: str) -> Response:
  result = esi.getCorpContracts(GOON_CORP_ID, authToken)
  result = [contract for contract in result if contract['assignee_id'] == GOON_CORP_ID and contract['status'] == 'outstanding' and contract['type'] == 'item_exchange']
  systems = {contract['start_location_id'] for contract in result}
  structures = {system: esi.getStructureInfo(system, authToken)['solar_system_id'] for system in systems}
  systemContracts = [contract for contract in result if structures[contract['start_location_id']] == systemList[name]]

  populateDetails(systemContracts)
  return jsonify(systemContracts)

@app.route("/logout")
def logout():
  """Log the user out."""
  logout_user()

  return redirect(url_for(homepage.__name__))


@app.teardown_appcontext
def shutdown_session(exception: Optional[Exception] = None):
  """Shutdown the database session.

  @param exception  Exception that caused the app to shutdown. Optional.
  """
  db_session.remove()


def populateDetails(contractList):
  characterNames = esi.getNames([contract['issuer_id'] for contract in contractList])

  for contract in contractList:
    details = esi.getContractDetails(contract['contract_id'], authToken, GOON_CORP_ID)
    contract['details'] = details
    contract['issuer_name'] = next((name['name'] for name in characterNames if name['id'] == contract['issuer_id']))
    contract['alliance_id'] = esi.getCorporationInfo(contract['issuer_corporation_id'])['alliance_id']

init_db()
app.run(debug = True)