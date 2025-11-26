from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from ultralytics import YOLO
import numpy as np
import cv2
import base64
from database.supabase_connection import supabase
import asyncio
from functools import lru_cache

router = APIRouter(prefix="/predict", tags=["Predict"])
model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model/best.pt")

# Caching nutrition data to avoid repeated database calls
@lru_cache(maxsize=100)
def get_nutrition_for_labels_cached(labels_tuple: tuple):
    """Cached version of nutrition lookup"""
    if not labels_tuple:
        return {}

    unique = list(set(labels_tuple))
    
    response = (
        supabase.table("food_nutrition_data")
        .select("food_name, calories, protein, carbs, fat, serving_weight_grams")
        .in_("food_name", unique)
        .execute()
    )

    return {item["food_name"]: item for item in response.data} if response.data else {}

# Load model once at startup
@router.on_event("startup")
async def load_model():
    global model
    try:
        model = YOLO(model_path)
    except Exception as e:
        print("Failed to load YOLO model:", e)
        model = None

def validate_image_file(file: UploadFile):
    """Validate file type and content"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Checking file size (max 10MB)
    MAX_SIZE = 10 * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0) 
    
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
    
    return True

def process_detections(results):
    """Process YOLO results into detection objects"""
    detections = []
    labels = []
    high_conf_boxes = []  # Store high-confidence boxes for image
    
    for box in results[0].boxes:
        cls = int(box.cls)
        label = results[0].names[cls]
        conf = float(box.conf)
        
        # Only include high-confidence detections
        if conf < 0.50:
            continue
            
        detections.append({
            "label": label,
            "confidence": conf,
            "box": box.xyxy[0].tolist()
        })
        labels.append(label)
        high_conf_boxes.append(box)  # Store the box for image generation
    
    return detections, labels, high_conf_boxes

def encode_image_to_base64(image):
    """Encode image to base64 efficiently"""
    _, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")

@router.post("/food")
async def predict_food(file: UploadFile = File(...)):
    # Model check
    if not model:
        raise HTTPException(status_code=503, detail="Model not available")
    
    # File validation
    validate_image_file(file)
    
    try:
        # Read and decode image
        contents = await file.read()
        np_img = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Run inference (using async to avoid blocking)
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, model, img)
        
        # Process detections and get high-confidence boxes
        detections, labels, high_conf_boxes = process_detections(results)
        
        if not detections:
            return JSONResponse(content={
                "predictions": [],
                "count": 0,
                "message": "No food items detected with sufficient confidence (≥ 0.50)"
            })
        
        # Get nutrition data (cached)
        nutrition_map = get_nutrition_for_labels_cached(tuple(labels))
        
        # Add nutrition to detections
        for item in detections:
            item["nutrition"] = nutrition_map.get(item["label"], {})
        
        filtered_results = results[0]
        filtered_results.boxes = high_conf_boxes  # Replace with only high-confidence boxes
        annotated = filtered_results.plot()  # Now image shows only ≥ 0.50 boxes
        annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        image_base64 = encode_image_to_base64(annotated_rgb)
        
        return {
            "predictions": detections,
            "count": len(detections),
            "image": image_base64,
            "confidence_threshold_used": 0.50
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during prediction")
