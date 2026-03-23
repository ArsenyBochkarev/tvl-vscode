"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
function activate(context) {
    let disposable = vscode.commands.registerCommand('tvl.verify', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active TVL file.');
            return;
        }
        const document = editor.document;
        if (document.languageId !== 'tvl') {
            vscode.window.showErrorMessage('Active file is not a TVL file.');
            return;
        }
        if (document.isDirty) {
            await document.save();
        }
        const sourcePath = document.uri.fsPath;
        const parsedPath = path.parse(sourcePath);
        const checker = await vscode.window.showQuickPick([
            { label: 'TLA+', description: 'Verify using TLC model checker', target: 'tla', ext: '.tla' },
            { label: 'SPIN', description: 'Verify using SPIN/Promela', target: 'spin', ext: '.pml' }
        ], { placeHolder: 'Select target model checker' });
        if (!checker) {
            return;
        }
        const config = vscode.workspace.getConfiguration('tvl');
        const verifierCmd = config.get('verifierCommand');
        if (!verifierCmd) {
            vscode.window.showErrorMessage('Please configure TVL verifier commands in VS Code settings.');
            return;
        }
        let terminal = vscode.window.terminals.find(t => t.name === 'TVL Verifier');
        if (!terminal) {
            terminal = vscode.window.createTerminal('TVL Verifier');
        }
        terminal.show();
        const verifyFullCmd = `${verifierCmd} "${sourcePath}" ${checker.target}`;
        terminal.sendText(`echo "=== Running Verification ===" && ${verifyFullCmd}`);
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map