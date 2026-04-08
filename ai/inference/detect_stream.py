from ultralytics import YOLO
import cv2
from pathlib import Path

MODEL_PATH = Path("ai/models/pothole_best.pt")
model = YOLO(MODEL_PATH)

def detect_from_camera(camera_id=0, conf=0.4):
    cap = cv2.VideoCapture(camera_id)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=conf)
        annotated = results[0].plot()

        cv2.imshow("Pothole Detection", annotated)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()