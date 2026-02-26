from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from bson import ObjectId
import shutil

from backend.database import collection, users_collection
from backend.ai_routes import router as ai_router

# ==============================
# APP INIT
# ==============================
app = FastAPI(title="Smart Road Backend")
app.include_router(ai_router)

# ==============================
# SECURITY CONFIG
# ==============================
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# ==============================
# STATIC + CORS
# ==============================
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# AUTH HELPERS
# ==============================
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==============================
# ROOT
# ==============================
@app.get("/")
async def root():
    return {"message": "Smart Road Backend Running"}

# ==============================
# REGISTER
# ==============================
@app.post("/register")
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...)
):
    if await users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    password = password[:72]
    hashed_password = pwd_context.hash(password)

    await users_collection.insert_one({
        "username": username,
        "email": email,
        "hashed_password": hashed_password,
        "role": "user",
        "created_at": datetime.utcnow()
    })

    return {"message": "User registered successfully"}

# ==============================
# LOGIN
# ==============================
@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    user = await users_collection.find_one({"email": username})
    password = password[:72]
    if not user or not pwd_context.verify(password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["role"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"]
    }

# ==============================
# REPORT POTHOLE (AI PRE-VALIDATED)
# ==============================
@app.post("/report")
async def report_pothole(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    severity: str = Form(...),  # from AI
    current_user: dict = Depends(get_current_user)
):
    file_location = f"uploads/{file.filename}"

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    existing = await collection.find_one({
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": 10
            }
        }
    })

    if existing:
        await collection.update_one(
            {"_id": existing["_id"]},
            {"$inc": {"frequency_count": 1}}
        )
        return {"message": "Existing pothole — frequency updated"}

    await collection.insert_one({
        "image_path": file_location,
        "location": {
            "type": "Point",
            "coordinates": [longitude, latitude]
        },
        "status": "reported",
        "frequency_count": 1,
        "ai_verified": True,
        "ai_severity": severity,
        "created_at": datetime.utcnow(),
        "reported_by": current_user["_id"],
        "admin_note": None,
        "proof_image": None
    })

    return {"message": "Pothole reported successfully"}

# ==============================
# GET ALL POTHOLES
# ==============================
@app.get("/potholes")
async def get_potholes():
    potholes = []
    async for p in collection.find():
     potholes.append({
          "_id": str(p["_id"]),
          "status": p.get("status"),
          "latitude": p["location"]["coordinates"][1],
          "longitude": p["location"]["coordinates"][0],
          "description": p.get("admin_note", ""),
          "frequency": p.get("frequency_count", 1),

    # 🔥 AI FIELDS (ADD THESE)
          "ai_verified": p.get("ai_verified", False),
          "ai_severity": p.get("ai_severity", "unknown"),

          "createdAt": p.get("created_at")
})  
    return potholes

# ==============================
# USER DASHBOARD
# ==============================
@app.get("/my-reports")
async def my_reports(current_user: dict = Depends(get_current_user)):
    reports = []
    async for p in collection.find({"reported_by": current_user["_id"]}):
        reports.append({
            "_id": str(p["_id"]),
            "status": p.get("status"),
            "latitude": p["location"]["coordinates"][1],
            "longitude": p["location"]["coordinates"][0],
             # 🔥 ADD THESE
            "ai_verified": p.get("ai_verified", False),
            "ai_severity": p.get("ai_severity", "unknown"),
             # 🔥 IMAGES
            "image_path": p.get("image_path"),
            "proof_image": p.get("proof_image"),

            "createdAt": p.get("created_at")
        })
    return reports

# ==============================
# ADMIN STATUS UPDATE
# ==============================
@app.put("/pothole/{pothole_id}")
async def update_pothole_status(
    pothole_id: str,
    status: str = Form(...),
    admin_note: str = Form(None),
    admin_user: dict = Depends(get_admin_user)
):
    update = {"status": status}
    if admin_note:
        update["admin_note"] = admin_note

    await collection.update_one(
        {"_id": ObjectId(pothole_id)},
        {"$set": update}
    )

    return {"message": "Status updated"}

# ==============================
# ADMIN PROOF UPLOAD
# ==============================
@app.put("/pothole/{pothole_id}/proof")
async def upload_proof(
    pothole_id: str,
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_admin_user)
):
    file_location = f"uploads/proof_{file.filename}"

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    await collection.update_one(
        {"_id": ObjectId(pothole_id)},
        {"$set": {
            "proof_image": file_location,
            "status": "resolved",
            "admin_note": "Resolved with proof"
        }}
    )

    return {"message": "Proof uploaded"}

# ==============================
# OVERDUE CHECK
# ==============================
@app.get("/check-overdue")
async def check_overdue():
    overdue = []
    now = datetime.utcnow()

    async for p in collection.find({"status": {"$ne": "resolved"}}):
        if p.get("created_at") and (now - p["created_at"]) > timedelta(days=21):
            await collection.update_one(
                {"_id": p["_id"]},
                {"$set": {"status": "overdue"}}
            )
            overdue.append(str(p["_id"]))

    return {"overdue_potholes": overdue}