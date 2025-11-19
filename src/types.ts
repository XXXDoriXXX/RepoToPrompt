export interface SecurityWarning {
    file: string;
    type: string;
    line: number;
}

export interface ScanStats {
    totalFiles: number;
    totalTokens: number;
    totalChars: number;
}

export interface FileEntry {
    path: string;
    relativePath: string;
    content: string;
}

export interface ScanResult {
    status: 'success' | 'failed';
    message?: string;
    content: string;
    fileList: string[];
    stats: ScanStats;
    warnings: SecurityWarning[];
}