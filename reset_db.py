from db import engine, Base, init_db

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables with new schema...")
init_db()
print("Database schema reset successfully.")
