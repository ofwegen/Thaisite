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

/* ─────── Draggable Sound Chip ─────── */
function DraggableSound({ sound, isDraggingOverlay, status = 'idle', disabled = false }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: sound.id,
        data: sound,
        disabled,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const playAudio = () => {
        if (sound.audio) {
            new Audio(sound.audio).play().catch(console.error);
        }
    };

    if (isDragging && !isDraggingOverlay) {
        return <div ref={setNodeRef} className="draggable-item is-dragging" style={style} />;
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(disabled ? {} : listeners)}
            {...(disabled ? {} : attributes)}
            onClick={playAudio}
            className={clsx(
                "draggable-item",
                isDraggingOverlay && "dragging-overlay",
                status === 'correct' && "item-correct",
                status === 'incorrect' && "item-incorrect",
                status === 'idle' && "item-playable"
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
function DroppableTray({ children, isDragging }) {
    const { isOver, setNodeRef } = useDroppable({
        id: 'tray',
    });

    return (
        <div ref={setNodeRef} className={clsx("choices-tray", isOver && "tray-is-over", isDragging && "tray-hint")}>
            {children}
        </div>
    );
}

/* ─────── Droppable Target ─────── */
function DroppableTarget({ targetItem, matchedSoundItem }) {
    const { isOver, setNodeRef } = useDroppable({
        id: targetItem.id,
    });
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div
            ref={setNodeRef}
            className={clsx("target-dropzone", isOver && "is-over")}
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
                    <DraggableSound
                        sound={matchedSoundItem}
                        status={targetItem.status}
                        disabled={targetItem.status !== 'idle'}
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

/* ─────── Main Exercise Component ─────── */
export function DndExercise({ exerciseData, onReady, onComplete, description }) {
    const [targets, setTargets] = useState([]);
    const [availableSounds, setAvailableSounds] = useState([]);
    const [activeSoundId, setActiveSoundId] = useState(null);
    const [validationStatus, setValidationStatus] = useState('idle');

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

        // Was this sound on a target before?
        const sourceTargetIdx = targets.findIndex(t => t.matchedSoundId === soundId);
        const fromTarget = sourceTargetIdx !== -1;

        // Where is it going?
        const goingToTray = !over || over.id === 'tray';
        const goingToTarget = over && over.id !== 'tray';

        /* ── Case 1: Return to tray ── */
        if (goingToTray) {
            if (fromTarget) {
                setTargets(prev => prev.map(t =>
                    t.matchedSoundId === soundId ? { ...t, matchedSoundId: null } : t
                ));
                setAvailableSounds(prev =>
                    prev.find(s => s.id === soundId) ? prev : [...prev, soundObj]
                );
            }
            // If from tray to tray – nothing to do
            return;
        }

        /* ── Case 2: Place onto a target ── */
        if (goingToTarget) {
            const destTargetIdx = targets.findIndex(t => t.id === over.id);
            if (destTargetIdx === -1) return;

            const destTarget = targets[destTargetIdx];

            // If dropping on the same spot it came from – no-op
            if (destTarget.matchedSoundId === soundId) return;

            // Check if this destination already has a placed sound
            const displacedSoundId = destTarget.matchedSoundId || null;

            // Update targets
            setTargets(prev => {
                const next = [...prev];

                // Clear sound from old target
                if (fromTarget) {
                    next[sourceTargetIdx] = { ...next[sourceTargetIdx], matchedSoundId: null };
                    // If there's a displaced item, swap it into the old slot
                    if (displacedSoundId) {
                        next[sourceTargetIdx] = { ...next[sourceTargetIdx], matchedSoundId: displacedSoundId };
                    }
                }

                // Place sound into new target
                next[destTargetIdx] = { ...next[destTargetIdx], matchedSoundId: soundId };
                return next;
            });

            // Update available sounds
            setAvailableSounds(prev => {
                let next = prev.filter(s => s.id !== soundId);

                // If displaced sound goes back to tray (no swap into old target)
                if (displacedSoundId && !fromTarget) {
                    const displaced = buildSoundObj(displacedSoundId);
                    if (displaced) next = [...next, displaced];
                }

                return next;
            });
        }
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
    };

    const correctCount = targets.filter(t => t.status === 'correct').length;
    const totalCount = exerciseData.length;
    const isDragging = activeSoundId !== null;

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
                            <DraggableSound key={sound.id} sound={sound} />
                        ))}
                        {availableSounds.length === 0 && validationStatus === 'idle' && (
                            <div className="tray-empty-message">
                                All sounds assigned – click "Check" to verify!
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

            <DragOverlay dropAnimation={{ duration: 200 }}>
                {activeSound ? <DraggableSound sound={activeSound} isDraggingOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
