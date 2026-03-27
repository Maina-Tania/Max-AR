# Computer Vision Model Training Guide

## Overview

This guide covers training the asset identification CV model using IBM Watson Studio CV Lab.

## Model Specifications

- **Architecture**: EfficientNet-B3 CNN
- **Input**: RGB images 224x224 pixels
- **Output Classes**: 5 (TRANSFORMER, GENERATOR, SWITCHGEAR, PUMP, VALVE)
- **Target Accuracy**: >85% on validation set
- **Training Platform**: IBM Watson Studio CV Lab (AutoML)
- **Export Format**: ONNX for HoloLens 2 deployment

## Image Collection Strategy

### Option 1: Real Site Photography (Preferred)

**Requirements:**
- 500+ photos per class (2,500 total minimum)
- Multiple angles (every 30°: 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330)
- Various lighting conditions (daylight, overcast, direct sun, shadow, artificial, mixed)
- Different wear states (new, light wear, medium wear, heavy wear)
- Multiple sites/dates for test set (avoid data leakage)

**Naming Convention:**
```
{asset_type}_{asset_id}_{angle_deg}_{lighting}_{wear_state}_{seq}.jpg

Examples:
TRANSFORMER_KEN-TR-001_000_DAYLIGHT_HEAVY_WEAR_0001.jpg
GENERATOR_KEN-GEN-004_090_OVERCAST_MEDIUM_WEAR_0023.jpg
SWITCHGEAR_KEN-SWG-007_180_ARTIFICIAL_LIGHT_WEAR_0045.jpg
```

**Photography Checklist:**
- [ ] Camera settings: Auto mode, 12MP minimum
- [ ] Distance: 2-5 meters from asset
- [ ] Include asset nameplate in at least 3 photos per asset
- [ ] Capture in different weather conditions
- [ ] Document GPS coordinates
- [ ] Get permission from site management

### Option 2: Public Image Sources (Demo/POC)

**For rapid prototyping when site access is unavailable:**

#### Wikimedia Commons
- Search: "power transformer", "industrial generator", "high voltage switchgear"
- Filter: High resolution (>1024px)
- License: Public domain or CC-BY

#### Unsplash / Pexels
- Search: "substation equipment", "industrial machinery", "electrical equipment"
- Download: Original size
- License: Free for commercial use

#### Manufacturer Catalogs
- ABB: Transformer product photos
- Schneider Electric: Switchgear images
- Cummins: Generator set photos
- Grundfos: Industrial pump images
- Crane: Valve product photos

**Minimum for Demo:**
- 50 images per class (250 total)
- Still achieves 75-80% accuracy
- Sufficient for proof-of-concept

## Data Organization

### Directory Structure

```
data/
├── transformer/
│   ├── train/
│   ├── validation/
│   └── test/
├── generator/
│   ├── train/
│   ├── validation/
│   └── test/
├── switchgear/
│   ├── train/
│   ├── validation/
│   └── test/
├── pump/
│   ├── train/
│   ├── validation/
│   └── test/
└── valve/
    ├── train/
    ├── validation/
    └── test/
```

### Split Ratios

- **Train**: 70% (for learning patterns)
- **Validation**: 15% (for hyperparameter tuning)
- **Test**: 15% (for final accuracy measurement)

**CRITICAL**: Test set MUST be from different site or date than training set to avoid data leakage.

## Image Preprocessing

### Automated Script

Create `data/preprocess_images.py`:

```python
import cv2
import os
from pathlib import Path

def preprocess_image(input_path, output_path, target_size=(224, 224)):
    """Resize and normalize image for Watson Studio"""
    img = cv2.imread(str(input_path))
    if img is None:
        print(f"Failed to load: {input_path}")
        return False
    
    # Resize
    img_resized = cv2.resize(img, target_size, interpolation=cv2.INTER_LANCZOS4)
    
    # Save
    cv2.imwrite(str(output_path), img_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return True

def process_directory(input_dir, output_dir):
    """Process all images in directory"""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    count = 0
    for img_file in input_path.glob('*.jpg'):
        output_file = output_path / img_file.name
        if preprocess_image(img_file, output_file):
            count += 1
    
    print(f"Processed {count} images in {input_dir}")

# Process all classes
for asset_type in ['transformer', 'generator', 'switchgear', 'pump', 'valve']:
    for split in ['train', 'validation', 'test']:
        input_dir = f'data/{asset_type}/{split}'
        output_dir = f'data/{asset_type}/{split}_processed'
        if os.path.exists(input_dir):
            process_directory(input_dir, output_dir)
```

Run:
```bash
pip install opencv-python
python data/preprocess_images.py
```

## Watson Studio CV Lab Training

### Step 1: Access Watson Studio

1. Go to https://dataplatform.cloud.ibm.com
2. Sign in with IBM Cloud credentials
3. Navigate to Projects → Your watsonx.ai project
4. Click "New asset" → "AutoAI experiment" → "Computer Vision"

### Step 2: Create CV Project

1. Name: `MaxAR-AssetCV-v1`
2. Description: "Asset identification for MaxAR Field Engineer"
3. Click "Create"

### Step 3: Upload Training Data

1. Click "Add training data"
2. Upload images by class:
   - Create label: "TRANSFORMER"
   - Upload all transformer/train images
   - Repeat for GENERATOR, SWITCHGEAR, PUMP, VALVE
3. Verify class distribution (should be roughly equal)

### Step 4: Configure Training

**Settings:**
- Model type: Image Classification
- Optimization metric: Accuracy
- Training time: 2-4 hours (depends on image count)
- Data augmentation: Enable
  - Random brightness: ±30%
  - Random contrast: ±20%
  - Horizontal flip: Yes
  - Rotation: -15° to +15°
  - Zoom: 0.9 to 1.1

### Step 5: Start Training

1. Click "Train model"
2. Monitor progress in dashboard
3. Training completes when accuracy plateaus

### Step 6: Evaluate Results

**Check validation metrics:**
- Overall accuracy: Target >85%
- Per-class accuracy: All classes >80%
- Confusion matrix: Low cross-class confusion
- Precision/Recall: Balanced for all classes

**If accuracy < 85%:**
- Add more training images
- Increase data augmentation
- Train for more epochs
- Check for class imbalance

### Step 7: Export Model

1. Click "Save model"
2. Export format: ONNX
3. Download: `maxar_asset_cv_v1.onnx`
4. Save to project root or backend folder

## Model Integration

### For HoloLens 2 (Unity)

```csharp
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

public class AssetIdentifier
{
    private InferenceSession session;
    private string[] classes = { "TRANSFORMER", "GENERATOR", "SWITCHGEAR", "PUMP", "VALVE" };
    
    public void LoadModel(string modelPath)
    {
        session = new InferenceSession(modelPath);
    }
    
    public (string assetType, float confidence) Identify(Texture2D image)
    {
        // Preprocess image to 224x224
        var tensor = PreprocessImage(image);
        
        // Run inference
        var inputs = new List<NamedOnnxValue> { 
            NamedOnnxValue.CreateFromTensor("input", tensor) 
        };
        var results = session.Run(inputs);
        
        // Get predictions
        var output = results.First().AsEnumerable<float>().ToArray();
        int maxIndex = Array.IndexOf(output, output.Max());
        
        return (classes[maxIndex], output[maxIndex]);
    }
}
```

### For Demo Dashboard (Simulated)

The current dashboard simulates CV identification. To integrate real model:

1. Deploy ONNX model to backend
2. Create inference endpoint in FastAPI
3. Update frontend to upload image and call endpoint

## Testing & Validation

### Test Set Evaluation

```python
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

# Load test predictions
y_true = []  # Actual labels
y_pred = []  # Model predictions

# Generate report
print(classification_report(y_true, y_pred, target_names=classes))
print("\nConfusion Matrix:")
print(confusion_matrix(y_true, y_pred))
```

### Field Testing Checklist

- [ ] Test on actual KenGen/KPC equipment
- [ ] Various lighting conditions
- [ ] Different angles and distances
- [ ] Partially obscured assets
- [ ] Dirty/weathered equipment
- [ ] Measure inference time on HoloLens

### Acceptance Criteria

- [ ] Validation accuracy >85%
- [ ] Test accuracy >80%
- [ ] All classes >75% accuracy
- [ ] Inference time <200ms on HoloLens
- [ ] Confidence threshold 0.60 works well
- [ ] No systematic bias toward any class

## Retraining Triggers

Retrain the model when:
- Field accuracy drops below 75%
- New asset types added
- Significant environmental changes
- 500+ new photos collected
- Quarterly maintenance schedule

## Troubleshooting

### Low Accuracy (<80%)

**Causes:**
- Insufficient training data
- Class imbalance
- Poor image quality
- Data leakage (test set too similar to train)

**Solutions:**
- Collect more diverse images
- Balance classes (500+ each)
- Improve image quality
- Ensure test set from different site/date

### High Training, Low Validation Accuracy

**Cause:** Overfitting

**Solutions:**
- Increase data augmentation
- Add more training images
- Reduce model complexity
- Use regularization

### Slow Inference on HoloLens

**Causes:**
- Model too large
- Inefficient preprocessing

**Solutions:**
- Use quantized ONNX model
- Optimize image preprocessing
- Consider MobileNet architecture

## Resources

- IBM Watson Studio Docs: https://dataplatform.cloud.ibm.com/docs
- ONNX Runtime: https://onnxruntime.ai/
- EfficientNet Paper: https://arxiv.org/abs/1905.11946
- Data Augmentation Guide: https://www.ibm.com/docs/en/watson-studio

## Next Steps

1. Collect or source 250+ images (50 per class minimum)
2. Organize into train/val/test splits
3. Upload to Watson Studio CV Lab
4. Train model (2-4 hours)
5. Evaluate and export ONNX
6. Integrate with dashboard or HoloLens app