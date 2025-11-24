from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from ultralytics import YOLO
import numpy as np
import cv2
import base64
from database.supabase_connection import supabase


router = APIRouter(prefix="/predict", tags=["Predict"])
model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model/best.pt")

try:
    model = YOLO(model_path)
    print("YOLO model loaded successfully.")
except Exception as e:
    print("Failed to load YOLO model:", e)
    model = None

def get_nutrition_for_labels(labels: list):
    if not labels:
        return {}

    unique = list(set(labels))

    response = (
        supabase.table("food_nutrition_data")
        .select("food_name, calories, protein, carbs, fat, serving_weight_grams")
        .in_("food_name", unique)
        .execute()
    )

    if response.data:
        return {item["food_name"]: item for item in response.data}

    return {}


@router.post("/food")
async def predict_food(file: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded on server")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        np_img = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        results = model(img)

        detections = []
        labels = []

        for box in results[0].boxes:
            cls = int(box.cls)
            label = results[0].names[cls]
            conf = float(box.conf)

            if conf < 0.50:
                continue
            
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "label": label,
                "confidence": conf,
                "box": [x1, y1, x2, y2]
            })

            labels.append(label)

        nutrition_map = get_nutrition_for_labels(labels)

        for item in detections:
            item["nutrition"] = nutrition_map.get(item["label"], {})

        annotated = results[0].plot() 
        annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)

        _, buffer = cv2.imencode(".jpg", annotated_rgb)
        image_base64 = base64.b64encode(buffer).decode("utf-8")

        return JSONResponse(content={
            "predictions": detections,
            "count": len(detections),
            "image": image_base64
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
