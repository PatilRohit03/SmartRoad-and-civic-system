from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import uuid
import os

from backend.ai_routes import run_image_inference, generate_heatmap

router = APIRouter(prefix="/webcam", tags=["Webcam"])

WEBCAM_DIR = "uploads/webcam"
os.makedirs(WEBCAM_DIR, exist_ok=True)

# ==============================
# REQUEST MODEL
# ==============================
class CaptureRequest(BaseModel):
    webcam_url: str  # e.g. http://192.168.1.5:8080

# ==============================
# CAPTURE + ANALYZE
# ==============================
@router.post("/capture")
async def capture_and_analyze(req: CaptureRequest):
    """
    Fetches a snapshot from the IP Webcam app,
    saves it, and runs YOLO pothole detection on it.
    """
    snapshot_url = req.webcam_url.rstrip("/") + "/shot.jpg"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(snapshot_url)
            resp.raise_for_status()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=400,
            detail="Cannot connect to IP Webcam. Make sure your phone and PC are on the same WiFi network and the IP Webcam app is running."
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=400,
            detail=f"IP Webcam returned error: {e.response.status_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch from IP Webcam: {str(e)}"
        )

    # Save the captured frame
    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(WEBCAM_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(resp.content)

    # Run YOLO inference
    result = run_image_inference(filepath)

    # Generate heatmap if pothole detected
    result["heatmap"] = None
    result["captured_image"] = filepath.replace("\\", "/")

    if result["is_pothole"] and result["detections"]:
        heatmap_path = generate_heatmap(filepath, result["detections"])
        if heatmap_path:
            result["heatmap"] = heatmap_path.replace("\\", "/")

    return result
