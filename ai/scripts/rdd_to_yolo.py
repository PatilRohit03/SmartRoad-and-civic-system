import shutil
from pathlib import Path
from tqdm import tqdm

# RDD paths
RDD_IMG_DIR = Path("ai/data/India/train/images")
RDD_LABEL_DIR = Path("ai/data/India/train/annotations")

# Target YOLO dataset paths
YOLO_IMG_DIR = Path("ai/data/images/train")
YOLO_LABEL_DIR = Path("ai/data/labels/train")

YOLO_IMG_DIR.mkdir(parents=True, exist_ok=True)
YOLO_LABEL_DIR.mkdir(parents=True, exist_ok=True)

print("🔁 Merging RDD (India) dataset into YOLO format...")

for label_file in tqdm(list(RDD_LABEL_DIR.glob("*.txt"))):
    img_name = label_file.stem + ".jpg"
    img_path = RDD_IMG_DIR / img_name

    if not img_path.exists():
        continue

    shutil.copy(img_path, YOLO_IMG_DIR / img_name)
    shutil.copy(label_file, YOLO_LABEL_DIR / label_file.name)

print("✅ RDD dataset merged successfully")