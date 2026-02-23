import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'progress_done';

function readFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeToStorage(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function decodeProgressCode(code) {
    try {
        const decoded = atob(code.trim());
        return decoded.split(',').filter(Boolean);
    } catch {
        return [];
    }
}

function encodeProgressCode(ids) {
    return btoa(ids.join(','));
}

function readFromHash() {
    const hash = window.location.hash;
    const match = hash.match(/#p=(.+)/);
    if (match) {
        return decodeProgressCode(match[1]);
    }
    return [];
}

export function useProgress() {
    const [doneIds, setDoneIds] = useState(() => {
        const stored = readFromStorage();
        const fromHash = readFromHash();
        // Merge both sources
        const merged = [...new Set([...stored, ...fromHash])];
        // If hash had data, persist the merge
        if (fromHash.length > 0 && merged.length > stored.length) {
            writeToStorage(merged);
        }
        return merged;
    });

    // Sync to localStorage whenever doneIds changes
    useEffect(() => {
        writeToStorage(doneIds);
    }, [doneIds]);

    const markDone = useCallback((path) => {
        setDoneIds(prev => {
            if (prev.includes(path)) return prev;
            return [...prev, path];
        });
    }, []);

    const isDone = useCallback((path) => {
        return doneIds.includes(path);
    }, [doneIds]);

    const resetProgress = useCallback(() => {
        setDoneIds([]);
        localStorage.removeItem(STORAGE_KEY);
        // Clear hash if present
        if (window.location.hash.startsWith('#p=')) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }, []);

    const exportCode = useCallback(() => {
        return encodeProgressCode(doneIds);
    }, [doneIds]);

    const importCode = useCallback((code) => {
        const imported = decodeProgressCode(code);
        if (imported.length === 0) return false;
        setDoneIds(prev => {
            const merged = [...new Set([...prev, ...imported])];
            return merged;
        });
        return true;
    }, []);

    const syncToUrl = useCallback(() => {
        const code = encodeProgressCode(doneIds);
        const url = window.location.pathname + window.location.search + '#p=' + code;
        history.replaceState(null, '', url);
        return window.location.origin + url;
    }, [doneIds]);

    const doneCount = doneIds.length;

    return {
        doneIds,
        doneCount,
        markDone,
        isDone,
        resetProgress,
        exportCode,
        importCode,
        syncToUrl,
    };
}
