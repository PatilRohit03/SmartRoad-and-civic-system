from fastapi import APIRouter, UploadFile, File, HTTPException
from ultralytics import YOLO
import uuid
import os
import cv2
import numpy as np
import torch

router = APIRouter(prefix="/ai", tags=["AI"])

# ==============================
# CONFIG
# ==============================
MODEL_PATH = "ai/models/pothole_best.pt"
UPLOAD_DIR = "uploads/ai"
HEATMAP_DIR = "uploads/heatmaps"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(HEATMAP_DIR, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
model = YOLO(MODEL_PATH).to(DEVICE)

# ==============================
# SEVERITY CALCULATION
# ==============================
def calculate_severity(detections):
    count = len(detections)
    if count == 0:
        return "none"

    avg_conf = sum(d["confidence"] for d in detections) / count

    if count >= 6 or avg_conf >= 0.75:
        return "dangerous"
    if count >= 3:
        return "medium"
    return "low"

# ==============================
# IMAGE INFERENCE (CORE)
# ==============================
def run_image_inference(image_path: str):
    results = model(image_path, conf=0.4, device=DEVICE)

    detections = []
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            detections.append({
                "label": "pothole",
                "confidence": float(box.conf[0]),
                "bbox": box.xyxy[0].tolist()
            })

    severity = calculate_severity(detections)

    return {
        "is_pothole": len(detections) > 0,
        "total_detections": len(detections),
        "severity": severity,
        "detections": detections
    }

# ==============================
# VIDEO INFERENCE (CORE)
# ==============================
def run_video_inference(video_path: str, max_frames: int = 30):
    cap = cv2.VideoCapture(video_path)

    detections = []
    frames_checked = 0

    while cap.isOpened() and frames_checked < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=0.4, device=DEVICE)

        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                detections.append({
                    "confidence": float(box.conf[0])
                })

        frames_checked += 1

    cap.release()
    severity = calculate_severity(detections)

    return {
        "is_pothole": len(detections) > 0,
        "frames_checked": frames_checked,
        "total_detections": len(detections),
        "severity": severity
    }

# ==============================
# HEATMAP GENERATION
# ==============================
def generate_heatmap(image_path, detections):
    img = cv2.imread(image_path)
    if img is None:
        return None

    heatmap = np.zeros(img.shape[:2], dtype=np.float32)

    for d in detections:
        x1, y1, x2, y2 = map(int, d["bbox"])
        heatmap[y1:y2, x1:x2] += d["confidence"]

    heatmap = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
    heatmap = cv2.applyColorMap(heatmap.astype(np.uint8), cv2.COLORMAP_JET)

    overlay = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)

    filename = f"{uuid.uuid4()}.jpg"
    path = os.path.join(HEATMAP_DIR, filename)
    cv2.imwrite(path, overlay)

    return path

# ==============================
# IMAGE VALIDATION API
# ==============================
@router.post("/validate-image")
async def validate_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    filename = f"{uuid.uuid4()}.jpg"
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    result = run_image_inference(path)

    # 🔥 GUARANTEED HEATMAP HANDLING
    result["heatmap"] = None

    if result["is_pothole"] and result["detections"]:
        heatmap_path = generate_heatmap(path, result["detections"])

        if heatmap_path:
            # normalize for URL
            result["heatmap"] = heatmap_path.replace("\\", "/")

    return result
# ==============================
# VIDEO VALIDATION API
# ==============================
@router.post("/validate-video")
async def validate_video(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only MP4 videos allowed")

    filename = f"{uuid.uuid4()}.mp4"
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    return run_video_inference(path)