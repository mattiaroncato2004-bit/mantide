# Setup del computer che compila e fa girare la demo

Serve un computer con **16 GB di RAM**, circa **20 GB liberi** e l'accesso al repo GitHub. Sul Wi-Fi della sede tutto il setup richiede 30–45 minuti. Dove i comandi cambiano tra Mac e Windows trovate entrambi.

## 1. Download lunghi, da avviare subito e in parallelo

- **Android Studio:** https://developer.android.com/studio
- **Gemma 4 E2B** (`gemma-4-E2B-it.litertlm`, 2,6 GB): link e alternative in [local-ai/README.md](../local-ai/README.md). Se qualcuno del team l'ha già scaricato, passatevelo con AirDrop o una chiavetta.

## 2. Strumenti

| Cosa | macOS | Windows |
|---|---|---|
| Node.js 22 o più recente | `brew install node` | installer da nodejs.org |
| Python 3.10 o più recente | `brew install python` | installer da python.org, con "Add to PATH" |
| JDK 17 | `brew install --cask zulu@17` | installer "Microsoft Build of OpenJDK 17", oppure `choco install -y microsoft-openjdk17` |
| Git | `xcode-select --install` | Git for Windows |

## 3. Android Studio e SDK

1. Primo avvio: installazione **Standard**. Su Windows spuntate anche **Android Virtual Device**.
2. **Settings → Languages & Frameworks → Android SDK**:
   - tab **SDK Platforms**: **Android 16 (Baklava) → Android SDK Platform 36**;
   - tab **SDK Tools**: **Android SDK Build-Tools**, **Android Emulator**, **Android SDK Platform-Tools**.
3. Variabili d'ambiente:
   - **macOS**: in `~/.zshrc`, poi `source ~/.zshrc`
     ```sh
     export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
     ```
   - **Windows**: in "Modifica le variabili d'ambiente per il tuo account" create `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk` e aggiungete al `Path` `%LOCALAPPDATA%\Android\Sdk\platform-tools`.

**Fatto quando** `adb --version`, in un terminale nuovo, risponde.

## 4. Emulatore

**More Actions → Virtual Device Manager → Create virtual device**:

- dispositivo: un Pixel recente;
- immagine di sistema **API 36**: **arm64-v8a** su Mac Apple Silicon, **x86_64** su Windows o Mac Intel;
- **Show Advanced Settings**: **RAM 4096 MB** (Gemma gira sul computer, non nell'emulatore), **Internal Storage 16 GB**.

Avviatelo con ▶.

## 5. Compilare e avviare l'app

Su Windows clonate in un percorso corto e senza spazi, per esempio `C:\dev\`: i percorsi lunghi fanno fallire Gradle.

```sh
git clone https://github.com/giorgiocaligiuri/hacktoberfest_2026_team_mantide.git
cd hacktoberfest_2026_team_mantide/mobile
npm install
npx expo run:android
```

- La prima compilazione richiede 5–15 minuti, poi l'app si apre nell'emulatore.
- **Lasciate aperto quel terminale:** è il server di sviluppo.
- Dopo la compilazione chiudete Android Studio per liberare RAM; l'emulatore resta acceso.

## 6. Gemma sul computer

In un secondo terminale, dalla radice del repo, seguite [local-ai/README.md](../local-ai/README.md): installazione, `litert-lm serve --port 9379` (da lasciare aperto) e la prima prova, che dura 1–2 minuti.

## 7. Foto per la demo

La galleria dell'emulatore è vuota. Caricate la galleria dimostrativa del repo (45 foto con GPS e date già negli EXIF), dalla radice del repo:

```sh
adb push demo-data/photos/. /sdcard/Pictures/mantide-demo/
adb shell content call --method scan_volume --uri content://media --arg external_primary
```

Se le foto non compaiono nella galleria, riavviate l'emulatore.

Volete aggiungere foto vostre? Copiatele dal telefono **via cavo** o da Google Foto (**non via WhatsApp**, che cancella il GPS) nella cartella `demo-photos/`, esclusa da git, e caricatele allo stesso modo.

## 8. Posizione GPS dell'emulatore

Pannello **⋯ (Extended controls) → Location**: cercate H-FARM, Roncade e premete **Set location**.

## 9. Verifica finale

1. All'avvio dell'app consentite la posizione.
2. **Galleria → Leggi la galleria**; al permesso foto scegliete **"Consenti tutte"**, non "Seleziona foto".
3. **Mappa**: il contatore dice **"6 paesi · 6/20 regioni · 8/110 province"**; zoomando compaiono le miniature delle foto.
4. **Interessi → Analizza le foto con Gemma**: circa 5 minuti per 44 foto. In testa **architettura, natura, street art e cibo**, ognuno con circa 9–16 foto: Gemma analizza dal vivo, e i numeri cambiano di poco da un giro all'altro.
5. **Per te**: su scala **Globale** il primo evento è "Berlin Wall Murals & Beats"; su scala **Locale** è "H-FARM Open Campus".

Gli stessi numeri si ottengono senza Android con `cd mobile && npx tsx scripts/simulate-demo.ts`. Poi registrate lo schermo mentre fate questo giro (Android Studio: **Running Devices → registra**): è il video di riserva della demo.

## Dopo la prima volta

- Per le modifiche al codice basta `git pull`: l'app si aggiorna da sola.
- **Va ricompilato** (`npx expo run:android`) solo quando il titolo del commit contiene `[native: rebuild]`.

## Se qualcosa va storto

Copiate **tutto il testo** dell'errore (la schermata rossa nell'app o l'ultima parte del terminale) e mandatelo a chi scrive il codice, con il passo a cui eravate arrivati.
