from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path("ai/models/pothole_best.pt")
model = YOLO(MODEL_PATH)

def detect_pothole_image(image_path: str, conf: float = 0.4):
    """
    Run pothole detection on a single image
    Returns list of detections
    """
    results = model(image_path, conf=conf)

    detections = []

    for r in results:
        for box in r.boxes:
            detections.append({
                "label": "pothole",
                "confidence": float(box.conf[0]),
                "bbox": [float(x) for x in box.xyxy[0]]
            })

    return {
        "total_detections": len(detections),
        "detections": detections,
        "is_pothole": len(detections) > 0
    }