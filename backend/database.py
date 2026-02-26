from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"

client = AsyncIOMotorClient(MONGO_URL)

db = client.smartRoad

# Collections
collection = db.potholes
users_collection = db.users