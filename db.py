import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("No DATABASE_URL set for Flask application")

# Fix for SQLAlchemy connecting to Postgres using the 'postgres://' URI instead of 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    roll_no = Column(String, index=True)
    admission_number = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    class_name = Column(String, index=True)
    record_bought = Column(Boolean, default=False)
    bought_at = Column(DateTime, nullable=True)
    record_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime, nullable=True)
    remarks = Column(String, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
