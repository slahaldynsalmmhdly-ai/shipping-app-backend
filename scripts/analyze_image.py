#!/usr/bin/env python3.11
"""
سكريبت تحليل الصور باستخدام CLIP و BLIP
يستخدم نماذج خفيفة لتقليل استهلاك الذاكرة
"""

import sys
import json
import torch
from PIL import Image
from transformers import (
    CLIPProcessor, 
    CLIPModel,
    BlipProcessor, 
    BlipForConditionalGeneration
)
import warnings
warnings.filterwarnings('ignore')

# قائمة الفئات المحتملة للحمولات (للاستخدام مع CLIP)
CARGO_CATEGORIES = [
    "cardboard boxes",
    "sand pile",
    "steel bars",
    "furniture",
    "food items",
    "transport equipment",
    "trailer truck",
    "cement bags",
    "shipping container",
    "general cargo"
]

def load_models():
    """تحميل نماذج CLIP و BLIP"""
    try:
        # تحميل CLIP (نموذج خفيف)
        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        
        # تحميل BLIP (نموذج خفيف)
        blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        
        # نقل النماذج إلى CPU لتوفير الذاكرة
        clip_model = clip_model.to('cpu')
        blip_model = blip_model.to('cpu')
        
        return clip_model, clip_processor, blip_model, blip_processor
    except Exception as e:
        print(json.dumps({"error": f"فشل تحميل النماذج: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

def analyze_with_clip(image, clip_model, clip_processor):
    """تحليل الصورة باستخدام CLIP"""
    try:
        # معالجة الصورة والنصوص
        inputs = clip_processor(
            text=CARGO_CATEGORIES,
            images=image,
            return_tensors="pt",
            padding=True
        )
        
        # الحصول على النتائج
        with torch.no_grad():
            outputs = clip_model(**inputs)
        
        # حساب التشابه
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)
        
        # الحصول على أعلى 3 نتائج
        top_probs, top_indices = torch.topk(probs, k=min(3, len(CARGO_CATEGORIES)))
        
        clip_tags = []
        for i, idx in enumerate(top_indices[0]):
            clip_tags.append({
                "label": CARGO_CATEGORIES[idx.item()],
                "score": float(top_probs[0][i])
            })
        
        return clip_tags
    except Exception as e:
        print(json.dumps({"error": f"فشل تحليل CLIP: {str(e)}"}), file=sys.stderr)
        return []

def analyze_with_blip(image, blip_model, blip_processor):
    """توليد وصف للصورة باستخدام BLIP"""
    try:
        # معالجة الصورة
        inputs = blip_processor(image, return_tensors="pt")
        
        # توليد الوصف
        with torch.no_grad():
            out = blip_model.generate(**inputs, max_length=50)
        
        description = blip_processor.decode(out[0], skip_special_tokens=True)
        
        return description
    except Exception as e:
        print(json.dumps({"error": f"فشل تحليل BLIP: {str(e)}"}), file=sys.stderr)
        return ""

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "يجب تمرير مسار الصورة كمعامل"}), file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        # تحميل الصورة
        image = Image.open(image_path).convert('RGB')
        
        # تحميل النماذج
        clip_model, clip_processor, blip_model, blip_processor = load_models()
        
        # تحليل باستخدام CLIP
        clip_tags = analyze_with_clip(image, clip_model, clip_processor)
        
        # تحليل باستخدام BLIP
        blip_description = analyze_with_blip(image, blip_model, blip_processor)
        
        # إعداد النتيجة
        result = {
            "clip_tags": [tag["label"] for tag in clip_tags],
            "clip_scores": {tag["label"]: tag["score"] for tag in clip_tags},
            "blip_description": blip_description,
            "status": "success"
        }
        
        # طباعة النتيجة بصيغة JSON
        print(json.dumps(result, ensure_ascii=False))
        
    except FileNotFoundError:
        print(json.dumps({"error": f"الصورة غير موجودة: {image_path}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"خطأ في التحليل: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
