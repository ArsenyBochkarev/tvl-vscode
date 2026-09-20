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
        const fileExt = path.extname(document.fileName).toLowerCase();
        const isTvir = fileExt === '.tvir';
        if (fileExt !== '.tvl' && !isTvir) {
            vscode.window.showErrorMessage('Active file is not a TVL source (.tvl) or IR dump (.tvir).');
            return;
        }

        if (document.isDirty) {
            await document.save();
        }

        const sourcePath = document.uri.fsPath;

        const targetItems = [
            { label: 'TLA+', description: 'Verify using TLC model checker', target: 'tla' },
            { label: 'SPIN', description: 'Verify using SPIN/Promela', target: 'spin' }
        ];
        // Dumping the IR is only offered for .tvl sources: a .tvir file already is the IR.
        if (!isTvir) {
            targetItems.push({ label: 'TVL IR', description: 'Dump the TVL IR (.tvir) — no verification will be performed', target: 'ir' });
        }
        const selected = await vscode.window.showQuickPick(targetItems, { placeHolder: 'Select target' });
        if (!selected) {
            return;
        }

        // The 'ir' target is frontend-only: no flags apply and no verification runs.
        let extraFlags = '';
        if (selected.target !== 'ir') {
            const answer = await vscode.window.showInputBox({
                prompt: 'Additional flags for TVL',
                placeHolder: 'e.g., --channel-size=10 --trace-size=30',
                value: '--channel-size=20 --trace-size=20',
                validateInput: (value) => {
                    if (/[;&|`$]/.test(value)) {
                        return 'Shell metacharacters (;, &, |, `, $) are not allowed for safety.';
                    }
                    return null;
                }
            });
            if (answer === undefined) {
                return;
            }
            extraFlags = answer.trim();
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
                `-w /tvl tvl-env ./translate "/app/${file}" ${selected.target}${flagsPart}`
            ].join(' ');
        } else {
            verifyFullCmd = `(cd "${tvlRepo}" && ./translate "${sourcePath}" ${selected.target}${flagsPart})`;
        }

        let terminal = vscode.window.terminals.find(t => t.name === 'TVL Verifier');
        if (!terminal) {
            terminal = vscode.window.createTerminal('TVL Verifier');
        }

        terminal.show();
        const banner = selected.target === 'ir' ? 'Dumping TVL IR' : 'Running Verification';
        terminal.sendText(`echo "=== ${banner} ===" && ${verifyFullCmd}`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}