import { useState, useEffect, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { Volume2, RotateCcw, Loader2 } from 'lucide-react';

/* ─────── Mobile Detection Hook ─────── */
function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const handleChange = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, [breakpoint]);

    return isMobile;
}

/* ─────── Draggable Sound Chip ─────── */
function DraggableSound({ sound, isDraggingOverlay, status = 'idle', disabled = false, isMobile, isSelected, onTap }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: sound.id,
        data: sound,
        disabled: disabled || isMobile,
    });

    const style = (!isMobile && transform) ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const playAudio = () => {
        if (sound.audio) {
            new Audio(sound.audio).play().catch(console.error);
        }
    };

    const handleClick = () => {
        if (isMobile && onTap) {
            onTap(sound.id);
        } else {
            playAudio();
        }
    };

    if (isDragging && !isDraggingOverlay) {
        return <div ref={setNodeRef} className="draggable-item is-dragging" style={style} />;
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(disabled || isMobile ? {} : listeners)}
            {...(disabled || isMobile ? {} : attributes)}
            onClick={handleClick}
            className={clsx(
                "draggable-item",
                isDraggingOverlay && "dragging-overlay",
                status === 'correct' && "item-correct",
                status === 'incorrect' && "item-incorrect",
                status === 'idle' && "item-playable",
                isSelected && "item-selected"
            )}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', pointerEvents: 'none' }}>
                {sound.audio && <Volume2 size={16} />}
                <span style={{ fontWeight: 600 }}>{sound.label || "Sound"}</span>
                {status === 'correct' && <span>✓</span>}
                {status === 'incorrect' && <span>✕</span>}
            </div>
        </div>
    );
}

/* ─────── Droppable Tray (desktop only) ─────── */
function DroppableTray({ children, isDragging }) {
    const { isOver, setNodeRef } = useDroppable({ id: 'tray' });

    return (
        <div ref={setNodeRef} className={clsx("choices-tray", isOver && "tray-is-over", isDragging && "tray-hint")}>
            {children}
        </div>
    );
}

/* ─────── Droppable Target (desktop) ─────── */
function DroppableTarget({ targetItem, matchedSoundItem }) {
    const { isOver, setNodeRef } = useDroppable({ id: targetItem.id });
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div ref={setNodeRef} className={clsx("target-dropzone", isOver && "is-over")}>
            <div className="target-image" style={{ overflow: 'hidden', position: 'relative' }}>
                {targetItem.image ? (
                    <>
                        {!imgLoaded && (
                            <div className="img-skeleton">
                                <Loader2 size={20} className="spinner" />
                            </div>
                        )}
                        <img
                            src={targetItem.image}
                            alt={targetItem.content}
                            style={{ maxHeight: '100%', maxWidth: '100%', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                            onLoad={() => setImgLoaded(true)}
                        />
                    </>
                ) : (
                    targetItem.content
                )}
            </div>
            <div className="target-slot">
                {matchedSoundItem ? (
                    <DraggableSound
                        sound={matchedSoundItem}
                        status={targetItem.status}
                        disabled={targetItem.status !== 'idle'}
                        isMobile={false}
                    />
                ) : (
                    <span className="drop-placeholder">
                        <span className="drop-placeholder-icon">↓</span>
                    </span>
                )}
            </div>
        </div>
    );
}

/* ─────── Mobile Match Row ─────── */
function MobileMatchRow({ target, soundObj, isSelected, onTapRow, status, isAdjusted }) {
    const [imgLoaded, setImgLoaded] = useState(false);

    const handleTap = () => {
        // Play audio when tapping
        if (soundObj?.audio) {
            new Audio(soundObj.audio).play().catch(console.error);
        }
        onTapRow(target.id);
    };

    return (
        <div
            className={clsx(
                "mobile-match-row",
                isSelected && "match-row-selected",
                status === 'correct' && "match-row-correct",
                status === 'incorrect' && "match-row-incorrect"
            )}
            onClick={handleTap}
        >
            {/* Left: Image */}
            <div className="match-image" style={{ overflow: 'hidden', position: 'relative' }}>
                {target.image ? (
                    <>
                        {!imgLoaded && (
                            <div className="img-skeleton">
                                <Loader2 size={16} className="spinner" />
                            </div>
                        )}
                        <img
                            src={target.image}
                            alt={target.content}
                            style={{ maxHeight: '100%', maxWidth: '100%', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                            onLoad={() => setImgLoaded(true)}
                        />
                    </>
                ) : (
                    <span className="match-image-text">{target.content}</span>
                )}
            </div>

            {/* Right: Sound */}
            <div className={clsx(
                "match-sound",
                isSelected && "match-sound-selected",
                status === 'correct' && "item-correct",
                status === 'incorrect' && "item-incorrect",
                status === 'idle' && (isAdjusted ? "item-adjusted" : "item-unadjusted")
            )}>
                {soundObj ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
                        <Volume2 size={14} />
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{soundObj.label || "Sound"}</span>
                        {status === 'correct' && <span>✓</span>}
                        {status === 'incorrect' && <span>✕</span>}
                    </div>
                ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                )}
            </div>
        </div>
    );
}

/* ─────── Main Exercise Component ─────── */
export function DndExercise({ exerciseData, onReady, onComplete, description }) {
    const [targets, setTargets] = useState([]);
    const [availableSounds, setAvailableSounds] = useState([]);
    const [activeSoundId, setActiveSoundId] = useState(null);
    const [validationStatus, setValidationStatus] = useState('idle');

    // Mobile state
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [mobileSlots, setMobileSlots] = useState([]); // array of { targetId, soundId }

    const isMobile = useIsMobile();

    const buildSoundObj = useCallback((soundId) => {
        const def = exerciseData.find(d => `sound-${d.id}` === soundId);
        if (!def) return null;
        return {
            id: soundId,
            matchId: def.matchId,
            label: def.soundText,
            audio: def.soundAudio,
            image: def.soundImage
        };
    }, [exerciseData]);

    useEffect(() => {
        setValidationStatus('idle');
        setSelectedRowId(null);

        const initialTargets = exerciseData.map(item => ({
            id: `target-${item.id}`,
            matchId: item.matchId,
            content: item.targetText,
            image: item.targetImage,
            audio: item.targetAudio,
            matchedSoundId: null,
            status: 'idle'
        }));

        const shuffledSoundIds = [...exerciseData]
            .sort(() => Math.random() - 0.5)
            .map(item => `sound-${item.id}`);

        // For mobile: pre-assign sounds randomly to targets
        const slots = initialTargets.map((t, i) => ({
            targetId: t.id,
            soundId: shuffledSoundIds[i],
            isAdjusted: false
        }));
        setMobileSlots(slots);

        const initialSounds = [...exerciseData]
            .sort(() => Math.random() - 0.5)
            .map(item => ({
                id: `sound-${item.id}`,
                matchId: item.matchId,
                label: item.soundText,
                audio: item.soundAudio,
                image: item.soundImage
            }));

        setTargets(initialTargets);
        setAvailableSounds(initialSounds);
        if (onReady) onReady();
    }, [exerciseData]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    /* ─── Desktop DnD handlers ─── */
    const handleDragStart = (event) => {
        if (validationStatus !== 'idle') return;
        setActiveSoundId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveSoundId(null);
        if (validationStatus !== 'idle') return;

        const soundId = active.id;
        const soundObj = buildSoundObj(soundId);
        if (!soundObj) return;

        const sourceTargetIdx = targets.findIndex(t => t.matchedSoundId === soundId);
        const fromTarget = sourceTargetIdx !== -1;
        const goingToTray = !over || over.id === 'tray';
        const goingToTarget = over && over.id !== 'tray';

        if (goingToTray) {
            if (fromTarget) {
                setTargets(prev => prev.map(t =>
                    t.matchedSoundId === soundId ? { ...t, matchedSoundId: null } : t
                ));
                setAvailableSounds(prev =>
                    prev.find(s => s.id === soundId) ? prev : [...prev, soundObj]
                );
            }
            return;
        }

        if (goingToTarget) {
            const destTargetIdx = targets.findIndex(t => t.id === over.id);
            if (destTargetIdx === -1) return;
            const destTarget = targets[destTargetIdx];
            if (destTarget.matchedSoundId === soundId) return;
            const displacedSoundId = destTarget.matchedSoundId || null;

            setTargets(prev => {
                const next = [...prev];
                if (fromTarget) {
                    next[sourceTargetIdx] = { ...next[sourceTargetIdx], matchedSoundId: null };
                    if (displacedSoundId) {
                        next[sourceTargetIdx] = { ...next[sourceTargetIdx], matchedSoundId: displacedSoundId };
                    }
                }
                next[destTargetIdx] = { ...next[destTargetIdx], matchedSoundId: soundId };
                return next;
            });

            setAvailableSounds(prev => {
                let next = prev.filter(s => s.id !== soundId);
                if (displacedSoundId && !fromTarget) {
                    const displaced = buildSoundObj(displacedSoundId);
                    if (displaced) next = [...next, displaced];
                }
                return next;
            });
        }
    };

    /* ─── Mobile Tap-to-Swap Handlers ─── */
    const handleTapRow = (targetId) => {
        if (validationStatus !== 'idle') return;

        if (!selectedRowId) {
            // First tap: select this row
            setSelectedRowId(targetId);
        } else if (selectedRowId === targetId) {
            // Tap same row: deselect
            setSelectedRowId(null);
        } else {
            // Second tap on different row: swap sounds
            setMobileSlots(prev => {
                const next = [...prev];
                const idx1 = next.findIndex(s => s.targetId === selectedRowId);
                const idx2 = next.findIndex(s => s.targetId === targetId);
                if (idx1 !== -1 && idx2 !== -1) {
                    const temp = next[idx1].soundId;
                    next[idx1] = { ...next[idx1], soundId: next[idx2].soundId, isAdjusted: true };
                    next[idx2] = { ...next[idx2], soundId: temp, isAdjusted: true };
                }
                return next;
            });
            setSelectedRowId(null);
        }
    };

    const getOriginalSound = useCallback((soundId) => {
        const def = exerciseData.find(d => `sound-${d.id}` === soundId);
        if (!def) return null;
        return {
            id: soundId,
            matchId: def.matchId,
            label: def.soundText,
            audio: def.soundAudio,
            image: def.soundImage
        };
    }, [exerciseData]);

    const activeSound = activeSoundId ? getOriginalSound(activeSoundId) : null;

    /* ─── Check Answers ─── */
    const handleCheckAnswers = () => {
        if (isMobile) {
            // Check mobile slots
            const results = mobileSlots.map(slot => {
                const target = targets.find(t => t.id === slot.targetId);
                const sound = exerciseData.find(d => `sound-${d.id}` === slot.soundId);
                const isCorrect = target && sound && target.matchId === sound.matchId;
                return { ...slot, status: isCorrect ? 'correct' : 'incorrect' };
            });
            setMobileSlots(results);
            const allCorrect = results.every(r => r.status === 'correct');
            setValidationStatus(allCorrect ? 'success' : 'checked');
            setSelectedRowId(null);
            if (allCorrect && onComplete) onComplete();
        } else {
            const updatedTargets = targets.map(target => {
                if (!target.matchedSoundId) return { ...target, status: 'incorrect' };
                const originalSound = exerciseData.find(d => `sound-${d.id}` === target.matchedSoundId);
                const isCorrect = originalSound && originalSound.matchId === target.matchId;
                return { ...target, status: isCorrect ? 'correct' : 'incorrect' };
            });
            setTargets(updatedTargets);
            const allCorrect = updatedTargets.every(t => t.status === 'correct');
            setValidationStatus(allCorrect ? 'success' : 'checked');
            if (allCorrect && onComplete) onComplete();
        }
    };

    const handleTryAgain = () => {
        const shuffledSoundIds = [...exerciseData]
            .sort(() => Math.random() - 0.5)
            .map(item => `sound-${item.id}`);

        const slots = targets.map((t, i) => ({
            targetId: t.id,
            soundId: shuffledSoundIds[i],
            isAdjusted: false
        }));
        setMobileSlots(slots);

        const initialSounds = [...exerciseData]
            .sort(() => Math.random() - 0.5)
            .map(item => ({
                id: `sound-${item.id}`,
                matchId: item.matchId,
                label: item.soundText,
                audio: item.soundAudio,
                image: item.soundImage
            }));

        setTargets(prev => prev.map(t => ({ ...t, matchedSoundId: null, status: 'idle' })));
        setAvailableSounds(initialSounds);
        setValidationStatus('idle');
        setSelectedRowId(null);
    };

    const correctCount = isMobile
        ? mobileSlots.filter(s => s.status === 'correct').length
        : targets.filter(t => t.status === 'correct').length;
    const totalCount = exerciseData.length;
    const isDragging = activeSoundId !== null;

    /* ═══════════════════════════════════ */
    /*  Mobile Render — Side by Side      */
    /* ═══════════════════════════════════ */
    if (isMobile) {
        return (
            <div className="dnd-container dnd-mobile">
                <p className="dnd-hint">
                    🎧 {description || 'Tap a row to select it, then tap another row to swap the sounds.'}
                </p>

                {selectedRowId && (
                    <div className="mobile-selection-banner">
                        <span>🔄 Tap another row to swap</span>
                        <button className="mobile-deselect-btn" onClick={() => setSelectedRowId(null)}>Cancel</button>
                    </div>
                )}

                <div className="mobile-match-grid">
                    {/* Column headers */}
                    <div className="match-grid-header">
                        <span>Image</span>
                        <span>Sound</span>
                    </div>

                    {targets.map(target => {
                        const slot = mobileSlots.find(s => s.targetId === target.id);
                        const soundObj = slot?.soundId ? getOriginalSound(slot.soundId) : null;
                        const status = slot?.status || 'idle';
                        return (
                            <MobileMatchRow
                                key={target.id}
                                target={target}
                                soundObj={soundObj}
                                isSelected={selectedRowId === target.id}
                                onTapRow={handleTapRow}
                                status={status}
                                isAdjusted={slot?.isAdjusted}
                            />
                        );
                    })}
                </div>

                {/* Score & Actions */}
                <div className="dnd-actions">
                    {validationStatus !== 'idle' && (
                        <div className={clsx("score-display", validationStatus === 'success' && "score-success")}>
                            <span className="score-text">
                                Result: <strong>{correctCount} / {totalCount}</strong> correct
                            </span>
                            {validationStatus === 'success' && <span className="score-emoji">🎉</span>}
                        </div>
                    )}

                    {validationStatus === 'idle' ? (
                        <button onClick={handleCheckAnswers} className="primary-button">
                            Check
                        </button>
                    ) : (
                        <button onClick={handleTryAgain} className="primary-button try-again-button">
                            <RotateCcw size={18} />
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════ */
    /*  Desktop Render — Drag & Drop      */
    /* ═══════════════════════════════════ */
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="dnd-container">
                <p className="dnd-hint">
                    🎧 {description || 'Click a sound to play it. Drag it onto the matching image.'}
                </p>

                <div className="targets-area">
                    {targets.map(target => {
                        const matchedSoundObj = target.matchedSoundId ? getOriginalSound(target.matchedSoundId) : null;
                        return (
                            <DroppableTarget
                                key={target.id}
                                targetItem={target}
                                matchedSoundItem={matchedSoundObj}
                            />
                        );
                    })}
                </div>

                <DroppableTray isDragging={isDragging}>
                    <div className="tray-header">
                        <h3 className="choices-title">🔊 Available Sounds</h3>
                        {isDragging && (
                            <span className="tray-drop-hint">← Drop here to return</span>
                        )}
                    </div>
                    <div className="choices-grid">
                        {availableSounds.map(sound => (
                            <DraggableSound key={sound.id} sound={sound} isMobile={false} />
                        ))}
                        {availableSounds.length === 0 && validationStatus === 'idle' && (
                            <div className="tray-empty-message">
                                All sounds assigned – click &quot;Check&quot; to verify!
                            </div>
                        )}
                    </div>

                    <div className="dnd-actions">
                        {validationStatus !== 'idle' && (
                            <div className={clsx("score-display", validationStatus === 'success' && "score-success")}>
                                <span className="score-text">
                                    Result: <strong>{correctCount} / {totalCount}</strong> correct
                                </span>
                                {validationStatus === 'success' && <span className="score-emoji">🎉</span>}
                            </div>
                        )}

                        {validationStatus === 'idle' ? (
                            <button
                                onClick={handleCheckAnswers}
                                className="primary-button"
                                disabled={targets.every(t => !t.matchedSoundId)}
                            >
                                Check
                            </button>
                        ) : (
                            <button onClick={handleTryAgain} className="primary-button try-again-button">
                                <RotateCcw size={18} />
                                Try Again
                            </button>
                        )}
                    </div>
                </DroppableTray>
            </div>

            <DragOverlay dropAnimation={{ duration: 200 }}>
                {activeSound ? <DraggableSound sound={activeSound} isDraggingOverlay isMobile={false} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
