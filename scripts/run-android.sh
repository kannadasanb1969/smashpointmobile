#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${1:-Pixel_8a}"
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ADB_BIN="${ANDROID_SDK}/platform-tools/adb"
EMULATOR_BIN="${ANDROID_SDK}/emulator/emulator"

if [[ ! -x "$ADB_BIN" ]]; then
  echo "ADB not found at $ADB_BIN. Set ANDROID_HOME to your Android SDK path."
  exit 1
fi
if [[ ! -x "$EMULATOR_BIN" ]]; then
  echo "Emulator not found at $EMULATOR_BIN. Install/configure Android Studio emulator."
  exit 1
fi

if ! "$ADB_BIN" devices | awk 'NR > 1 && $2 == "device" { found=1 } END { exit !found }'; then
  echo "Starting Android emulator: $AVD_NAME"
  nohup "$EMULATOR_BIN" -avd "$AVD_NAME" -no-snapshot >/tmp/smashpoint-emulator.log 2>&1 &
fi

echo "Waiting for emulator..."
"$ADB_BIN" wait-for-device
until [[ "$("$ADB_BIN" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
  sleep 2
done

"$ADB_BIN" reverse tcp:8081 tcp:8081
echo "Starting SmashPoint in Expo Go..."
npx expo start --localhost --android
