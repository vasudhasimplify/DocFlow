"""
YOLO Face Detector Service
Detects faces/photo IDs in document images using YOLO model

This class is designed to work alongside signature detection to extract
both signatures and photo IDs from documents like applications, forms, etc.
"""

import logging
import os
from typing import List, Dict, Any, Optional
from PIL import Image
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None

logger = logging.getLogger(__name__)


class YOLOFaceDetector:
    """YOLO-based face/photo ID detector for document images"""
    
    def __init__(self):
        self.enabled = os.getenv("YOLO_FACE_ENABLED", "false").lower() == "true"
        self.model_path = os.getenv("YOLO_FACE_MODEL_PATH", "models/model.pt")
        self.confidence_threshold = float(os.getenv("YOLO_FACE_CONFIDENCE_THRESHOLD", "0.5"))
        self.iou_threshold = float(os.getenv("YOLO_FACE_IOU_THRESHOLD", "0.45"))
        self.use_gpu = os.getenv("YOLO_USE_GPU", "false").lower() == "true"
        self.model = None
        
        if self.enabled:
            self._load_model()
        else:
            logger.info("🔧 YOLO face detection disabled (set YOLO_FACE_ENABLED=true to enable)")
    
    def _load_model(self):
        """Load YOLO model for face detection with compatibility handling"""
        try:
            # Try to import ultralytics (YOLOv8/v11)
            try:
                from ultralytics import YOLO
                
                if not os.path.exists(self.model_path):
                    logger.warning(f"⚠️ YOLO face model not found at {self.model_path}. Face detection will be disabled.")
                    logger.info("💡 To enable face detection, provide a trained face detection model.")
                    self.enabled = False
                    return
                
                device = "cuda" if self.use_gpu else "cpu"
                
                # Load model with compatibility handling
                try:
                    # Standard loading
                    self.model = YOLO(self.model_path)
                    self.model.to(device)
                    
                    # Test model with a dummy image to catch compatibility issues early
                    try:
                        test_image = Image.new('RGB', (640, 640), color='white')
                        _ = self.model(test_image, verbose=False)
                        logger.debug("✅ Face model compatibility test passed")
                    except AttributeError as compat_error:
                        if "'Conv' object has no attribute 'bn'" in str(compat_error) or "has no attribute 'bn'" in str(compat_error):
                            logger.error(f"❌ YOLO face model compatibility error: {compat_error}")
                            logger.error("   This model file is incompatible with the current ultralytics version.")
                            logger.error("   Possible solutions:")
                            logger.error("   1) Update ultralytics: pip install --upgrade ultralytics")
                            logger.error("   2) Use a model file compatible with your ultralytics version")
                            logger.error("   3) Re-export the model with the current ultralytics version")
                            raise
                        else:
                            raise
                    except Exception as test_error:
                        logger.debug(f"   Face model test warning (non-critical): {test_error}")
                        
                except AttributeError as load_error:
                    if "'Conv' object has no attribute 'bn'" in str(load_error) or "has no attribute 'bn'" in str(load_error):
                        logger.error(f"❌ YOLO face model compatibility error during loading: {load_error}")
                        logger.warning("⚠️ YOLO face detection will be disabled due to model incompatibility.")
                        self.enabled = False
                        self.model = None
                        return
                    else:
                        raise
                
                # Log model info
                num_classes = len(self.model.names) if hasattr(self.model, 'names') else 0
                class_names = list(self.model.names.values()) if hasattr(self.model, 'names') else []
                
                logger.info(f"✅ YOLO face detector loaded - Model: {self.model_path}, Device: {device}")
                logger.info(f"   Classes: {num_classes} - {class_names}")
                logger.info(f"   Confidence threshold: {self.confidence_threshold}, IoU threshold: {self.iou_threshold}")
                
                # Check if model has face class
                has_face_class = any(name.lower() in ["face", "person", "photo", "photo_id", "portrait"] for name in class_names)
                if not has_face_class and num_classes > 0:
                    logger.warning(f"⚠️  Model classes don't explicitly include 'face': {class_names}")
                    logger.info("   Will treat class 0 detections as faces.")
                
            except ImportError:
                logger.warning("⚠️ ultralytics not installed. Install with: pip install ultralytics")
                logger.warning("⚠️ YOLO face detection will be disabled.")
                self.enabled = False
                
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO face model: {e}")
            logger.warning("⚠️ YOLO face detection will be disabled.")
            self.enabled = False
    
    def detect_faces_in_image(self, image: Image.Image) -> List[Dict[str, Any]]:
        """
        Detect faces/photo IDs in an image using YOLO
        
        Args:
            image: PIL Image from document page
        
        Returns:
            List of detected faces with bbox and confidence
            Format: [{"bbox": [xmin, ymin, xmax, ymax], "confidence": float, "is_face": True, "class": "face"}, ...]
        """
        if not self.enabled or self.model is None:
            return []
        
        try:
            # Ensure image is in RGB format (YOLO expects RGB)
            if image.mode != "RGB":
                logger.debug(f"   Converting image from {image.mode} to RGB for face detection")
                if image.mode == "RGBA":
                    # Create white background for RGBA images
                    rgb_image = Image.new("RGB", image.size, (255, 255, 255))
                    rgb_image.paste(image, mask=image.split()[3])  # Use alpha channel as mask
                    image = rgb_image
                else:
                    image = image.convert("RGB")
            
            logger.debug(f"   YOLO face detection input: size={image.size}, mode={image.mode}")
            
            # Run YOLO inference
            results = self.model(image, conf=0.1, iou=self.iou_threshold, verbose=False)
            
            faces = []
            total_detections = 0
            all_detections_info = []
            
            for result in results:
                boxes = result.boxes
                if boxes is None or len(boxes) == 0:
                    logger.debug(f"   YOLO face detector returned empty boxes")
                    continue
                
                total_detections += len(boxes)
                logger.info(f"   🔍 YOLO found {len(boxes)} total detection(s) (checking for faces)")
                
                for box in boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    bbox = box.xyxy[0].cpu().numpy().tolist()
                    
                    # Get class name
                    class_name = result.names.get(cls, "unknown")
                    
                    # Check if this is a face class
                    # Accept: "face", "person", "photo", "photo_id", "portrait", or class 0
                    is_face = class_name.lower() in ["face", "person", "photo", "photo_id", "portrait"] or cls == 0
                    
                    all_detections_info.append({
                        "class": class_name,
                        "class_id": cls,
                        "confidence": conf,
                        "is_face": is_face
                    })
                    logger.debug(f"   🔍 Detection: class='{class_name}' (id={cls}), confidence={conf:.3f}, is_face={is_face}")
                    
                    if is_face and conf >= self.confidence_threshold:
                        faces.append({
                            "bbox": [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])],  # [xmin, ymin, xmax, ymax]
                            "confidence": conf,
                            "is_face": True,
                            "class": class_name,
                            "type": "photo_id"  # Mark as photo ID for document processing
                        })
                        logger.info(f"   ✅ Added face/photo ID: bbox={[int(b) for b in bbox]}, confidence={conf:.3f}")
                    elif is_face and conf < self.confidence_threshold:
                        logger.debug(f"   ⚠️ Face detected but confidence {conf:.3f} < threshold {self.confidence_threshold}")
            
            if total_detections > 0 and len(faces) == 0:
                logger.debug(f"⚠️ YOLO found {total_detections} detection(s) but none matched face criteria")
            
            if faces:
                logger.info(f"✅ YOLO detected {len(faces)} face(s)/photo ID(s) in image")
            else:
                logger.debug(f"   No faces detected in this image")
            
            return faces
            
        except AttributeError as compat_error:
            error_msg = str(compat_error)
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error(f"❌ YOLO face detection error: Model compatibility issue")
                logger.error(f"   Error: {error_msg}")
                return []
            else:
                logger.error(f"❌ YOLO face detection error (AttributeError): {compat_error}")
                return []
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"❌ YOLO face detection error ({error_type}): {error_msg}")
            return []
    
    def detect_faces_in_images_batch(self, images: List[Image.Image]) -> List[List[Dict[str, Any]]]:
        """
        Detect faces/photo IDs in multiple images using batch YOLO inference
        
        Args:
            images: List of PIL Images to process in batch
        
        Returns:
            List of detection results, one per input image
            Format: [[{"bbox": [...], "confidence": float, "is_face": True}, ...], ...]
        """
        if not self.enabled or self.model is None or not images:
            return [[] for _ in images]
        
        try:
            # Preprocess all images to RGB format
            rgb_images = []
            for idx, image in enumerate(images):
                if image.mode != "RGB":
                    logger.debug(f"   Batch face image {idx}: Converting from {image.mode} to RGB")
                    if image.mode == "RGBA":
                        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
                        rgb_image.paste(image, mask=image.split()[3])
                        rgb_images.append(rgb_image)
                    else:
                        rgb_images.append(image.convert("RGB"))
                else:
                    rgb_images.append(image)
            
            logger.debug(f"🔍 Running batch face detection on {len(rgb_images)} images")
            
            import time
            batch_start_time = time.time()
            
            # Run YOLO inference in batch
            try:
                results = self.model(rgb_images, conf=0.1, iou=self.iou_threshold, verbose=False)
                batch_elapsed = time.time() - batch_start_time
                logger.debug(f"   Batch face detection completed in {batch_elapsed:.2f}s ({len(rgb_images)} images)")
            except AttributeError as compat_error:
                batch_elapsed = time.time() - batch_start_time
                error_msg = str(compat_error)
                if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                    logger.error(f"   Batch face detection failed: Model compatibility error")
                    raise RuntimeError("YOLO_MODEL_INCOMPATIBLE") from compat_error
                else:
                    raise
            except Exception as e:
                batch_elapsed = time.time() - batch_start_time
                logger.error(f"   Batch face detection failed after {batch_elapsed:.2f}s: {e}")
                raise
            
            # Process results for each image
            all_faces = []
            for img_idx, result in enumerate(results):
                faces = []
                boxes = result.boxes
                
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        bbox = box.xyxy[0].cpu().numpy().tolist()
                        
                        class_name = result.names.get(cls, "unknown")
                        is_face = class_name.lower() in ["face", "person", "photo", "photo_id", "portrait"] or cls == 0
                        
                        if is_face and conf >= self.confidence_threshold:
                            faces.append({
                                "bbox": [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])],
                                "confidence": conf,
                                "is_face": True,
                                "class": class_name,
                                "type": "photo_id"
                            })
                
                all_faces.append(faces)
                if faces:
                    logger.debug(f"   Batch image {img_idx}: Found {len(faces)} face(s)")
            
            logger.info(f"✅ Batch face detection complete: {len([f for f in all_faces if f])} images with faces out of {len(images)}")
            return all_faces
            
        except RuntimeError as runtime_error:
            error_msg = str(runtime_error)
            if "YOLO_MODEL_INCOMPATIBLE" in error_msg:
                logger.error(f"❌ Batch face detection failed: Model incompatibility detected")
                return self._fallback_individual_detection(images)
            else:
                raise
        except Exception as e:
            import traceback
            error_msg = str(e) if str(e) else f"{type(e).__name__} (no message)"
            error_type = type(e).__name__
            logger.error(f"❌ Batch face detection error: {error_type}: {error_msg}")
            logger.warning(f"⚠️ Falling back to individual face detection for {len(images)} images")
            return self._fallback_individual_detection(images)
    
    def _fallback_individual_detection(self, images: List[Image.Image]) -> List[List[Dict[str, Any]]]:
        """
        Fallback method: Process images individually when batch fails
        """
        individual_results = []
        success_count = 0
        failure_count = 0
        
        for idx, img in enumerate(images):
            try:
                result = self.detect_faces_in_image(img)
                individual_results.append(result)
                if result:
                    success_count += 1
            except Exception as individual_error:
                error_type = type(individual_error).__name__
                error_msg = str(individual_error)
                logger.warning(f"   ⚠️ Image {idx}: Individual face detection failed ({error_type}): {error_msg}")
                individual_results.append([])
                failure_count += 1
        
        if failure_count > 0:
            logger.warning(f"⚠️ Individual face detection fallback: {success_count} succeeded, {failure_count} failed out of {len(images)}")
        else:
            logger.info(f"✅ Individual face detection fallback: All {len(images)} images processed successfully")
        
        return individual_results
    
    def is_enabled(self) -> bool:
        """Check if face detection is enabled"""
        return self.enabled and self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        if not self.enabled or self.model is None:
            return {
                "enabled": False,
                "model_path": self.model_path,
                "reason": "Model not loaded or disabled"
            }
        
        return {
            "enabled": True,
            "model_path": self.model_path,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "use_gpu": self.use_gpu,
            "num_classes": len(self.model.names) if hasattr(self.model, 'names') else 0,
            "class_names": list(self.model.names.values()) if hasattr(self.model, 'names') else []
        }
