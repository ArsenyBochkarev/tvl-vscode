import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {
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

        const checker = await vscode.window.showQuickPick(
            [
                { label: 'TLA+', description: 'Verify using TLC model checker', target: 'tla', ext: '.tla' },
                { label: 'SPIN', description: 'Verify using SPIN/Promela', target: 'spin', ext: '.pml' }
            ], 
            { placeHolder: 'Select target model checker' }
        );
        if (!checker) {
            return;
        }

        const defaultFlags = '--channel-size=20 --trace-size=20';
        const extraFlags = await vscode.window.showInputBox({
            prompt: 'Additional flags for TVL',
            placeHolder: 'e.g., --channel-size=10 --trace-size=30',
            value: defaultFlags,
            validateInput: (value) => {
                if (/[;&|`$]/.test(value)) {
                    return 'Shell metacharacters (;, &, |, `, $) are not allowed for safety.';
                }
                return null;
            }
        });

        if (extraFlags === undefined) {
            return;
        }

        const config = vscode.workspace.getConfiguration('tvl');
        const useDocker = config.get<boolean>('useDocker', true);
        const tvlRepo = config.get<string>('tvlRepoPath', '').trim();

        if (!tvlRepo || !fs.existsSync(path.join(tvlRepo, 'translate'))) {
            vscode.window.showErrorMessage(
                'Setting "tvl.tvlRepoPath" must point to the TVL repository (the folder containing the "translate" script).'
            );
            return;
        }

        const flagsPart = extraFlags.trim() ? ` ${extraFlags.trim()}` : '';
        let verifyFullCmd = '';

        if (useDocker) {
            // 'translate' lives in the TVL repo (not in the tvl-env image) and runs
            // sbt + verifier.py from the repo root, so the repo is mounted at /tvl
            // and used as the working directory. The model's folder is mounted at
            // /app so translate writes its output next to the source file.
            const dir = path.dirname(sourcePath);
            const file = path.basename(sourcePath);
            // Persist sbt/coursier caches on the host so that throw-away (--rm)
            // containers don't re-download the toolchain on every run. The
            // directories are created here (not by Docker) so they are owned by
            // the current user and writable by the container's 'dev' user.
            const cacheRoot = path.join(os.homedir(), '.cache', 'tvl-docker');
            const coursierCache = path.join(cacheRoot, 'cache');
            const sbtCache = path.join(cacheRoot, 'sbt');
            fs.mkdirSync(coursierCache, { recursive: true });
            fs.mkdirSync(sbtCache, { recursive: true });
            verifyFullCmd = [
                'docker run --rm -it --user dev',
                `-v "${tvlRepo}":/tvl`,
                `-v "${dir}":/app`,
                `-v "${coursierCache}":/home/dev/.cache`,
                `-v "${sbtCache}":/home/dev/.sbt`,
                `-w /tvl tvl-env ./translate "/app/${file}" ${checker.target}${flagsPart}`
            ].join(' ');
        } else {
            verifyFullCmd = `(cd "${tvlRepo}" && ./translate "${sourcePath}" ${checker.target}${flagsPart})`;
        }

        let terminal = vscode.window.terminals.find(t => t.name === 'TVL Verifier');
        if (!terminal) {
            terminal = vscode.window.createTerminal('TVL Verifier');
        }

        terminal.show();
        terminal.sendText(`echo "=== Running Verification ===" && ${verifyFullCmd}`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}