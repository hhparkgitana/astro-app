# Astrid Beta Distribution Guide

This guide explains how to build and distribute Astrid for beta testing with automatic updates.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [First-Time Setup](#first-time-setup)
3. [Building for Distribution](#building-for-distribution)
4. [Creating a GitHub Release](#creating-a-github-release)
5. [How Auto-Updates Work](#how-auto-updates-work)
6. [Testing Instructions for Beta Users](#testing-instructions-for-beta-users)
7. [Code Signing (Optional but Recommended)](#code-signing-optional-but-recommended)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 16+ and npm installed
- Git repository hosted on GitHub
- macOS for building Mac apps (can build Windows/Linux from Mac)
- Windows for building Windows apps (optional - Mac can build unsigned Windows apps)
- Linux for building Linux apps (optional)

---

## First-Time Setup

### 1. Update GitHub Repository Information

Edit `package.json` and update these fields with your actual GitHub information:

```json
{
  "author": "Your Name <your.email@example.com>",
  "homepage": "https://github.com/yourusername/astro-app",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/astro-app.git"
  },
  "build": {
    "publish": {
      "provider": "github",
      "owner": "yourusername",
      "repo": "astro-app"
    }
  }
}
```

### 2. Create Application Icons

Create high-quality icons for all platforms. See `build/README.md` for detailed instructions.

**Quick summary:**
- Start with a 1024x1024 PNG image
- Create `build/icon.icns` for macOS
- Create `build/icon.ico` for Windows
- Create `build/icons/*.png` (multiple sizes) for Linux

**Icon generation tools:**
- https://cloudconvert.com/png-to-icns (macOS)
- https://cloudconvert.com/png-to-ico (Windows)
- ImageMagick for Linux PNGs

### 3. Install Dependencies

```bash
npm install
```

This will automatically run `electron-builder install-app-deps` to set up native modules correctly.

---

## Building for Distribution

### Build Commands

```bash
# Build renderer (Vite) and create installers for current platform
npm run dist

# Build for specific platforms
npm run dist:mac      # macOS (DMG + ZIP)
npm run dist:win      # Windows (NSIS installer + portable)
npm run dist:linux    # Linux (AppImage, deb, rpm)

# Build for ALL platforms (requires proper setup)
npm run dist:all
```

### Build Output

Installers will be created in the `dist/` directory:

**macOS:**
- `Astrid-0.1.0-arm64.dmg` (Apple Silicon)
- `Astrid-0.1.0-x64.dmg` (Intel)
- `Astrid-0.1.0-arm64-mac.zip`
- `Astrid-0.1.0-x64-mac.zip`

**Windows:**
- `Astrid-Setup-0.1.0.exe` (NSIS installer)
- `Astrid-0.1.0-win-portable.exe` (portable version)

**Linux:**
- `Astrid-0.1.0.AppImage`
- `astrid_0.1.0_amd64.deb`
- `astrid-0.1.0.x86_64.rpm`

### Build Process Explained

1. `npm run build` - Vite builds the renderer process
2. `electron-builder` packages the app and creates installers
3. Native modules (sweph, better-sqlite3) are handled via `asarUnpack`
4. Extra resources (ephemeris data, texts) are copied to `resources/` folder
5. Auto-updater configuration is included automatically

---

## Creating a GitHub Release

### Step 1: Update Version Number

Edit `package.json` and increment the version:

```json
{
  "version": "0.1.1"  // or 0.2.0 for minor updates, 1.0.0 for major
}
```

### Step 2: Commit and Tag

```bash
git add package.json
git commit -m "Bump version to 0.1.1"
git push origin main

# Create and push a tag
git tag v0.1.1
git push origin v0.1.1
```

### Step 3: Build Installers

```bash
# Build for the platforms you want to distribute
npm run dist:mac
npm run dist:win
npm run dist:linux

# Or build all at once (if your setup supports it)
npm run dist:all
```

### Step 4: Create GitHub Release

#### Option A: Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Click "Choose a tag" and select `v0.1.1`
4. Set release title: "Astrid v0.1.1"
5. Add release notes describing changes
6. Upload installer files from `dist/` folder:
   - Drag and drop all `.dmg`, `.zip`, `.exe`, `.AppImage`, `.deb`, `.rpm` files
7. Check "This is a pre-release" for beta versions
8. Click "Publish release"

#### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if you haven't already
brew install gh  # macOS
# or download from https://cli.github.com/

# Create release and upload assets
gh release create v0.1.1 \
  --title "Astrid v0.1.1" \
  --notes "Release notes here" \
  --prerelease \
  dist/Astrid-*.dmg \
  dist/Astrid-*.zip \
  dist/Astrid-Setup-*.exe \
  dist/*.AppImage \
  dist/*.deb \
  dist/*.rpm
```

### Step 5: Verify Release

1. Go to your GitHub releases page
2. Verify all files were uploaded
3. Check that `latest.yml` (Mac) and `latest.yml` (Windows) files were auto-generated

**Important:** The auto-updater looks for these `latest.yml` files to detect updates.

---

## How Auto-Updates Work

### Architecture

1. **On App Launch** (after 3-second delay):
   - App checks GitHub Releases for newer version
   - Compares current version with latest release version

2. **When Update Found**:
   - Downloads installer in background
   - Shows progress in console (visible in development)

3. **When Download Complete**:
   - Shows dialog: "A new version has been downloaded"
   - User can choose "Restart Now" or "Later"
   - If "Later", update installs when user quits app

4. **Periodic Checks**:
   - App checks for updates every 4 hours while running

### Update Behavior

- **Development mode** (`npm run dev`): No update checks
- **Production mode** (packaged app): Full auto-update functionality
- **Failed updates**: Silently fail, user can continue using current version
- **Network issues**: Silently ignored, will retry on next check

### User Experience

1. User installs Astrid v0.1.0
2. You release v0.1.1 on GitHub
3. User launches app → update downloads automatically
4. User sees notification when download completes
5. User clicks "Restart Now" → app updates and relaunches
6. OR user clicks "Later" → update installs on next app quit

---

## Testing Instructions for Beta Users

### macOS Installation

#### STEP 1: Determine Your Mac Type

Before downloading, check which type of Mac you have:

**Option A - Check "About This Mac":**
1. Click the Apple menu () → "About This Mac"
2. Look at the "Chip" or "Processor" line:
   - **Apple M1, M2, or M3** = Apple Silicon → Download ARM64 version
   - **Intel Core i5, i7, i9** = Intel Mac → Download Intel (x64) version

**Option B - Use Terminal:**
```bash
uname -m
```
- Output `arm64` = Apple Silicon → Download ARM64 version
- Output `x86_64` = Intel Mac → Download Intel (x64) version

#### STEP 2: Download the Correct Version

- **Apple Silicon (M1/M2/M3):** Download `Astrid-0.1.0-arm64.dmg`
- **Intel Mac:** Download `Astrid-0.1.0.dmg` (or `Astrid-0.1.0-x64.dmg`)

**IMPORTANT:** Installing the wrong version will cause a "not supported on this Mac" error!

#### STEP 3: Install Astrid

1. Open the downloaded DMG file
2. Drag "Astrid" icon to Applications folder
3. **Do NOT double-click yet** - Unsigned apps are blocked by macOS Gatekeeper

#### STEP 4: Bypass macOS Gatekeeper (Required for Unsigned Apps)

Since Astrid is not yet code-signed, macOS will block it from opening. Choose one method:

**Method 1: Terminal Command (Recommended - Works Every Time)**
```bash
xattr -cr /Applications/Astrid.app
```

Then open Astrid normally from Applications folder.

**Method 2: Right-Click Method (May Not Work on All macOS Versions)**
1. Go to Applications folder
2. Right-click (Control-click) Astrid
3. Select "Open" from the menu
4. Click "Open" in the security dialog

**Note:** This workaround is only needed once per installation. Future auto-updates will work normally.

### Windows Installation

1. Download `Astrid-Setup-0.1.0.exe`
2. Double-click the installer
3. If you see Windows SmartScreen warning:
   - Click "More info"
   - Click "Run anyway"
4. Follow the installation wizard
5. Launch Astrid from Desktop shortcut or Start Menu

### Linux Installation

**AppImage (Universal):**
1. Download `Astrid-0.1.0.AppImage`
2. Make it executable: `chmod +x Astrid-0.1.0.AppImage`
3. Run it: `./Astrid-0.1.0.AppImage`

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i astrid_0.1.0_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed
```

**Fedora/RHEL (.rpm):**
```bash
sudo rpm -i astrid-0.1.0.x86_64.rpm
```

### Verifying Auto-Updates Work

1. Install version 0.1.0
2. Launch the app
3. Wait 5-10 seconds
4. Check that app is running without errors
5. When you release 0.1.1, the update should download automatically
6. User will see notification when download completes

---

## Code Signing (Optional but Recommended)

Code signing prevents security warnings and provides better user experience.

### macOS Code Signing

#### Prerequisites
- Apple Developer account ($99/year)
- Developer ID Application certificate

#### Setup Steps

1. **Get Apple Developer Certificate**:
   - Go to https://developer.apple.com
   - Navigate to Certificates, Identifiers & Profiles
   - Create "Developer ID Application" certificate
   - Download and install in Keychain Access

2. **Find Certificate Name**:
   ```bash
   security find-identity -v -p codesigning
   ```
   Look for something like: `Developer ID Application: Your Name (TEAM_ID)`

3. **Configure Environment Variables**:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
   ```

4. **Build Signed App**:
   ```bash
   npm run dist:mac
   ```

5. **Notarization (Recommended)**:
   - Notarization submits your app to Apple for malware scanning
   - Add to package.json:
   ```json
   {
     "build": {
       "mac": {
         "notarize": {
           "teamId": "YOUR_TEAM_ID"
         }
       }
     }
   }
   ```
   - Set environment variables:
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   ```

### Windows Code Signing

#### Prerequisites
- Code signing certificate from a trusted Certificate Authority
- Certificate file (.pfx or .p12) and password

#### Setup Steps

1. **Obtain Certificate**:
   - Purchase from DigiCert, Sectigo, or similar CA
   - Download certificate as .pfx file

2. **Configure Environment Variables**:
   ```bash
   export CSC_LINK="/path/to/certificate.pfx"
   export CSC_KEY_PASSWORD="your-certificate-password"
   ```

3. **Build Signed App**:
   ```bash
   npm run dist:win
   ```

### Building Without Code Signing

If you don't have certificates yet:

1. **macOS**: Users will see "unidentified developer" warning (can be bypassed with right-click → Open)
2. **Windows**: Users will see SmartScreen warning (can be bypassed with "More info" → "Run anyway")
3. **Linux**: No code signing required

For beta testing, unsigned builds are acceptable. Plan to add code signing before public release.

---

## Troubleshooting

### Build Fails with "Cannot find module 'sweph'"

**Solution**: Rebuild native modules
```bash
npm run rebuild
```

### Updates Not Working

**Checklist**:
- [ ] GitHub release is published (not draft)
- [ ] Release has a tag matching `vX.X.X` format
- [ ] Installer files are uploaded to the release
- [ ] `publish` configuration in package.json is correct
- [ ] App is running in production mode (not `npm run dev`)

**Debug**: Check main process console logs for update messages

### "Cannot Open App" or "Not Supported on This Mac" Error (macOS)

**If error says "not supported on this Mac":**
This means you installed the wrong architecture version.
- Intel Macs need `Astrid-0.1.0.dmg` (x64 version)
- Apple Silicon Macs need `Astrid-0.1.0-arm64.dmg`

**Solution**: Remove the app and install the correct version for your Mac type.

**If error says "unidentified developer" or "cannot be opened":**
This is macOS Gatekeeper blocking unsigned apps.

**Solution**: Use the terminal command:
```bash
xattr -cr /Applications/Astrid.app
```

Or right-click → Open, or add code signing (see Code Signing section)

### Build Output is Huge

The app includes:
- Swiss Ephemeris data (~50MB)
- RAG texts for chatbot
- Chromium (Electron includes full browser)

Expected app size: 150-250MB

### Cross-Platform Building

- **Mac can build**: macOS, Windows (unsigned), Linux
- **Windows can build**: Windows, Linux (via WSL)
- **Linux can build**: Linux, Windows (via Wine)

For best results, build each platform on its native OS, or use CI/CD services like GitHub Actions.

---

## Advanced: GitHub Actions CI/CD

For automated builds on every release:

1. Create `.github/workflows/build.yml`
2. Configure workflow to build on Ubuntu (can build all platforms)
3. Automatically upload artifacts to releases
4. Set up code signing secrets in GitHub repository settings

Example workflow available in electron-builder documentation:
https://www.electron.build/configuration/publish#github-repository-and-bintray-options

---

## Support and Resources

- **electron-builder docs**: https://www.electron.build/
- **electron-updater docs**: https://www.electron.build/auto-update
- **Code signing guide**: https://www.electron.build/code-signing
- **GitHub Releases**: https://docs.github.com/en/repositories/releasing-projects-on-github

---

## Quick Reference

### Essential Commands
```bash
npm run dev                  # Development mode
npm run build                # Build renderer only
npm run dist                 # Build installers for current platform
npm run dist:mac             # Build for macOS
npm run dist:win             # Build for Windows
npm run dist:linux           # Build for Linux
```

### Version Bump Workflow
```bash
# 1. Update version in package.json
# 2. Commit and tag
git add package.json
git commit -m "Bump version to 0.X.X"
git push origin main
git tag v0.X.X
git push origin v0.X.X

# 3. Build
npm run dist:mac
npm run dist:win

# 4. Create GitHub Release with built files
gh release create v0.X.X --prerelease dist/*
```

### File Locations
- **Installers**: `dist/`
- **Icons**: `build/icon.icns`, `build/icon.ico`, `build/icons/*.png`
- **Build config**: `package.json` → `"build"` section
- **Auto-updater code**: `src/main/main.js` → `setupAutoUpdater()`
- **Entitlements**: `build/entitlements.mac.plist`

---

## Next Steps

1. Update repository URLs in package.json
2. Create application icons
3. Test build process: `npm run dist`
4. Create first release on GitHub
5. Distribute to beta testers
6. Iterate based on feedback
7. Add code signing before public release

Happy beta testing!
