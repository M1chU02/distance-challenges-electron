---
description: How to release an update to GitHub for auto-update
---

To release a new version of the application and make it available via auto-update, follow these steps:

### 1. Requirements

- Ensure you have a **GitHub Personal Access Token (classic)** with `repo` scope.
- Set it as an environment variable in your terminal:
  - **PowerShell**: `$env:GH_TOKEN = "your_token_here"`
  - **CMD**: `set GH_TOKEN=your_token_here`

### Zalecana kolejność (bardzo ważne):

1. **Commit i Push**: Najpierw wypchnij kod na GitHub, aby Twoje repozytorium miało najnowszy "stan" przed budowaniem plików `.exe`.

   ```powershell
   git add .
   git commit -m "feat: removed menu bar and added application icon"
   git push
   ```

2. **Budowanie i Upload**: Dopiero teraz uruchom proces budowania, który wyśle pliki na GitHub jako "Draft Release".
   ```powershell
   $env:GH_TOKEN = "twój_token"
   npx electron-builder --win -p always
   ```

### 4. Finalize the Release

- Go to your GitHub repository: [M1chU02/distance-challenges-electron](https://github.com/M1chU02/distance-challenges-electron/releases)
- You should see a new draft release.
- Click **Edit**, then **Publish Release**.

### 5. Check Updates

- Once published, users can click the "**Check updates**" button in the app or wait for the auto-update check on startup.
