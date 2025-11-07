# Build Resources Directory

This directory contains resources needed for building Astrid installers.

## Required Files (Currently Missing - Add Before Building)

### macOS Icons
- **icon.icns** - macOS application icon
  - Recommended size: 1024x1024 source image
  - Use tools like `iconutil` or online converters to create .icns from PNG
  - Resource: https://cloudconvert.com/png-to-icns

### Windows Icons
- **icon.ico** - Windows application icon
  - Must contain multiple sizes: 256x256, 128x128, 96x96, 64x64, 48x48, 32x32, 24x24, 16x16
  - Use tools like ImageMagick or online converters to create .ico from PNG
  - Resource: https://cloudconvert.com/png-to-ico

### Linux Icons
- **icons/** directory with PNG files at various sizes:
  - 16x16.png
  - 32x32.png
  - 48x48.png
  - 64x64.png
  - 128x128.png
  - 256x256.png
  - 512x512.png
  - 1024x1024.png

## Existing Files

### entitlements.mac.plist
Defines security entitlements for macOS builds. Already configured with necessary permissions for Electron apps with native modules.

## Next Steps

1. Create your app icon as a high-resolution PNG (1024x1024 recommended)
2. Convert it to the required formats using the tools mentioned above
3. Place the icon files in this directory
4. Test builds will work without icons but will use default Electron icon

## Code Signing (Future)

When ready to add code signing:

### macOS
- Obtain Apple Developer ID certificate
- Install certificate in Keychain
- Add environment variables or use electron-builder's certificate configuration
- Update package.json build config with certificate details

### Windows
- Obtain code signing certificate (.pfx or .p12)
- Add to environment variables:
  - `CSC_LINK` - path to certificate file
  - `CSC_KEY_PASSWORD` - certificate password
- Or configure in package.json build section

See BUILD_DISTRIBUTION.md for detailed code signing instructions.
