# Setup Android per chi compila e fa girare la demo

Serve un computer con **16 GB di RAM** e circa **20 GB liberi**. Sul Wi-Fi della sede tutto il setup richiede 30–45 minuti: **partite subito**, e lanciate i download in parallelo.

## 1. Strumenti

| Cosa | macOS | Windows |
|---|---|---|
| Node.js 22 LTS o più recente | `brew install node` | installer da nodejs.org |
| JDK 17 | `brew install --cask zulu@17` | `choco install -y microsoft-openjdk17` |
| Android Studio | da developer.android.com/studio, installazione **Standard** | idem, spuntando anche **Android Virtual Device** |

## 2. SDK Android

In Android Studio: **Settings → Languages & Frameworks → Android SDK**.

- Tab **SDK Platforms**: sotto **Android 16 (Baklava)** spuntate **Android SDK Platform 36**.
- Tab **SDK Tools**: almeno una versione di **Android SDK Build-Tools**, **Android Emulator** e **Android SDK Platform-Tools**.

## 3. Variabili d'ambiente

**macOS** (in `~/.zshrc`, poi `source ~/.zshrc`):

```sh
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

**Windows**: in "Modifica le variabili d'ambiente per il tuo account" create `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk` e aggiungete al `Path` `%LOCALAPPDATA%\Android\Sdk\platform-tools`.

Verifica: `adb --version` deve rispondere.

## 4. Emulatore

**More Actions → Virtual Device Manager → Create virtual device**:

- Dispositivo: un Pixel recente.
- Immagine di sistema: **API 36**. Su Mac Apple Silicon prendete **arm64-v8a**, su Windows o Mac Intel **x86_64**.
- **Show Advanced Settings**: **RAM 6144 MB** (4096 basta se Gemma gira sul computer), **Internal Storage 16 GB**.

## 5. Compilare e avviare l'app

```sh
git clone https://github.com/giorgiocaligiuri/hacktoberfest_2026_team_mantide.git
cd hacktoberfest_2026_team_mantide/mobile
npm install
npx expo run:android
```

La prima compilazione richiede 5–15 minuti. Poi parte il server di sviluppo: lasciatelo acceso.

**Dopo la prima volta:**
- Per le modifiche al codice JavaScript basta `git pull`: l'app si aggiorna da sola.
- **Va ricompilato** (`npx expo run:android`) solo quando cambiano `app.json`, `package.json` o cartelle con codice nativo. Lo scriviamo nel messaggio di commit.

Dopo la compilazione potete chiudere Android Studio per liberare RAM: l'emulatore resta acceso.

## 6. Foto per la demo

La galleria dell'emulatore è vuota. Caricate la galleria dimostrativa del repo (45 foto con GPS e date già negli EXIF), dalla radice del repo:

```sh
adb push demo-data/photos/. /sdcard/Pictures/mantide-demo/
adb shell content call --method scan_volume --uri content://media --arg external_primary
```

Se le foto non compaiono nella galleria, riavviate l'emulatore.

Volete aggiungere foto vostre? Copiatele dal telefono **via cavo** o da Google Foto (**non via WhatsApp**, che cancella il GPS) nella cartella `demo-photos/`, esclusa da git, e caricatele allo stesso modo.

## 7. Posizione GPS dell'emulatore

Pannello **⋯ (Extended controls) → Location**: cercate H-FARM, Roncade e premete **Set location**.
