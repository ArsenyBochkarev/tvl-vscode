# TVL Language Support

This extension makes it possible to verify protocols written in TVL language.

## Requirements

- VS Code version >= 1.110.0

## How to install extension

1. Open "Extensions" in VS Code
2. Open "..." menu
3. Click on "Install from VSIX..."
4. Set path to .vsix file provided in this repo
5. Once extension is installed, provide path to TVL:
    - File -> Preferences -> Settings
    - Search "TVL"
    - In field "Tvl: Verifier Command" provide path to [TVL](https://github.com/ArsenyBochkarev/TVL) repo

## How to use extension

1. Press "Verify" button at the top right of screen
2. Choose model checker
3. Optionally input additional parameters/flags
