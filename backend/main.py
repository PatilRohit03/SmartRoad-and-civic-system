from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from bson import ObjectId
import shutil
import os
from dotenv import load_dotenv

load_dotenv()

from backend.database import collection, users_collection
from backend.ai_routes import router as ai_router
from backend.assistant_routes import router as assistant_router
from backend.webcam_routes import router as webcam_router

# ==============================
# APP INIT
# ==============================
app = FastAPI(title="Smart Road Backend")
app.include_router(ai_router)
app.include_router(assistant_router)
app.include_router(webcam_router)

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
# ESCALATION TO MINISTRY
# ==============================
def send_email_via_smtp(subject: str, html_body: str, recipient: str, attachments: list = None):
    import smtplib
    import ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.image import MIMEImage

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_pass:
        print("SMTP credentials not configured in .env. Skipping live email send.")
        return False
        
    try:
        # Use "related" to allow inline images via Content-ID (cid:)
        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = recipient
        
        # HTML goes inside "alternative" container inside "related"
        msg_alternative = MIMEMultipart("alternative")
        msg.attach(msg_alternative)
        
        part = MIMEText(html_body, "html", "utf-8")
        msg_alternative.attach(part)
        
        # Attach any inline images
        if attachments:
            for att in attachments:
                filepath = att.get("path")
                cid = att.get("cid")
                if filepath and cid and os.path.exists(filepath):
                    try:
                        with open(filepath, "rb") as f:
                            img_data = f.read()
                        msg_image = MIMEImage(img_data)
                        msg_image.add_header("Content-ID", f"<{cid}>")
                        msg_image.add_header("Content-Disposition", "inline", filename=os.path.basename(filepath))
                        msg.attach(msg_image)
                        print(f"Attached inline image {filepath} with CID <{cid}>")
                    except Exception as e_att:
                        print(f"Failed to attach image {filepath}: {e_att}")
        
        context = ssl.create_default_context()
        
        # Try TLS on port 587 first, fallback to SSL on 465
        try:
            print(f"SMTP: Trying TLS on {smtp_host}:{smtp_port}...")
            server = smtplib.SMTP(smtp_host, smtp_port, local_hostname="localhost", timeout=30)
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recipient, msg.as_string())
            server.quit()
            print(f"Email successfully sent to {recipient} via TLS!")
            return True
        except Exception as e_tls:
            print(f"TLS attempt failed: {e_tls}")
            import traceback
            traceback.print_exc()
            # Fallback: direct SSL connection on port 465
            print(f"SMTP: Trying SSL fallback on {smtp_host}:465...")
            server = smtplib.SMTP_SSL(smtp_host, 465, local_hostname="localhost", context=context, timeout=30)
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recipient, msg.as_string())
            server.quit()
            print(f"Email successfully sent to {recipient} via SSL fallback!")
            return True
            
    except Exception as e:
        print(f"Error sending email via SMTP: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_ministry_email(pothole: dict) -> str:
    pothole_id = str(pothole["_id"])
    c0 = pothole["location"]["coordinates"][0]
    c1 = pothole["location"]["coordinates"][1]
    if c0 > c1:
        lng = c0
        lat = c1
    else:
        lng = c1
        lat = c0
    severity = pothole.get("ai_severity", "unknown").upper()
    frequency = pothole.get("frequency_count", 1)
    created_at = pothole.get("created_at", datetime.utcnow())
    days_unresolved = (datetime.utcnow() - created_at).days
    
    heatmap_rel_path = pothole.get("heatmap_path")
    if not heatmap_rel_path:
        try:
            image_path = pothole.get("image_path")
            if image_path and os.path.exists(image_path):
                from backend.ai_routes import run_image_inference, generate_heatmap
                inference = run_image_inference(image_path)
                if inference.get("is_pothole") and inference.get("detections"):
                    hpath = generate_heatmap(image_path, inference["detections"])
                    if hpath:
                        heatmap_rel_path = hpath.replace("\\", "/")
        except Exception as e:
            print(f"Error generating heatmap for email: {e}")
            
    if not heatmap_rel_path:
        heatmap_rel_path = pothole.get("image_path")

    base_url = "http://127.0.0.1:8000"
    orig_url = f"{base_url}/{pothole.get('image_path')}" if pothole.get("image_path") else "#"
    heatmap_url = f"{base_url}/{heatmap_rel_path}" if heatmap_rel_path else "#"
    maps_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"

    severity_color = "#dc2626" if severity == "DANGEROUS" else ("#eab308" if severity == "MEDIUM" else "#16a34a")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Urgent Public Safety Escalation</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 650px;
            background: #ffffff;
            margin: 0 auto;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }}
        .header p {{
            margin: 5px 0 0 0;
            font-size: 13px;
            opacity: 0.8;
            letter-spacing: 1px;
        }}
        .badge-bar {{
            background-color: {severity_color};
            color: white;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            padding: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .content {{
            padding: 30px;
        }}
        .salutation {{
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 15px;
        }}
        .body-text {{
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 25px;
            color: #475569;
        }}
        .meta-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 14px;
        }}
        .meta-table th, .meta-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #f1f5f9;
        }}
        .meta-table th {{
            background-color: #f8fafc;
            color: #64748b;
            font-weight: 600;
            width: 35%;
        }}
        .meta-table td {{
            font-weight: 500;
            color: #0f172a;
        }}
        .btn {{
            display: inline-block;
            background-color: #1e3a8a;
            color: #ffffff !important;
            text-decoration: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            margin-top: 5px;
        }}
        .media-section {{
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 25px;
        }}
        .media-title {{
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #0f172a;
        }}
        .media-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }}
        .media-card {{
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            background: #f8fafc;
        }}
        .media-card img {{
            width: 100%;
            height: 160px;
            object-fit: cover;
            display: block;
        }}
        .media-card-label {{
            font-size: 11px;
            font-weight: 600;
            padding: 6px 10px;
            background-color: #f1f5f9;
            color: #475569;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            text-transform: uppercase;
        }}
        .footer {{
            background-color: #f8fafc;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
        }}
        .footer strong {{
            color: #0f172a;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ministry of Road Transport & Highways</h1>
            <p>Government of India • Road Quality & Safety Cell</p>
        </div>
        <div class="badge-bar">
            Urgent Notice: Overdue Road Hazard (Severity: {severity})
        </div>
        <div class="content">
            <div class="salutation">To,</div>
            <div class="salutation" style="margin-left: 20px; font-weight: normal; color: #475569;">
                The Chief Engineer / Regional Officer,<br>
                Ministry of Road Transport & Highways (MoRTH) / Municipal Commissioner
            </div>
            <br>
            <div class="body-text">
                This official safety grievance has been automatically generated and escalated by the **Smart Road AI Safety Portal**. The road defect identified below has remained <strong>unresolved for over 21 days</strong> (or was manually escalated due to severe hazard status) and requires immediate repair intervention.
            </div>
            
            <table class="meta-table">
                <tr>
                    <th>Grievance Reference</th>
                    <td>#SR-{pothole_id[-6:].upper()} (ID: {pothole_id})</td>
                </tr>
                <tr>
                    <th>Geographic Coordinates</th>
                    <td>
                        {lat:.6f}, {lng:.6f}<br>
                        <a href="{maps_url}" target="_blank" class="btn">View on Google Maps</a>
                    </td>
                </tr>
                <tr>
                    <th>AI Severity Score</th>
                    <td><span style="color: {severity_color}; font-weight: bold;">{severity}</span></td>
                </tr>
                <tr>
                    <th>Citizen Report Count</th>
                    <td>{frequency} unique reports / upvotes</td>
                </tr>
                <tr>
                    <th>Unaddressed Duration</th>
                    <td>{days_unresolved} Days (Target SLA: 21 Days)</td>
                </tr>
                <tr>
                    <th>Current Status</th>
                    <td style="color: #dc2626; font-weight: 600; text-transform: uppercase;">OVERDUE FOR ACTION</td>
                </tr>
            </table>

            <div class="media-section">
                <div class="media-title">Photographic Evidence & AI Verification</div>
                <div class="media-grid">
                    <div class="media-card">
                        <img src="{orig_url}" alt="Citizen Upload">
                        <div class="media-card-label">Citizen Uploaded Evidence</div>
                    </div>
                    <div class="media-card">
                        <img src="{heatmap_url}" alt="AI Computer Vision Bounding-Box Heatmap">
                        <div class="media-card-label">AI CV Bounding-Box Heatmap</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="footer">
            This notice is issued under the <strong>Smart Road Civic Accountability Protocol</strong>.<br>
            Please update the repair ticket resolution proof at the earliest.<br>
            <br>
            <strong>Smart Road Safety Portal</strong>
        </div>
    </div>
</body>
</html>
"""
    os.makedirs("uploads/emails", exist_ok=True)
    file_path = f"uploads/emails/pothole_{pothole_id}.html"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Prepare email content with inline CID images for email delivery to prevent broken images
    email_html_content = html_content
    attachments = []
    
    # Check if citizen image exists and add attachment
    raw_img_path = pothole.get("image_path")
    if raw_img_path and os.path.exists(raw_img_path):
        attachments.append({"path": raw_img_path, "cid": "citizen_upload"})
        email_html_content = email_html_content.replace(orig_url, "cid:citizen_upload")
        
    # Check if heatmap image exists and add attachment
    if heatmap_rel_path and os.path.exists(heatmap_rel_path):
        attachments.append({"path": heatmap_rel_path, "cid": "ai_heatmap"})
        email_html_content = email_html_content.replace(heatmap_url, "cid:ai_heatmap")

    # Send the actual email
    ministry_email = os.getenv("MINISTRY_EMAIL", "rohitkumarpatil04@gmail.com")
    subject = f"[URGENT] Overdue Road Hazard — Severity: {severity} — Ref #SR-{pothole_id[-6:].upper()}"
    email_sent = send_email_via_smtp(subject, email_html_content, ministry_email, attachments=attachments)
        
    return file_path, email_sent

@app.post("/pothole/{pothole_id}/escalate")
async def escalate_pothole(pothole_id: str, admin_user: dict = Depends(get_admin_user)):
    pothole = await collection.find_one({"_id": ObjectId(pothole_id)})
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")
        
    if pothole.get("status") == "resolved":
        raise HTTPException(status_code=400, detail="Cannot escalate resolved pothole")

    # Generate email and send
    email_path, email_sent = generate_ministry_email(pothole)
    
    # Update status to overdue (escalated) and set flags
    await collection.update_one(
        {"_id": ObjectId(pothole_id)},
        {"$set": {
            "status": "overdue",
            "escalated_to_ministry": True,
            "ministry_email_path": email_path
        }}
    )
    
    return {"message": "Escalated successfully", "email_path": email_path, "email_sent": email_sent}

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
      c0 = p["location"]["coordinates"][0]
      c1 = p["location"]["coordinates"][1]
      lat = c1 if c0 > c1 else c0
      lng = c0 if c0 > c1 else c1
      potholes.append({
          "_id": str(p["_id"]),
          "status": p.get("status"),
          "latitude": lat,
          "longitude": lng,
          "description": p.get("admin_note", ""),
          "frequency": p.get("frequency_count", 1),

    # 🔥 AI FIELDS (ADD THESE)
          "ai_verified": p.get("ai_verified", False),
          "ai_severity": p.get("ai_severity", "unknown"),

          "escalated_to_ministry": p.get("escalated_to_ministry", False),
          "ministry_email_path": p.get("ministry_email_path"),

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
        c0 = p["location"]["coordinates"][0]
        c1 = p["location"]["coordinates"][1]
        lat = c1 if c0 > c1 else c0
        lng = c0 if c0 > c1 else c1
        reports.append({
            "_id": str(p["_id"]),
            "status": p.get("status"),
            "latitude": lat,
            "longitude": lng,
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
            update_fields = {"status": "overdue"}
            
            if not p.get("escalated_to_ministry"):
                try:
                    email_path, email_sent = generate_ministry_email(p)
                    update_fields["escalated_to_ministry"] = True
                    update_fields["ministry_email_path"] = email_path
                except Exception as e:
                    print(f"Failed to generate automated overdue email for {p['_id']}: {e}")
            
            await collection.update_one(
                {"_id": p["_id"]},
                {"$set": update_fields}
            )
            overdue.append(str(p["_id"]))

    return {"overdue_potholes": overdue}