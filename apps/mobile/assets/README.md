# Mobile Assets

The following asset files need to be created before the first EAS build:

- `icon.png` - App icon (1024x1024)
- `splash.png` - Splash screen (1024x1024)
- `adaptive-icon.png` - Android adaptive icon (1024x1024)
- `notification-icon.png` - Notification icon (1024x1024)

All should use the brand color `#1F6B45` (Kerala Green).

To generate placeholder assets, run:
```bash
pnpm add -D sharp
node generate-assets.js
```

Or create them using your design tool of choice (Figma, Sketch, etc.).
