from pathlib import Path
import shutil

# =============================
# BASE PATHS
# =============================
DATA_ROOT = Path("ai/data")

ROBOFLOW = {
    "train": DATA_ROOT / "train",
    "val": DATA_ROOT / "valid"
}

RDD_INDIA = {
    "train": DATA_ROOT / "India" / "train",
    "val": DATA_ROOT / "India" / "test"
}

OUT_IMAGES = DATA_ROOT / "images"
OUT_LABELS = DATA_ROOT / "labels"

# =============================
# CREATE OUTPUT DIRS
# =============================
for split in ["train", "val"]:
    (OUT_IMAGES / split).mkdir(parents=True, exist_ok=True)
    (OUT_LABELS / split).mkdir(parents=True, exist_ok=True)

# =============================
# COPY YOLO DATA
# =============================
def copy_yolo(source, split):
    img_dir = source / "images"
    lbl_dir = source / "labels"

    if not img_dir.exists():
        print(f"⚠️ No images in {source}")
        return

    for img in img_dir.glob("*.*"):
        label = lbl_dir / f"{img.stem}.txt"

        if not label.exists():
            print(f"⚠️ Missing label for {img.name}, skipped")
            continue

        shutil.copy(img, OUT_IMAGES / split / img.name)
        shutil.copy(label, OUT_LABELS / split / label.name)

# =============================
# PROCESS ROBOFLOW DATA
# =============================
print("📦 Merging Roboflow dataset...")
for split, path in ROBOFLOW.items():
    copy_yolo(path, split)

# =============================
# PROCESS RDD INDIA (IMAGES ONLY)
# LABEL CONVERSION COMES NEXT
# =============================
print("📦 Copying RDD India images (labels later)...")
for split, path in RDD_INDIA.items():
    img_dir = path / "images"

    if not img_dir.exists():
        continue

    for img in img_dir.glob("*.*"):
        shutil.copy(img, OUT_IMAGES / split / img.name)

print("✅ Dataset preparation completed successfully")