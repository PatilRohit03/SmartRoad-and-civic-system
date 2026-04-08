from ultralytics import YOLO
import cv2
from pathlib import Path

MODEL_PATH = Path("ai/models/pothole_best.pt")
model = YOLO(MODEL_PATH)

def detect_pothole_video(video_path: str, output_path: str, conf: float = 0.4):
    cap = cv2.VideoCapture(video_path)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_detections = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=conf)
        annotated = results[0].plot()

        total_detections += len(results[0].boxes)
        out.write(annotated)

    cap.release()
    out.release()

    return {
        "output_video": output_path,
        "total_detections": total_detections,
        "is_pothole": total_detections > 0
    }