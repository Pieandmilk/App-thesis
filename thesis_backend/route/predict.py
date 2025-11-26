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
        print("YOLO model loaded successfully")
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
    high_conf_boxes = []
    
    print(f"🔍 Total boxes found by YOLO: {len(results[0].boxes)}")
    
    for i, box in enumerate(results[0].boxes):
        cls = int(box.cls)
        label = results[0].names[cls]
        conf = float(box.conf)
        
        print(f"  Detection {i}: '{label}' with confidence {conf:.3f}")
        
        if conf < 0.50:
            print(f"    SKIPPING '{label}' (confidence {conf:.3f} < 0.50)")
            continue
            
        print(f"    INCLUDING '{label}' (confidence {conf:.3f} ≥ 0.50)")
        detections.append({
            "label": label,
            "confidence": conf,
            "box": box.xyxy[0].tolist()
        })
        labels.append(label)
        high_conf_boxes.append(box) 
    
    print(f"🎯 Final detections after filtering: {len(detections)}")
    return detections, labels, high_conf_boxes

def create_custom_annotated_image(original_img, high_conf_boxes, results):
    """Create annotated image showing only high-confidence detections"""
    annotated = original_img.copy()
    
    colors = [
        (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), 
        (255, 0, 255), (0, 255, 255), (128, 0, 0), (0, 128, 0)
    ]
    
    for i, box in enumerate(high_conf_boxes):
        # Get box coordinates
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        
        # Get class info
        cls = int(box.cls)
        label = results[0].names[cls]
        conf = float(box.conf)
        
        # Choose color
        color = colors[cls % len(colors)]
        
        # Draw bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        
        # Create label text
        label_text = f"{label} {conf:.2f}"
        
        # Calculate text background
        (text_width, text_height), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        
        # Draw text background
        cv2.rectangle(annotated, (x1, y1 - text_height - 5), (x1 + text_width, y1), color, -1)
        
        # Draw text
        cv2.putText(annotated, label_text, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    
    return annotated

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
        
        print(f"📸 Image loaded: {img.shape[1]}x{img.shape[0]}")
        
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, model, img)
        
        # Process detections and get high-confidence boxes for annotation
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
        
        # Generate custom annotated image with ONLY high-confidence detections
        annotated = create_custom_annotated_image(img, high_conf_boxes, results)
        annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        image_base64 = encode_image_to_base64(annotated_rgb)
        
        response_data = {
            "predictions": detections,
            "count": len(detections),
            "image": image_base64,
            "confidence_threshold_used": 0.50
        }
        
        print(f"Final response: {len(detections)} detections with confidence ≥ 0.50")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during prediction")

@router.get("/health")
async def health_check():
    return {
        "status": "healthy" if model else "unhealthy",
        "model_loaded": model is not None,
        "confidence_threshold": 0.50
    }
