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

    const playAudio = (e) => {
        if (sound.audio) {
            new Audio(sound.audio).play().catch(console.error);
        }
    };

    const handleClick = (e) => {
        if (isMobile && onTap) {
            onTap(sound.id);
        } else {
            playAudio(e);
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

/* ─────── Mobile Sound Chip (placed on target, tappable to return) ─────── */
function PlacedSoundChip({ sound, status = 'idle', isMobile, onTapReturn }) {
    const playAudio = () => {
        if (sound.audio) {
            new Audio(sound.audio).play().catch(console.error);
        }
    };

    const handleClick = () => {
        if (isMobile && status === 'idle' && onTapReturn) {
            onTapReturn(sound.id);
        } else {
            playAudio();
        }
    };

    return (
        <div
            onClick={handleClick}
            className={clsx(
                "draggable-item",
                status === 'correct' && "item-correct",
                status === 'incorrect' && "item-incorrect",
                status === 'idle' && "item-playable",
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

/* ─────── Droppable Tray ─────── */
function DroppableTray({ children, isDragging, isMobile }) {
    const { isOver, setNodeRef } = useDroppable({
        id: 'tray',
        disabled: isMobile,
    });

    return (
        <div ref={setNodeRef} className={clsx("choices-tray", isOver && "tray-is-over", isDragging && "tray-hint")}>
            {children}
        </div>
    );
}

/* ─────── Droppable Target ─────── */
function DroppableTarget({ targetItem, matchedSoundItem, isMobile, hasSelectedSound, onTapTarget, onTapReturnSound }) {
    const { isOver, setNodeRef } = useDroppable({
        id: targetItem.id,
        disabled: isMobile,
    });
    const [imgLoaded, setImgLoaded] = useState(false);

    const handleClick = () => {
        if (isMobile && hasSelectedSound && !matchedSoundItem && targetItem.status === 'idle') {
            onTapTarget(targetItem.id);
        }
    };

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "target-dropzone",
                isOver && "is-over",
                isMobile && hasSelectedSound && !matchedSoundItem && targetItem.status === 'idle' && "target-ready"
            )}
            onClick={handleClick}
        >
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
                    isMobile && targetItem.status === 'idle' ? (
                        <PlacedSoundChip
                            sound={matchedSoundItem}
                            status={targetItem.status}
                            isMobile={isMobile}
                            onTapReturn={onTapReturnSound}
                        />
                    ) : (
                        <DraggableSound
                            sound={matchedSoundItem}
                            status={targetItem.status}
                            disabled={targetItem.status !== 'idle'}
                            isMobile={isMobile}
                        />
                    )
                ) : (
                    <span className={clsx("drop-placeholder", isMobile && hasSelectedSound && "drop-placeholder-active")}>
                        <span className="drop-placeholder-icon">↓</span>
                    </span>
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
    const [selectedSoundId, setSelectedSoundId] = useState(null); // mobile tap-to-select

    const isMobile = useIsMobile();

    // Helper to build a sound object from exerciseData
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
        setSelectedSoundId(null);

        const initialTargets = exerciseData.map(item => ({
            id: `target-${item.id}`,
            matchId: item.matchId,
            content: item.targetText,
            image: item.targetImage,
            audio: item.targetAudio,
            matchedSoundId: null,
            status: 'idle'
        }));

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
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        }),
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

    /* ─── Mobile Tap Handlers ─── */
    const handleTapSound = (soundId) => {
        if (validationStatus !== 'idle') return;

        // Play the audio
        const def = exerciseData.find(d => `sound-${d.id}` === soundId);
        if (def?.soundAudio) {
            new Audio(def.soundAudio).play().catch(console.error);
        }

        // Toggle selection
        setSelectedSoundId(prev => prev === soundId ? null : soundId);
    };

    const handleTapTarget = (targetId) => {
        if (!selectedSoundId || validationStatus !== 'idle') return;

        const soundObj = buildSoundObj(selectedSoundId);
        if (!soundObj) return;

        const destTargetIdx = targets.findIndex(t => t.id === targetId);
        if (destTargetIdx === -1) return;

        // Place it
        setTargets(prev => {
            const next = [...prev];
            next[destTargetIdx] = { ...next[destTargetIdx], matchedSoundId: selectedSoundId };
            return next;
        });

        setAvailableSounds(prev => prev.filter(s => s.id !== selectedSoundId));
        setSelectedSoundId(null);
    };

    const handleTapReturnSound = (soundId) => {
        if (validationStatus !== 'idle') return;

        const soundObj = buildSoundObj(soundId);
        if (!soundObj) return;

        // Remove from target
        setTargets(prev => prev.map(t =>
            t.matchedSoundId === soundId ? { ...t, matchedSoundId: null } : t
        ));

        // Add back to tray
        setAvailableSounds(prev =>
            prev.find(s => s.id === soundId) ? prev : [...prev, soundObj]
        );
    };

    // Resolve a sound id to a sound object for rendering
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

    const handleCheckAnswers = () => {
        const updatedTargets = targets.map(target => {
            if (!target.matchedSoundId) {
                return { ...target, status: 'incorrect' };
            }
            const originalSound = exerciseData.find(d => `sound-${d.id}` === target.matchedSoundId);
            const isCorrect = originalSound && originalSound.matchId === target.matchId;
            return { ...target, status: isCorrect ? 'correct' : 'incorrect' };
        });

        setTargets(updatedTargets);
        setSelectedSoundId(null);
        const allCorrect = updatedTargets.every(t => t.status === 'correct');
        setValidationStatus(allCorrect ? 'success' : 'checked');
        if (allCorrect && onComplete) onComplete();
    };

    const handleTryAgain = () => {
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
        setSelectedSoundId(null);
    };

    const correctCount = targets.filter(t => t.status === 'correct').length;
    const totalCount = exerciseData.length;
    const isDragging = activeSoundId !== null;

    /* ─── Render ─── */
    const exerciseContent = (
        <div className={clsx("dnd-container", isMobile && "dnd-mobile")}>
            {isMobile && selectedSoundId && (
                <div className="mobile-selection-banner">
                    <span>👆 Tap a target to place the sound</span>
                    <button className="mobile-deselect-btn" onClick={() => setSelectedSoundId(null)}>Cancel</button>
                </div>
            )}

            <p className="dnd-hint">
                🎧 {description || (isMobile
                    ? 'Tap a sound to select it, then tap a target to place it.'
                    : 'Click a sound to play it. Drag it onto the matching image.'
                )}
            </p>

            <div className="targets-area">
                {targets.map(target => {
                    const matchedSoundObj = target.matchedSoundId ? getOriginalSound(target.matchedSoundId) : null;
                    return (
                        <DroppableTarget
                            key={target.id}
                            targetItem={target}
                            matchedSoundItem={matchedSoundObj}
                            isMobile={isMobile}
                            hasSelectedSound={!!selectedSoundId}
                            onTapTarget={handleTapTarget}
                            onTapReturnSound={handleTapReturnSound}
                        />
                    );
                })}
            </div>

            <DroppableTray isDragging={isDragging} isMobile={isMobile}>
                <div className="tray-header">
                    <h3 className="choices-title">🔊 Available Sounds</h3>
                    {!isMobile && isDragging && (
                        <span className="tray-drop-hint">← Drop here to return</span>
                    )}
                </div>
                <div className="choices-grid">
                    {availableSounds.map(sound => (
                        <DraggableSound
                            key={sound.id}
                            sound={sound}
                            isMobile={isMobile}
                            isSelected={selectedSoundId === sound.id}
                            onTap={handleTapSound}
                        />
                    ))}
                    {availableSounds.length === 0 && validationStatus === 'idle' && (
                        <div className="tray-empty-message">
                            All sounds assigned – click &quot;Check&quot; to verify!
                        </div>
                    )}
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
    );

    /* On mobile, skip DndContext entirely to prevent touch conflicts */
    if (isMobile) {
        return exerciseContent;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {exerciseContent}

            <DragOverlay dropAnimation={{ duration: 200 }}>
                {activeSound ? <DraggableSound sound={activeSound} isDraggingOverlay isMobile={false} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
