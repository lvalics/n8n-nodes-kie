#!/bin/bash
# build.sh - Build n8n custom node and copy to n8n custom directory

# Set project name - change this for different modules
PROJECT_NAME="kie"

# Set your project directory
PROJECT_DIR=~/n8n_dev/n8n-nodes-${PROJECT_NAME}
N8N_CUSTOM_DIR=~/.n8n/custom/n8n-nodes-${PROJECT_NAME}

# Load npm token from .env if available
ENV_FILE="$PROJECT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  # Source the .env file and extract TOKEN-NPM
  export $(grep "^TOKEN-NPM=" "$ENV_FILE" | xargs)
  if [ -n "$TOKEN_NPM" ]; then
    echo "📦 Found npm token in .env file"
    # Configure npm to use the token
    npm config set //registry.npmjs.org/:_authToken "$TOKEN_NPM"
  fi
fi

# Change to project directory
echo "Changing to project directory: $PROJECT_DIR"
cd $PROJECT_DIR || { echo "Error: Could not change to project directory"; exit 1; }

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "node_modules not found, installing dependencies..."
  pnpm install
  if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
  fi
fi

# Check for --build flag
if [ "$1" = "--build" ]; then
  # Extract current version from package.json
  CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)

  # Display alert and confirmation
  echo "⚠️ IMPORTANT ⚠️"
  echo "Current package version is: $CURRENT_VERSION"
  echo "Please make sure you have incremented the version number in package.json before proceeding!"
  echo ""
  read -p "Do you want to continue with npm publish? [Y/n]: " CONFIRM

  # Default to yes if empty or starts with y/Y
  CONFIRM=${CONFIRM:-yes}
  if [[ ! "$CONFIRM" =~ ^[Yy] ]]; then
    echo "Build and publish cancelled."
    exit 0
  fi

  # Clean up custom directory
  echo "Cleaning up custom directory: $N8N_CUSTOM_DIR"
  # Ensure the directory exists before trying to clean it
  mkdir -p $N8N_CUSTOM_DIR
  # Remove all contents of the custom directory
  rm -rf $N8N_CUSTOM_DIR/*
  echo "All files in $N8N_CUSTOM_DIR have been removed"

  # Run the build
  echo "Building project..."
  pnpm run build
  if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
  fi

  # Run npm publish with retry logic
  publish_package() {
    local OTP_CODE=$1

    echo "Running npm publish..."

    # Build npm publish command with optional OTP
    if [ -n "$OTP_CODE" ]; then
      PUBLISH_OUTPUT=$(npm publish --otp="$OTP_CODE" 2>&1)
    else
      PUBLISH_OUTPUT=$(npm publish 2>&1)
    fi
    PUBLISH_EXIT_CODE=$?

    # Display the output
    echo "$PUBLISH_OUTPUT"

    # Check if publish was successful
    if [ $PUBLISH_EXIT_CODE -eq 0 ]; then
      echo ""
      echo "✅ Build and publish completed successfully!"
      return 0
    fi

    # Check for OTP (Two-Factor Authentication) required
    if echo "$PUBLISH_OUTPUT" | grep -qE "(EOTP|one-time password|OTP)"; then
      echo ""
      echo "🔐 TWO-FACTOR AUTHENTICATION REQUIRED"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "Your npm account has 2FA enabled."
      echo "Please enter the 6-digit code from your authenticator app:"
      echo ""
      read -p "OTP Code: " USER_OTP
      echo ""

      if [ -n "$USER_OTP" ]; then
        echo "Retrying npm publish with OTP..."
        publish_package "$USER_OTP"  # Retry with OTP
        return $?
      else
        echo "❌ No OTP provided. Publish cancelled."
        return 1
      fi
    fi

    # Check for authentication errors
    if echo "$PUBLISH_OUTPUT" | grep -qE "(E401|401 Unauthorized|Access token expired|ENEEDAUTH|authentication|login required)"; then
      echo ""
      echo "❌ AUTHENTICATION ERROR DETECTED"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "Your npm access token has expired or is invalid."
      echo ""
      echo "📋 To fix this, please follow these steps:"
      echo ""
      echo "1. Login to npm:"
      echo "   npm login"
      echo ""
      echo "   You'll be prompted for:"
      echo "   - Username: Your npm username"
      echo "   - Password: Your npm password"
      echo "   - Email: Your npm email"
      echo "   - OTP: One-time password (if 2FA is enabled)"
      echo ""
      echo "2. Verify your login:"
      echo "   npm whoami"
      echo ""
      echo "3. Alternative - Use access token:"
      echo "   npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN"
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""

      # Offer to retry
      read -p "Have you logged in? Would you like to retry publish? [Y/n]: " RETRY

      # Default to yes if empty or starts with y/Y
      RETRY=${RETRY:-yes}
      if [[ "$RETRY" =~ ^[Yy] ]]; then
        echo ""
        echo "Retrying npm publish..."
        publish_package  # Recursive retry
      else
        echo ""
        echo "❌ Publish cancelled. Please login and run: npm publish"
        return 1
      fi
    else
      # Other publish errors
      echo ""
      echo "❌ PUBLISH FAILED"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "Common issues:"
      echo "• Package version already exists - increment version in package.json"
      echo "• Package name taken - check if you own 'n8n-nodes-kie' on npm"
      echo "• Network issues - check your internet connection"
      echo ""
      echo "Run 'npm publish' manually after fixing the issue."
      echo ""
      return 1
    fi
  }

  # Call the publish function
  publish_package
  FINAL_EXIT_CODE=$?

  exit $FINAL_EXIT_CODE
fi

# Normal build process (without --build flag)
# Run build
echo "Building project..."
pnpm run build
if [ $? -ne 0 ]; then
  echo "Error: Build failed"
  exit 1
fi

# Clean up custom directory
echo "Cleaning up custom directory: $N8N_CUSTOM_DIR"
# Ensure the directory exists before trying to clean it
mkdir -p $N8N_CUSTOM_DIR
# Remove all contents of the custom directory
rm -rf $N8N_CUSTOM_DIR/*
echo "All files in $N8N_CUSTOM_DIR have been removed"

# Copy built files
echo "Copying files to n8n custom directory: $N8N_CUSTOM_DIR"
cp -r dist/* $N8N_CUSTOM_DIR/

echo "Build and installation completed successfully"
echo "Restarting n8n..."

# Try different methods to restart n8n
# Method 1: If running as systemd service
if systemctl is-active --quiet n8n; then
  sudo systemctl restart n8n
  echo "Restarted n8n via systemd"
  exit 0
fi

# Method 3: Manual restart (kill and start again)
pkill -f "n8n start" || true
echo "Killed existing n8n process"
export N8N_LOG_LEVEL=debug
# nohup n8n start > /dev/null 2>&1 &
nohup n8n start > ~/n8n.log 2>&1 &
echo "You can now do: tail -f ~/n8n.log"
echo "Started n8n in background"
echo "n8n restarted successfully"
