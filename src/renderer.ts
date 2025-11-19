import { ipcRenderer, webUtils, clipboard } from 'electron';
import { ScanResult } from './types';

const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
const resultsPanel = document.getElementById('results-panel') as HTMLDivElement;
const fileListEl = document.getElementById('file-list') as HTMLUListElement;
const statsEl = document.getElementById('stats-info') as HTMLDivElement;
const warningEl = document.getElementById('security-warnings') as HTMLDivElement;

const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const btnBack = document.getElementById('btn-back') as HTMLButtonElement;

let currentContent = '';

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    dropZone.addEventListener(e, (ev) => { ev.preventDefault(); ev.stopPropagation(); });
});

dropZone.addEventListener('dragover', (e) => {
    dropZone.classList.add('hover');
    if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));

dropZone.addEventListener('drop', async (e: DragEvent) => {
    dropZone.classList.remove('hover');
    const dt = e.dataTransfer;
    if (!dt || !dt.files.length) return;

    const paths = Array.from(dt.files).map(f => webUtils.getPathForFile(f));

    dropZone.style.display = 'none';
    resultsPanel.style.display = 'flex';
    statsEl.innerHTML = '<div class="stat-box" style="grid-column:span 3">⏳ Scanning & Counting Tokens...</div>';
    fileListEl.innerHTML = '';
    warningEl.style.display = 'none';
    btnCopy.disabled = true;
    btnSave.disabled = true;

    try {
        const result = await ipcRenderer.invoke('scan-files', paths) as ScanResult;

        if (result.status === 'failed') {
            alert('Error: ' + result.message);
            resetUI();
            return;
        }

        currentContent = result.content;

        statsEl.innerHTML = `
            <div class="stat-box">
                <span class="stat-label">FILES</span>
                <span class="stat-value">${result.stats.totalFiles}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">TOKENS</span>
                <span class="stat-value">${result.stats.totalTokens.toLocaleString()}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">SIZE</span>
                <span class="stat-value">${(result.stats.totalChars / 1024).toFixed(1)} KB</span>
            </div>
        `;

        fileListEl.innerHTML = result.fileList.map(f => `<li>📄 ${f}</li>`).join('');

        if (result.warnings.length > 0) {
            warningEl.style.display = 'block';
            warningEl.innerHTML = `<strong>⚠️ SECURITY RISK:</strong> ${result.warnings.length} keys detected! <br/>` +
                result.warnings.map(w => `<small>${w.type} in ${w.file}</small>`).join('<br/>');
        }

        btnCopy.disabled = false;
        btnSave.disabled = false;

    } catch (error) {
        console.error(error);
        alert('Critical error during scan.');
        resetUI();
    }
});

btnCopy.addEventListener('click', () => {
    clipboard.writeText(currentContent);
    btnCopy.innerText = '✅ Copied!';
    setTimeout(() => btnCopy.innerText = '📋 Copy to Clipboard', 2000);
});

btnSave.addEventListener('click', async () => {
    const res = await ipcRenderer.invoke('save-file', currentContent);
    if (res.success) alert(`Saved to: ${res.path}`);
});

btnBack.addEventListener('click', resetUI);

function resetUI() {
    currentContent = '';
    resultsPanel.style.display = 'none';
    dropZone.style.display = 'flex';
}