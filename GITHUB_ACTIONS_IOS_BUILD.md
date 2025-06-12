# GitHub Actions iOS Build Setup

This repository is configured to build Flutter iOS IPA files using GitHub Actions - completely FREE, no Mac or Apple Developer account needed!

## How It Works

The workflow uses GitHub's free macOS runners to:
1. Build your Flutter app for iOS
2. Create an unsigned IPA file
3. Upload it as an artifact
4. Optionally create a GitHub release

## Workflow Files

- `.github/workflows/ios-build.yml` - Simple iOS build workflow
- `.github/workflows/flutter-ios-build.yml` - Advanced workflow with releases

## Usage

### Automatic Builds
The workflow triggers automatically when you:
- Push to `main` or `master` branch
- Create a pull request
- Manually trigger via GitHub Actions tab

### Manual Trigger
1. Go to Actions tab in your GitHub repository
2. Select "Flutter iOS Build" workflow
3. Click "Run workflow"
4. Optionally set a build number
5. Click "Run workflow" button

### Getting Your IPA

After the build completes:
1. Go to the Actions tab
2. Click on your workflow run
3. Scroll down to "Artifacts"
4. Download `flutter-ios-ipa`

## Important Notes

- The IPA is **unsigned** (no code signing)
- You cannot install unsigned IPAs directly on physical devices
- This is perfect for:
  - Testing the build process
  - Sharing with services that resign apps
  - Using with jailbroken devices
  - Submitting to third-party app stores that handle signing

## Installing the IPA

Since the IPA is unsigned, you have several options:

1. **Use a signing service** (like AltStore, Sideloadly)
2. **Use TestFlight** (requires Apple Developer account)
3. **Jailbroken devices** can install unsigned IPAs
4. **Simulators** can run unsigned apps

## Customization

Edit the workflow file to:
- Change Flutter version
- Add build arguments
- Modify artifact names
- Add additional steps

## Troubleshooting

If the build fails:
1. Check that your Flutter project builds locally
2. Ensure iOS platform files exist (`ios/` folder)
3. Check the workflow logs for specific errors
4. Make sure dependencies are iOS-compatible

## Cost

This is 100% FREE using GitHub Actions free tier:
- 2,000 minutes/month for private repos
- Unlimited for public repos
- macOS runners use 10x minutes (so 200 actual minutes for private repos)