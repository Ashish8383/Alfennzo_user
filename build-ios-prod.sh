#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/Users/alfennzo/Desktop/Alfennzo"
APP_NAME="Alfennzo"
TEAM_ID=""  # Apna Team ID yahan daale, ya khali chode

echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}🚀 iOS Production Build Process${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"

cd "$PROJECT_DIR"

# Step 1: Clean Everything
echo -e "\n${YELLOW}📦 Step 1/7: Cleaning previous builds...${NC}"
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/Alfennzo-*
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-*"

# Step 2: Install Dependencies
echo -e "\n${YELLOW}📚 Step 2/7: Installing npm packages...${NC}"
npm install 2>/dev/null || yarn install

# Step 3: Create Correct Podfile
echo -e "\n${YELLOW}📝 Step 3/7: Setting up Podfile...${NC}"

# Backup old Podfile
cp ios/Podfile ios/Podfile.backup 2>/dev/null || true

# Detect if using Expo
if grep -q '"expo"' package.json; then
  echo "Detected Expo project"
  
  cat > ios/Podfile << 'EOF'
require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")
require File.join(File.dirname(`node --print "require.resolve('@react-native-community/cli-platform-ios/package.json')"`), "native_modules")

platform :ios, '15.0'
install! 'cocoapods', :deterministic_uuids => false

target 'Alfennzo' do
  use_expo_modules!
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true,
    :fabric_enabled => false,
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
    
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
      end
    end
  end
end
EOF
else
  echo "Detected React Native CLI project"
  
  cat > ios/Podfile << 'EOF'
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '15.0'
install! 'cocoapods', :deterministic_uuids => false

target 'Alfennzo' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true,
    :fabric_enabled => false,
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
    
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
      end
    end
  end
end
EOF
fi

# Step 4: Install Pods
echo -e "\n${YELLOW}🔧 Step 4/7: Installing CocoaPods...${NC}"
cd ios
pod cache clean --all 2>/dev/null || true
pod deintegrate 2>/dev/null || true
pod install --repo-update

# Step 5: Create Archive
echo -e "\n${YELLOW}🏗️  Step 5/7: Building Archive...${NC}"

# Check if Team ID is provided
if [ -z "$TEAM_ID" ]; then
  # Try to extract from Xcode project
  TEAM_ID=$(grep -r "DEVELOPMENT_TEAM" Alfennzo.xcodeproj/project.pbxproj | head -1 | grep -o '[A-Z0-9]\{10\}')
  if [ -z "$TEAM_ID" ]; then
    echo -e "${RED}⚠️  Team ID not found. Please enter your Apple Team ID:${NC}"
    read -p "Team ID (from developer.apple.com): " TEAM_ID
  fi
fi

# Archive build
xcodebuild archive \
  -workspace Alfennzo.xcworkspace \
  -scheme Alfennzo \
  -configuration Release \
  -archivePath ./build/Alfennzo.xcarchive \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  ONLY_ACTIVE_ARCH=NO \
  GCC_WARN_INHIBIT_ALL_WARNINGS=YES \
  COMPILER_INDEX_STORE_ENABLE=NO \
  SWIFT_COMPILATION_MODE=wholemodule \
  -quiet

if [ $? -ne 0 ]; then
  echo -e "\n${RED}❌ Archive failed! Trying without quiet mode...${NC}"
  xcodebuild archive \
    -workspace Alfennzo.xcworkspace \
    -scheme Alfennzo \
    -configuration Release \
    -archivePath ./build/Alfennzo.xcarchive \
    -destination 'generic/platform=iOS' \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    CODE_SIGN_STYLE=Automatic \
    ONLY_ACTIVE_ARCH=NO
fi

# Step 6: Export IPA
echo -e "\n${YELLOW}📱 Step 6/7: Exporting IPA...${NC}"

cat > ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>${TEAM_ID}</string>
    <key>destination</key>
    <string>upload</string>
    <key>uploadSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
    <key>compileBitcode</key>
    <false/>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
    <key>provisioningProfiles</key>
    <dict/>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath ./build/Alfennzo.xcarchive \
  -exportPath ./build/TestFlight \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates

# Step 7: Summary
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Build Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

IPA_PATH="./build/TestFlight/Alfennzo.ipa"
if [ -f "$IPA_PATH" ]; then
  IPA_SIZE=$(du -h "$IPA_PATH" | cut -f1)
  echo -e "${GREEN}📱 IPA File: ${IPA_PATH}${NC}"
  echo -e "${GREEN}📦 Size: ${IPA_SIZE}${NC}"
  echo -e "\n${YELLOW}📤 Upload Options:${NC}"
  echo "1. Transporter App (Easiest):"
  echo "   open -a Transporter # Then drag IPA file"
  echo ""
  echo "2. Command Line (altool):"
  echo "   xcrun altool --upload-app -f $IPA_PATH -t ios -u YOUR_APPLE_ID -p APP_SPECIFIC_PASSWORD"
  echo ""
  echo "3. Xcode Organizer:"
  echo "   open Alfennzo.xcworkspace"
  echo "   Window → Organizer → Distribute App"
else
  echo -e "${RED}❌ IPA not found! Check build errors above.${NC}"
fi

rm -f ExportOptions.plist
cd ..

echo -e "\n${GREEN}🎯 Process Complete!${NC}"
