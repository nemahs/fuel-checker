from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

engine = create_engine('sqlite:///test.db', convert_unicode = True, echo=False)
db_session = scoped_session(sessionmaker(autocommit=False,
                                         bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()


def init_db():
  from . import models
  Base.metadata.create_all(bind=engine)