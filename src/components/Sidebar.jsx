import { X, Headset, FileText, Download, Upload, Link2, Trash2, CheckCircle2, ChevronDown, ChevronRight, ClipboardCopy } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

export function Sidebar({ isOpen, onClose, contentData, selectedPath, onSelect, progress }) {
    // Expand only the first unit by default
    const [expandedUnits, setExpandedUnits] = useState({ [contentData[0]?.unit]: true });
    const [showProgress, setShowProgress] = useState(false);
    const [exportCode, setExportCode] = useState('');
    const [importValue, setImportValue] = useState('');
    const [importStatus, setImportStatus] = useState(null); // 'success' | 'error' | null
    const [copied, setCopied] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const toggleUnit = (unitName) => {
        setExpandedUnits(prev => ({ ...prev, [unitName]: !prev[unitName] }));
    };

    // Count total dnd exercises
    const totalExercises = contentData.reduce((sum, unit) =>
        sum + unit.pages.filter(p => p.type === 'dnd' && p.data.length > 0).length, 0
    );

    const handleExport = () => {
        const code = progress.exportCode();
        setExportCode(code);
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(exportCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: select the text
        }
    };

    const handleCopyLink = async () => {
        const url = progress.syncToUrl();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    };

    const handleImport = () => {
        if (!importValue.trim()) return;
        const success = progress.importCode(importValue);
        setImportStatus(success ? 'success' : 'error');
        if (success) setImportValue('');
        setTimeout(() => setImportStatus(null), 3000);
    };

    const handleReset = () => {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 4000);
            return;
        }
        progress.resetProgress();
        setConfirmReset(false);
        setExportCode('');
    };

    return (
        <aside className={clsx('sidebar', isOpen && 'sidebar-open')}>
            <div className="sidebar-header">
                <h2 className="logo">Thai 101</h2>
                <button className="close-button" onClick={onClose} aria-label="Close menu">
                    <X size={20} />
                </button>
            </div>

            {/* Overall Progress Summary */}
            <div className="overall-progress">
                <div className="overall-progress-label">
                    <span>Progress</span>
                    <span className="overall-progress-count">{progress.doneCount} / {totalExercises}</span>
                </div>
                <div className="overall-progress-bar">
                    <div
                        className="overall-progress-fill"
                        style={{ width: totalExercises > 0 ? `${(progress.doneCount / totalExercises) * 100}%` : '0%' }}
                    />
                </div>
            </div>

            <nav className="sidebar-nav">
                {contentData.map(unitGroup => {
                    // Determine active state for unit summary
                    const hasActiveChild = unitGroup.pages.some(p => p.path === selectedPath) || (unitGroup.unitPdfUrl && selectedPath === unitGroup.unitPdfUrl);

                    // Unit progress
                    const unitDndPages = unitGroup.pages.filter(p => p.type === 'dnd' && p.data.length > 0);
                    const unitDoneCount = unitDndPages.filter(p => progress.isDone(p.path)).length;
                    const unitTotal = unitDndPages.length;
                    const unitComplete = unitTotal > 0 && unitDoneCount === unitTotal;

                    return (
                        <div key={unitGroup.unit} className="nav-group">
                            <h3
                                className={clsx("nav-group-title", hasActiveChild && "active-group", unitComplete && "unit-complete")}
                                onClick={() => toggleUnit(unitGroup.unit)}
                                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <span style={{ flex: 1, color: hasActiveChild ? 'var(--color-primary)' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {unitComplete && <CheckCircle2 size={14} className="unit-check-icon" />}
                                    {unitGroup.unit}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {unitTotal > 0 && (
                                        <span className="unit-progress-badge">{unitDoneCount}/{unitTotal}</span>
                                    )}
                                    <span style={{ fontSize: '0.8rem' }}>{expandedUnits[unitGroup.unit] ? '▼' : '▶'}</span>
                                </span>
                            </h3>

                            {/* Unit progress bar */}
                            {unitTotal > 0 && (
                                <div className="unit-progress-bar">
                                    <div
                                        className="unit-progress-fill"
                                        style={{ width: `${(unitDoneCount / unitTotal) * 100}%` }}
                                    />
                                </div>
                            )}

                            {expandedUnits[unitGroup.unit] && (
                                <ul className="nav-list">
                                    {unitGroup.unitPdfUrl && (
                                        <li>
                                            <a
                                                href="#"
                                                className={clsx("nav-link", selectedPath === unitGroup.unitPdfUrl && "active")}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    onSelect(unitGroup.unitPdfUrl);
                                                }}
                                            >
                                                <FileText size={18} />
                                                <span>Lesson PDF</span>
                                            </a>
                                        </li>
                                    )}
                                    {unitGroup.pages.map(page => {
                                        const done = page.type === 'dnd' && page.data.length > 0 && progress.isDone(page.path);
                                        return (
                                            <li key={page.path}>
                                                <a
                                                    href="#"
                                                    className={clsx("nav-link", selectedPath === page.path && "active", done && "nav-link-done")}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onSelect(page.path);
                                                    }}
                                                >
                                                    {page.type === 'pdf' ? <FileText size={18} /> : <Headset size={18} />}
                                                    <span>{page.title}</span>
                                                    {done && <CheckCircle2 size={16} className="done-badge" />}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Progress Management Panel */}
            <div className="progress-panel">
                <button
                    className="progress-panel-toggle"
                    onClick={() => { setShowProgress(!showProgress); if (!showProgress) handleExport(); }}
                >
                    <Download size={16} />
                    <span>Manage Progress</span>
                    {showProgress ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {showProgress && (
                    <div className="progress-panel-content">
                        {/* Export */}
                        <div className="progress-section">
                            <label className="progress-section-label">Export</label>
                            {exportCode && (
                                <div className="export-code-container">
                                    <textarea
                                        className="progress-code-textarea"
                                        value={exportCode}
                                        readOnly
                                        rows={2}
                                        onClick={(e) => e.target.select()}
                                    />
                                    <div className="export-actions">
                                        <button className="small-button" onClick={handleCopyCode} title="Copy code">
                                            <ClipboardCopy size={14} />
                                            {copied ? 'Copied!' : 'Copy Code'}
                                        </button>
                                        <button className="small-button" onClick={handleCopyLink} title="Copy link">
                                            <Link2 size={14} />
                                            Copy Link
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Import */}
                        <div className="progress-section">
                            <label className="progress-section-label">Import</label>
                            <div className="import-container">
                                <input
                                    className="progress-import-input"
                                    type="text"
                                    placeholder="Paste code here…"
                                    value={importValue}
                                    onChange={e => setImportValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleImport()}
                                />
                                <button className="small-button import-button" onClick={handleImport}>
                                    <Upload size={14} />
                                    Import
                                </button>
                            </div>
                            {importStatus === 'success' && <span className="import-feedback success">✓ Imported!</span>}
                            {importStatus === 'error' && <span className="import-feedback error">✕ Invalid code</span>}
                        </div>

                        {/* Reset */}
                        <button className={clsx("reset-button", confirmReset && "reset-confirm")} onClick={handleReset}>
                            <Trash2 size={14} />
                            {confirmReset ? 'Really reset?' : 'Reset Progress'}
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
