# Images Folder

This folder contains the logo and other image assets for the Microsyslogic Solar Plant Monitor application.

## Logo Setup

### File: `logo.png`

Replace the placeholder `logo.png` file with your actual Microsyslogic logo.

**Requirements:**
- **Format**: PNG (recommended for transparency support)
- **Size**: 128x128 pixels (or similar square aspect ratio)
- **Background**: Transparent (recommended)
- **Quality**: High resolution for crisp display

### Usage

The logo is automatically imported and used in:
- Welcome page (main landing page)
- Admin Login page
- User Login page

### Fallback

If the logo fails to load, the system will automatically fallback to the original gradient circle with an icon:
- Welcome page: Sun icon
- Admin Login: LogIn icon  
- User Login: LogIn icon

### Adding Your Logo

1. Replace `logo.png` in this folder with your actual logo file
2. Ensure the file is named exactly `logo.png`
3. The logo will automatically appear on all login pages
4. No code changes are required

### File Structure

```
src/
├── images/
│   ├── logo.png          # Main logo file
│   └── README.md         # This file
└── ...
```

### Technical Details

The logo is imported using ES6 modules:
```typescript
import logo from '@/images/logo.png';
```

And displayed with error handling:
```typescript
<img 
  src={logo} 
  alt="Microsyslogic Logo" 
  className="w-32 h-32 object-contain"
  onError={fallbackHandler}
/>
```
