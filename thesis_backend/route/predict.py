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

def filter_high_confidence_detections(results, confidence_threshold=0.5):
    """Filter results to only include high-confidence detections"""
    detections = []
    labels = []
    
    # Get the first result (single image inference)
    result = results[0]
    
    # Filter boxes based on confidence
    high_conf_indices = []
    
    if result.boxes is not None:
        for i, box in enumerate(result.boxes):
            conf = float(box.conf)
            if conf >= confidence_threshold:
                high_conf_indices.append(i)
                
                cls = int(box.cls)
                label = result.names[cls]
                
                detections.append({
                    "label": label,
                    "confidence": conf,
                    "box": box.xyxy[0].tolist()
                })
                labels.append(label)
    
    return detections, labels, high_conf_indices

def create_filtered_annotation(original_img, results, high_conf_indices):
    """Create annotated image with only high-confidence detections and LARGE text"""
    # Start with original image
    annotated = original_img.copy()
    
    # Colors for different classes
    colors = [
        (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), 
        (255, 0, 255), (0, 255, 255), (128, 0, 0), (0, 128, 0)
    ]
    
    result = results[0]
    
    if result.boxes is not None:
        for i in high_conf_indices:
            box = result.boxes[i]
            
            # Get box coordinates
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            
            # Get class info
            cls = int(box.cls)
            label = result.names[cls]
            conf = float(box.conf)
            
            # Choose color
            color = colors[cls % len(colors)]
            
            # Draw thicker bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 4)
            
            # Create label text
            label_text = f"{label} {conf:.2f}"
            
            # Use LARGER font scale and thickness
            font_scale = 1.2  
            thickness = 3    
            font = cv2.FONT_HERSHEY_SIMPLEX
            
            # Calculate text size with larger font
            (text_width, text_height), baseline = cv2.getTextSize(
                label_text, font, font_scale, thickness
            )
            
            text_bg_y1 = max(y1 - text_height - 15, 0)  # More padding
            text_bg_y2 = y1
            text_y = max(y1 - 10, text_height + 5)
            
            if text_y > annotated.shape[0] - 10:
                text_y = y1 - 10
            
            # Draw larger text background with more padding
            cv2.rectangle(
                annotated, 
                (x1 - 5, text_bg_y1), 
                (x1 + text_width + 10, text_bg_y2), 
                color, 
                -1  # Filled rectangle
            )
            
            # Draw text with border for maximum visibility
            # First draw black border (thicker)
            cv2.putText(
                annotated, 
                label_text, 
                (x1 + 2, text_y), 
                font, 
                font_scale, 
                (0, 0, 0),  # Black border
                thickness + 2  # Thicker border
            )
            # Then draw white text
            cv2.putText(
                annotated, 
                label_text, 
                (x1 + 2, text_y), 
                font, 
                font_scale, 
                (255, 255, 255),  # White text
                thickness
            )
            
            print(f"📝 Drawing LARGE label: '{label_text}'")
    
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
        
        # Run inference (using async to avoid blocking)
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, model, img)
        
        # Process detections and get high-confidence indices
        detections, labels, high_conf_indices = filter_high_confidence_detections(results)
        
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
        
        # Generate annotated image with ONLY high-confidence detections and LARGE text
        annotated = create_filtered_annotation(img, results, high_conf_indices)
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

@router.get("/health")
async def health_check():
    return {
        "status": "healthy" if model else "unhealthy",
        "model_loaded": model is not None,
        "confidence_threshold": 0.50
    }
