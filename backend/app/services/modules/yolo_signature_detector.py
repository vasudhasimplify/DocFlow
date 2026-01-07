"""
YOLO Signature Detector Service
Detects signatures in image blocks using YOLO model
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

class YOLOSignatureDetector:
    """YOLO-based signature detector for image blocks"""
    
    def __init__(self):
        self.enabled = os.getenv("YOLO_SIGNATURE_ENABLED", "false").lower() == "true"
        self.model_path = os.getenv("YOLO_MODEL_PATH", "models/signature_detector.pt")
        self.confidence_threshold = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.5"))
        self.iou_threshold = float(os.getenv("YOLO_IOU_THRESHOLD", "0.45"))
        self.use_gpu = os.getenv("YOLO_USE_GPU", "false").lower() == "true"
        self.model = None
        
        if self.enabled:
            self._load_model()
        else:
            logger.info("🔧 YOLO signature detection disabled (set YOLO_SIGNATURE_ENABLED=true to enable)")
    
    def _load_model(self):
        """Load YOLO model with compatibility handling"""
        try:
            # Try to import ultralytics (YOLOv8)
            try:
                from ultralytics import YOLO
                
                if not os.path.exists(self.model_path):
                    logger.warning(f"⚠️ YOLO model not found at {self.model_path}. YOLO detection will be disabled.")
                    logger.info("💡 To enable YOLO detection, provide a trained signature detection model.")
                    self.enabled = False
                    return
                
                device = "cuda" if self.use_gpu else "cpu"
                
                # Fix: Try loading model with compatibility options
                try:
                    # First attempt: Standard loading
                    self.model = YOLO(self.model_path)
                    self.model.to(device)
                    
                    # Test model with a dummy image to catch compatibility issues early
                    try:
                        from PIL import Image
                        import numpy as np
                        test_image = Image.new('RGB', (640, 640), color='white')
                        _ = self.model(test_image, verbose=False)
                        logger.debug("✅ Model compatibility test passed")
                    except AttributeError as compat_error:
                        if "'Conv' object has no attribute 'bn'" in str(compat_error) or "has no attribute 'bn'" in str(compat_error):
                            logger.error(f"❌ YOLO model compatibility error: {compat_error}")
                            logger.error("   This model file is incompatible with the current ultralytics version.")
                            logger.error("   Possible solutions:")
                            logger.error("   1) Update ultralytics: pip install --upgrade ultralytics")
                            logger.error("   2) Use a model file compatible with your ultralytics version")
                            logger.error("   3) Re-export the model with the current ultralytics version")
                            raise
                        else:
                            raise
                    except Exception as test_error:
                        # Other errors during test - log but don't fail (might be model-specific)
                        logger.debug(f"   Model test warning (non-critical): {test_error}")
                        
                except AttributeError as load_error:
                    if "'Conv' object has no attribute 'bn'" in str(load_error) or "has no attribute 'bn'" in str(load_error):
                        logger.error(f"❌ YOLO model compatibility error during loading: {load_error}")
                        logger.error("   This model file is incompatible with the current ultralytics version.")
                        logger.error("   Possible solutions:")
                        logger.error("   1) Update ultralytics: pip install --upgrade ultralytics")
                        logger.error("   2) Use a model file compatible with your ultralytics version")
                        logger.error("   3) Re-export the model with the current ultralytics version")
                        logger.warning("⚠️ YOLO signature detection will be disabled due to model incompatibility.")
                        self.enabled = False
                        self.model = None
                        return
                    else:
                        raise
                
                # Check if this is a COCO base model (80 classes, class 0 = "person")
                num_classes = len(self.model.names) if hasattr(self.model, 'names') else 0
                class_0_name = self.model.names.get(0, "unknown") if hasattr(self.model, 'names') else "unknown"
                
                logger.info(f"✅ YOLO signature detector loaded - Model: {self.model_path}, Device: {device}")
                logger.info(f"   Confidence threshold: {self.confidence_threshold}, IoU threshold: {self.iou_threshold}")
                
                # Warn if this appears to be a COCO base model (not signature-specific)
                if num_classes == 80 and class_0_name.lower() == "person":
                    logger.warning("⚠️  WARNING: This appears to be a COCO base model (80 classes, class 0 = 'person')")
                    logger.warning("⚠️  This model is NOT trained for signature detection and will likely not work correctly.")
                    logger.warning("💡  You need a model trained specifically for signature detection.")
                    logger.warning("💡  See YOLO_MODEL_GUIDE.md for instructions on getting a signature detection model.")
                elif "signature" not in str(self.model.names).lower() and "sig" not in str(self.model.names).lower():
                    logger.warning("⚠️  WARNING: This model doesn't appear to have a 'signature' class.")
                    logger.warning("💡  The model may not detect signatures correctly. Consider using a signature-specific model.")
                
            except ImportError:
                logger.warning("⚠️ ultralytics not installed. Install with: pip install ultralytics")
                logger.warning("⚠️ YOLO signature detection will be disabled.")
                self.enabled = False
                
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            logger.warning("⚠️ YOLO signature detection will be disabled.")
            self.enabled = False
    
    def detect_signatures_in_image(self, image: Image.Image) -> List[Dict[str, Any]]:
        """
        Detect signatures in an image block using YOLO
        
        Args:
            image: PIL Image from image block
        
        Returns:
            List of detected signatures with bbox and confidence
            Format: [{"bbox": [xmin, ymin, xmax, ymax], "confidence": float, "is_signature": True}, ...]
        """
        if not self.enabled or self.model is None:
            return []
        
        try:
            # Ensure image is in RGB format (YOLO expects RGB)
            if image.mode != "RGB":
                logger.debug(f"   Converting image from {image.mode} to RGB for YOLO")
                if image.mode == "RGBA":
                    # Create white background for RGBA images
                    rgb_image = Image.new("RGB", image.size, (255, 255, 255))
                    rgb_image.paste(image, mask=image.split()[3])  # Use alpha channel as mask
                    image = rgb_image
                else:
                    image = image.convert("RGB")
            
            # Log image info for debugging
            logger.debug(f"   YOLO input image: size={image.size}, mode={image.mode}")
            
            # Run YOLO inference
            # Use lower confidence for initial detection to see ALL detections
            # Then filter by our threshold
            results = self.model(image, conf=0.1, iou=self.iou_threshold, verbose=False)
            
            signatures = []
            
            # Process results
            total_detections = 0
            all_detections_info = []
            for result in results:
                boxes = result.boxes
                if boxes is None or len(boxes) == 0:
                    logger.debug(f"   YOLO returned empty boxes for this result")
                    continue
                
                total_detections += len(boxes)
                logger.info(f"   🔍 YOLO found {len(boxes)} total detection(s) (checking for signatures)")
                
                for box in boxes:
                    # Get class (assuming class 0 is "signature" or check class name)
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    # Get bounding box (xyxy format: [xmin, ymin, xmax, ymax])
                    bbox = box.xyxy[0].cpu().numpy().tolist()
                    
                    # Check if this is a signature class
                    # Assuming class 0 is signature, or check class name
                    class_name = result.names.get(cls, "unknown")
                    is_signature = class_name.lower() in ["signature", "sig"] or cls == 0
                    
                    # Log ALL detections for debugging
                    all_detections_info.append({
                        "class": class_name,
                        "class_id": cls,
                        "confidence": conf,
                        "is_signature": is_signature
                    })
                    logger.info(f"   🔍 Detection #{len(all_detections_info)}: class='{class_name}' (id={cls}), confidence={conf:.3f}, is_signature={is_signature}, threshold={self.confidence_threshold}")
                    
                    if is_signature and conf >= self.confidence_threshold:
                        signatures.append({
                            "bbox": [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])],  # [xmin, ymin, xmax, ymax]
                            "confidence": conf,
                            "is_signature": True,
                            "class": class_name
                        })
                        logger.info(f"   ✅ Added signature: bbox={bbox}, confidence={conf:.3f}")
                    elif is_signature and conf < self.confidence_threshold:
                        logger.warning(f"   ⚠️ Signature detected but confidence {conf:.3f} < threshold {self.confidence_threshold}")
                    elif not is_signature:
                        logger.debug(f"   ℹ️ Detection is not a signature (class='{class_name}', id={cls})")
            
            if total_detections > 0 and len(signatures) == 0:
                logger.warning(f"⚠️ YOLO found {total_detections} detection(s) but none matched signature criteria (class name or confidence threshold)")
                logger.warning(f"   📊 All detections: {all_detections_info}")
                logger.warning(f"   💡 Consider: 1) Lower confidence threshold (current: {self.confidence_threshold}), 2) Check if model has 'signature' class")
            
            if signatures:
                logger.info(f"✅ YOLO detected {len(signatures)} signature(s) in image")
            else:
                if total_detections == 0:
                    logger.warning(f"⚠️ YOLO found NO detections at all (total: 0). This suggests:")
                    logger.warning(f"   1) Model may not be detecting anything in this image")
                    logger.warning(f"   2) Model may not be loaded correctly")
                    logger.warning(f"   3) Image may not be suitable for detection")
                    logger.warning(f"   Current confidence threshold: {self.confidence_threshold}, IoU: {self.iou_threshold}")
                else:
                    logger.debug(f"   YOLO found {total_detections} detection(s) but no signatures matched criteria")
            
            return signatures
            
        except AttributeError as compat_error:
            # Fix: Catch model compatibility errors specifically
            error_msg = str(compat_error)
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error(f"❌ YOLO detection error: Model compatibility issue")
                logger.error(f"   Error: {error_msg}")
                logger.error("   This YOLO model file is incompatible with the current ultralytics version.")
                logger.error("   Solutions:")
                logger.error("   1) Update ultralytics: pip install --upgrade ultralytics")
                logger.error("   2) Use a compatible model file")
                logger.error("   3) Re-export model with current ultralytics version")
                return []
            else:
                # Other AttributeError - log and return empty
                logger.error(f"❌ YOLO detection error (AttributeError): {compat_error}")
                return []
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"❌ YOLO detection error ({error_type}): {error_msg}")
            # Check for common recoverable errors
            if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
                logger.warning("   CUDA OOM - consider reducing batch size or using CPU")
            elif "timeout" in error_msg.lower():
                logger.warning("   Timeout - YOLO processing took too long")
            return []
    
    def detect_signatures_in_images_batch(self, images: List[Image.Image]) -> List[List[Dict[str, Any]]]:
        """
        Detect signatures in multiple images using batch YOLO inference (Priority 1 optimization)
        
        Args:
            images: List of PIL Images to process in batch
        
        Returns:
            List of detection results, one per input image
            Each result is a list of detected signatures with bbox and confidence
            Format: [[{"bbox": [...], "confidence": float, "is_signature": True}, ...], ...]
        """
        if not self.enabled or self.model is None or not images:
            return [[] for _ in images]
        
        try:
            # Preprocess all images to RGB format
            rgb_images = []
            for idx, image in enumerate(images):
                if image.mode != "RGB":
                    logger.debug(f"   Batch image {idx}: Converting from {image.mode} to RGB")
                    if image.mode == "RGBA":
                        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
                        rgb_image.paste(image, mask=image.split()[3])
                        rgb_images.append(rgb_image)
                    else:
                        rgb_images.append(image.convert("RGB"))
                else:
                    rgb_images.append(image)
            
            logger.debug(f"🔍 Running batch YOLO detection on {len(rgb_images)} images")
            
            # Fix: Add timing for batch processing to monitor performance
            import time
            batch_start_time = time.time()
            
            # Run YOLO inference in batch (much faster than sequential)
            # YOLO model supports batch inference natively
            try:
                results = self.model(rgb_images, conf=0.1, iou=self.iou_threshold, verbose=False)
                batch_elapsed = time.time() - batch_start_time
                logger.debug(f"   Batch YOLO inference completed in {batch_elapsed:.2f}s ({len(rgb_images)} images)")
            except AttributeError as compat_error:
                # Fix: Catch model compatibility errors specifically
                batch_elapsed = time.time() - batch_start_time
                error_msg = str(compat_error)
                if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                    logger.error(f"   Batch YOLO inference failed after {batch_elapsed:.2f}s: Model compatibility error")
                    logger.error(f"   Error: {error_msg}")
                    logger.error("   This indicates the YOLO model file is incompatible with the ultralytics version.")
                    logger.error("   Falling back to individual detection (slower but may work)")
                    # Don't raise - let it fall through to individual detection fallback
                    raise RuntimeError("YOLO_MODEL_INCOMPATIBLE") from compat_error
                else:
                    # Other AttributeError - re-raise as-is
                    batch_elapsed = time.time() - batch_start_time
                    logger.error(f"   Batch YOLO inference failed after {batch_elapsed:.2f}s: {compat_error}")
                    raise
            except Exception as e:
                batch_elapsed = time.time() - batch_start_time
                error_msg = str(e)
                error_type = type(e).__name__
                logger.error(f"   Batch YOLO inference failed after {batch_elapsed:.2f}s: {error_type}: {error_msg}")
                # Check if it's a known recoverable error
                if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
                    logger.warning("   CUDA OOM error - batch size too large, falling back to individual detection")
                    raise RuntimeError("YOLO_CUDA_OOM") from e
                elif "timeout" in error_msg.lower():
                    logger.warning("   Timeout error - batch processing too slow, falling back to individual detection")
                    raise RuntimeError("YOLO_TIMEOUT") from e
                else:
                    raise
            
            # Process results for each image
            all_signatures = []
            for img_idx, result in enumerate(results):
                signatures = []
                boxes = result.boxes
                
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        bbox = box.xyxy[0].cpu().numpy().tolist()
                        
                        # Check if this is a signature class
                        class_name = result.names.get(cls, "unknown")
                        is_signature = class_name.lower() in ["signature", "sig"] or cls == 0
                        
                        if is_signature and conf >= self.confidence_threshold:
                            signatures.append({
                                "bbox": [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])],
                                "confidence": conf,
                                "is_signature": True,
                                "class": class_name
                            })
                
                all_signatures.append(signatures)
                if signatures:
                    logger.debug(f"   Batch image {img_idx}: Found {len(signatures)} signature(s)")
            
            logger.info(f"✅ Batch YOLO detection complete: {len([s for s in all_signatures if s])} images with signatures out of {len(images)}")
            return all_signatures
            
        except RuntimeError as runtime_error:
            # Fix: Handle specific runtime errors (compatibility, OOM, timeout)
            error_msg = str(runtime_error)
            if "YOLO_MODEL_INCOMPATIBLE" in error_msg:
                logger.error(f"❌ Batch YOLO detection failed: Model incompatibility detected")
                logger.error("   The YOLO model file is incompatible with the current ultralytics version.")
                logger.error("   Attempting fallback to individual detection (may also fail if model is incompatible)")
                
                # Try individual detection, but expect it may also fail
                try:
                    individual_results = []
                    for idx, img in enumerate(images):
                        try:
                            result = self.detect_signatures_in_image(img)
                            individual_results.append(result)
                        except AttributeError as compat_err:
                            if "'Conv' object has no attribute 'bn'" in str(compat_err):
                                logger.error(f"   ❌ Individual detection also failed: Model incompatibility")
                                logger.error(f"   Image {idx}: Cannot use this YOLO model - please update model file or ultralytics version")
                                individual_results.append([])
                            else:
                                logger.warning(f"   Individual detection failed for image {idx}: {compat_err}")
                                individual_results.append([])
                        except Exception as individual_error:
                            logger.warning(f"   Individual detection failed for image {idx}: {individual_error}")
                            individual_results.append([])
                    return individual_results
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback to individual detection also failed: {fallback_error}")
                    return [[] for _ in images]
            elif "YOLO_CUDA_OOM" in error_msg:
                logger.warning(f"⚠️ Batch YOLO detection failed: CUDA out of memory")
                logger.warning("   Falling back to individual detection with smaller batches")
                # Fallback to individual detection
                return self._fallback_individual_detection(images)
            elif "YOLO_TIMEOUT" in error_msg:
                logger.warning(f"⚠️ Batch YOLO detection failed: Timeout")
                logger.warning("   Falling back to individual detection")
                # Fallback to individual detection
                return self._fallback_individual_detection(images)
            else:
                # Other RuntimeError - treat as general error
                raise
        except Exception as e:
            # Fix: Better error logging with exception type and traceback
            import traceback
            error_msg = str(e) if str(e) else f"{type(e).__name__} (no message)"
            error_type = type(e).__name__
            error_traceback = traceback.format_exc()
            
            logger.error(f"❌ Batch YOLO detection error: {error_type}: {error_msg}")
            logger.debug(f"   Full traceback:\n{error_traceback}")
            
            # Check if it's a model compatibility error
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error("   ⚠️ Model compatibility issue detected - this YOLO model is incompatible")
                logger.error("   Solutions:")
                logger.error("   1) Update ultralytics: pip install --upgrade ultralytics")
                logger.error("   2) Use a compatible model file")
                logger.error("   3) Re-export model with current ultralytics version")
            
            # Fallback to individual detection if batch fails
            logger.warning(f"⚠️ Falling back to individual YOLO detection for {len(images)} images")
            return self._fallback_individual_detection(images)
    
    def _fallback_individual_detection(self, images: List[Image.Image]) -> List[List[Dict[str, Any]]]:
        """
        Fallback method: Process images individually when batch fails
        Includes better error handling per image
        """
        individual_results = []
        success_count = 0
        failure_count = 0
        
        for idx, img in enumerate(images):
            try:
                result = self.detect_signatures_in_image(img)
                individual_results.append(result)
                if result:
                    success_count += 1
            except AttributeError as compat_err:
                error_msg = str(compat_err)
                if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                    logger.error(f"   ❌ Image {idx}: Model incompatibility error - cannot process")
                    logger.error(f"   Error: {error_msg}")
                    individual_results.append([])
                    failure_count += 1
                else:
                    logger.warning(f"   ⚠️ Image {idx}: Detection failed: {compat_err}")
                    individual_results.append([])
                    failure_count += 1
            except Exception as individual_error:
                error_type = type(individual_error).__name__
                error_msg = str(individual_error)
                logger.warning(f"   ⚠️ Image {idx}: Individual detection failed ({error_type}): {error_msg}")
                individual_results.append([])
                failure_count += 1
        
        if failure_count > 0:
            logger.warning(f"⚠️ Individual detection fallback: {success_count} succeeded, {failure_count} failed out of {len(images)}")
        else:
            logger.info(f"✅ Individual detection fallback: All {len(images)} images processed successfully")
        
        return individual_results
    
    def is_enabled(self) -> bool:
        """Check if YOLO detection is enabled"""
        return self.enabled and self.model is not None

