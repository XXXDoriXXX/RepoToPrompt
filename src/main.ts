import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { FileManager } from './FileManager';
import { ScanResult } from './types';

let win: BrowserWindow | null = null;

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('scan-files', async (event, inputPaths: string[]): Promise<ScanResult> => {
    try {
        const files = await FileManager.processPaths(inputPaths);

        if (files.length === 0) {
            return {
                status: 'failed', message: 'No valid text files found',
                content: '', fileList: [], stats: {totalFiles:0, totalTokens:0, totalChars:0}, warnings: []
            };
        }

        let finalOutput = 'PROJECT CONTEXT:\n================\n';

        for (const file of files) {
            finalOutput += `<file path="${file.relativePath}">\n${file.content}\n</file>\n\n`;
        }

        const tokens = FileManager.countTokens(finalOutput);
        const warnings = FileManager.scanForKeys(files);

        return {
            status: 'success',
            content: finalOutput,
            fileList: files.map(f => f.relativePath),
            stats: {
                totalFiles: files.length,
                totalTokens: tokens,
                totalChars: finalOutput.length
            },
            warnings
        };

    } catch (error: any) {
        return { status: 'failed', message: error.message, content: '', fileList: [], stats: {totalFiles:0, totalTokens:0, totalChars:0}, warnings: [] };
    }
});

ipcMain.handle('save-file', async (event, content: string) => {
    const { filePath, canceled } = await dialog.showSaveDialog(win!, {
        title: 'Save Context File',
        defaultPath: 'context.txt',
        filters: [{ name: 'Text File', extensions: ['txt', 'md'] }]
    });

    if (canceled || !filePath) return { success: false };
    await FileManager.writeFile(filePath, content);
    return { success: true, path: filePath };
});