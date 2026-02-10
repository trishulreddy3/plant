# Solar Panel Health Condition Images

This folder contains images representing different solar panel health conditions used in the Visual Plant Monitor.

## Image Files

### image1.png - Healthy Panels (Green)
- **Health Range**: 90-100%
- **Color**: Green (#27ae60)
- **Condition**: Optimal performance, no issues
- **Usage**: Normal operating panels with excellent health

### image2.png - Warning Panels (Orange)  
- **Health Range**: 50-89%
- **Color**: Orange (#f39c12)
- **Condition**: Underperforming, needs attention
- **Usage**: 
  - Panels affected by cleaning requirements
  - Panels with moderate performance issues
  - Panels during certain repair stages

### image3.png - Critical Panels (Red)
- **Health Range**: <50%
- **Color**: Red (#e74c3c)
- **Condition**: Faulty, requires immediate attention
- **Usage**:
  - Electrical fault panels
  - Panels affected by series connection breaks
  - Panels in critical repair stages

## Panel States in Visual Monitor

The Visual Plant Monitor uses these images to represent different panel conditions:

1. **Normal Operation**: All panels show image1.png (green)
2. **Fault Detection**: Faulty panels and affected panels show image3.png (red), cleaning panels show image2.png (orange)
3. **Repair Process**: Panels transition through different images based on repair stage
4. **Repair Complete**: All panels return to image1.png (green)

## Image Requirements

- **Format**: PNG recommended for transparency support
- **Size**: Optimized for 24x35px display (can be larger, will be scaled)
- **Background**: Should work well with various backgrounds
- **Visual Clarity**: Must be clearly distinguishable at small sizes

## Replacement Instructions

To replace placeholder images with actual panel images:

1. Replace the placeholder text files with actual PNG images
2. Ensure images follow the color scheme and health conditions described above
3. Test in the Visual Plant Monitor to ensure proper display
4. Maintain the same file names (image1.png, image2.png, image3.png)
