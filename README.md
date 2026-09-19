# TVL Language Support

This extension makes it possible to verify protocols written in [TVL language](https://github.com/ArsenyBochkarev/TVL).

## Requirements

- VS Code version >= 1.110.0

## How to install extension

1. Open "Extensions" in VS Code
2. Open "..." menu
3. Click on "Install from VSIX..."
4. Set path to .vsix file provided in this repo
5. The extension uses the `tvl-env` Docker image by default for verification. Make sure you have Docker installed and the image built (check [TVL Docker usage](https://github.com/ArsenyBochkarev/TVL#using-docker-recommended)).
6. (Optional) If you don't want to use Docker, you can disable it and provide a local path to TVL:
    - File -> Preferences -> Settings
    - Search "TVL"
    - Uncheck "Tvl: Use Docker"
    - In field "Tvl: Verifier Command" provide path to [TVL](https://github.com/ArsenyBochkarev/TVL) repo

## How to use extension

1. Press "Verify" button at the top right of screen
2. Choose model checker
3. Optionally input additional parameters/flags
