# Building and running on Android

What you need to build Mantide and run it on an emulator or a phone. Plan for about 20 GB of free disk; 16 GB of RAM is comfortable when the emulator and Gemma run on the same computer. Commands are given for macOS and Windows where they differ.

## 1. Start the long downloads first

- **Android Studio:** https://developer.android.com/studio
- **Gemma 4 E2B** (`gemma-4-E2B-it.litertlm`, 2.6 GB): link and setup in [local-ai/README.md](../local-ai/README.md).

## 2. Tools

| What | macOS | Windows |
|---|---|---|
| Node.js, the version in [`.nvmrc`](../.nvmrc) | `brew install node` or `nvm install` | installer from nodejs.org |
| Python 3.10+ (only for Gemma on your computer) | `brew install python` | installer from python.org, with "Add to PATH" |
| JDK 17 | `brew install --cask zulu@17` | "Microsoft Build of OpenJDK 17", or `choco install -y microsoft-openjdk17` |
| Git | `xcode-select --install` | Git for Windows |

## 3. Android Studio and the SDK

1. First launch: **Standard** install. On Windows also tick **Android Virtual Device**.
2. **Settings → Languages & Frameworks → Android SDK**:
   - **SDK Platforms**: **Android 16 → Android SDK Platform 36**;
   - **SDK Tools**: **Android SDK Build-Tools**, **Android Emulator**, **Android SDK Platform-Tools**.
3. Environment variables:
   - **macOS**, in `~/.zshrc`, then `source ~/.zshrc`:
     ```sh
     export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
     ```
   - **Windows**: create `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk` and add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to `Path`.

**Done when** `adb --version` answers in a new terminal.

## 4. Emulator

**More Actions → Virtual Device Manager → Create virtual device**: a recent Pixel, system image **API 36** (**arm64-v8a** on Apple Silicon, **x86_64** on Windows or Intel Macs), and under **Show Advanced Settings** **RAM 4096 MB** and **Internal Storage 16 GB**. Start it with ▶.

## 5. Build and start the app

On Windows, clone into a short path without spaces, such as `C:\dev\`: long paths make Gradle fail.

```sh
git clone https://github.com/mattiaroncato2004-bit/mantide.git
cd mantide/mobile
npm ci
npx expo run:android
```

The first build takes 5–15 minutes, then the app opens in the emulator. Keep that terminal open: it is the development server. Rebuild with `npx expo run:android` only after a commit tagged `[native: rebuild]`; every other change arrives with `git pull`.

## 6. Gemma on your computer

In a second terminal, follow [local-ai/README.md](../local-ai/README.md). The emulator reaches your computer at `10.0.2.2`.

## 7. Demo photos

The emulator's gallery is empty. Load the demo gallery (45 photos with GPS and dates in their EXIF), from the repository root:

```sh
adb push demo-data/photos/. /sdcard/Pictures/mantide-demo/
adb shell content call --method scan_volume --uri content://media --arg external_primary
```

If the photos don't show up, restart the emulator. To use your own photos, copy them from a phone by cable or Google Photos (messaging apps strip GPS) into `demo-photos/`, which git ignores, and push them the same way.

## 8. Emulator location

**⋯ (Extended controls) → Location**: search for San Francisco and press **Set location**. The sample events are around there.

## 9. Check it works

1. Allow location when the app asks.
2. On the welcome screen choose **Use my gallery**, then **Allow all** photos. The sheet at the bottom shows the gallery being read, then Gemma at work.
3. The sheet reads **Your world · 6 countries · …** and the countries light up; zooming in lights their regions, then provinces and counties, and the photos group into numbered pins.
4. Tap the arrow top right (**Back to me**), then pull the sheet up: **For you here** lists events around San Francisco, each with why it was picked.
5. **▶ Timeline**, in the sheet when you're zoomed out, plays the journey to "photo 45 of 45".
6. Tap **Your world**: the **passport** says Traveler and "4 more to Explorer", and lists what you photograph.

`cd mobile && npx tsx scripts/simulate-demo.ts` prints the same numbers without Android.
