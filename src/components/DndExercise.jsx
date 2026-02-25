import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Volume2, RotateCcw, Loader2, GripVertical } from 'lucide-react';

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

/* ─────── Shared Audio Player Hook ─────── */
function useAudioPlayer(audioUrls) {
    const cacheRef = useRef(new Map());
    const currentRef = useRef(null);

    // Preload all audio URLs into the cache
    useEffect(() => {
        const cache = cacheRef.current;
        audioUrls.forEach(url => {
            if (url && !cache.has(url)) {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = url;
                cache.set(url, audio);
            }
        });
    }, [audioUrls]);

    const playSound = useCallback((url) => {
        if (!url) return;

        // Stop currently playing sound
        if (currentRef.current) {
            currentRef.current.pause();
            currentRef.current.currentTime = 0;
        }

        // Get from cache or create new
        let audio = cacheRef.current.get(url);
        if (!audio) {
            audio = new Audio(url);
            audio.preload = 'auto';
            cacheRef.current.set(url, audio);
        }

        audio.currentTime = 0;
        currentRef.current = audio;
        audio.play().catch(console.error);
    }, []);

    return playSound;
}

/* ─────── Draggable Sound Chip ─────── */
function DraggableSound({ sound, isDraggingOverlay, status = 'idle', disabled = false, isMobile, isAdjusted, isActiveSource, onPlay }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: sound.id,
        data: sound,
        disabled: disabled,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const playAudio = () => {
        if (sound.audio && onPlay) {
            onPlay(sound.audio);
        }
    };

    if (isDragging && !isDraggingOverlay) {
        return <div ref={setNodeRef} className="draggable-item is-dragging" style={style} />;
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(!isMobile && !disabled ? listeners : {})}
            {...(!isMobile && !disabled ? attributes : {})}
            onClick={!isMobile || isDraggingOverlay ? playAudio : undefined}
            className={clsx(
                "draggable-item",
                isMobile && "mobile-draggable-item",
                isDraggingOverlay && "dragging-overlay",
                status === 'correct' && "item-correct",
                status === 'incorrect' && "item-incorrect",
                status === 'idle' && (isMobile ? (isAdjusted && !isActiveSource ? "item-adjusted" : "item-unadjusted") : "item-playable")
            )}
        >
            <div
                className="sound-chip-content"
                onClick={isMobile && !isDraggingOverlay ? playAudio : undefined}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}
            >
                <Volume2 size={16} />
                <span style={{ fontWeight: 600 }}>{sound.label || "Sound"}</span>
                {status === 'correct' && <span>✓</span>}
                {status === 'incorrect' && <span>✕</span>}
            </div>
            {isMobile && !disabled && (
                <div
                    className="drag-handle"
                    {...listeners}
                    {...attributes}
                    style={{ padding: '0 8px', display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.6, touchAction: 'none' }}
                >
                    <GripVertical size={18} />
                </div>
            )}
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

/* ─────── Droppable Target (Desktop) ─────── */
function DroppableTarget({ targetItem, matchedSoundItem, onPlay }) {
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
                        onPlay={onPlay}
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

/* ─────── Mobile Match Row (Droppable) ─────── */
function MobileMatchRow({ targetItem, matchedSoundItem, isAdjusted, isActiveSource, onPlay }) {
    const { isOver, setNodeRef } = useDroppable({ id: targetItem.id });
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div className={clsx("mobile-match-row", isOver && "match-row-is-over")}>
            {/* Left: Image */}
            <div className="match-image" style={{ overflow: 'hidden', position: 'relative' }}>
                {targetItem.image ? (
                    <>
                        {!imgLoaded && (
                            <div className="img-skeleton">
                                <Loader2 size={16} className="spinner" />
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
                    <span className="match-image-text">{targetItem.content}</span>
                )}
            </div>

            {/* Right: Sound Slot */}
            <div ref={setNodeRef} className={clsx("mobile-target-slot", isOver && "slot-is-over")}>
                {matchedSoundItem ? (
                    <DraggableSound
                        sound={matchedSoundItem}
                        status={targetItem.status}
                        disabled={targetItem.status !== 'idle'}
                        isMobile={true}
                        isAdjusted={isAdjusted}
                        isActiveSource={isActiveSource}
                        onPlay={onPlay}
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
    const [adjustedSoundIds, setAdjustedSoundIds] = useState(new Set());
    const [activeSoundId, setActiveSoundId] = useState(null);
    const [validationStatus, setValidationStatus] = useState('idle');

    const isMobile = useIsMobile();

    // Extract all audio URLs for preloading
    const audioUrls = useMemo(() => exerciseData.map(d => d.soundAudio).filter(Boolean), [exerciseData]);
    const playSound = useAudioPlayer(audioUrls);

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
        setAdjustedSoundIds(new Set());

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

        if (isMobile) {
            // Mobile: sounds start randomly pre-placed in targets
            setTargets(initialTargets.map((t, i) => ({ ...t, matchedSoundId: shuffledSoundIds[i] })));
            setAvailableSounds([]);
        } else {
            // Desktop: sounds start in the tray
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
        }

        if (onReady) onReady();
    }, [exerciseData, isMobile]);

    // Sensors Configuration
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, {
            // No delay needed on mobile because we have a dedicated drag handle
            activationConstraint: { tolerance: 5, delay: 0 }
        }),
        useSensor(KeyboardSensor)
    );

    /* ─── Shared Drag & Drop Handlers ─── */
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
            if (fromTarget && !isMobile) {
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

            // Same target
            if (destTarget.matchedSoundId === soundId) return;

            const displacedSoundId = destTarget.matchedSoundId || null;

            // Mark dragged sound as adjusted
            setAdjustedSoundIds(prev => new Set(prev).add(soundId));

            setTargets(prev => {
                const next = [...prev];
                if (fromTarget) {
                    // SWAP if from another target
                    next[sourceTargetIdx] = { ...next[sourceTargetIdx], matchedSoundId: displacedSoundId };
                }
                next[destTargetIdx] = { ...next[destTargetIdx], matchedSoundId: soundId };
                return next;
            });

            // Put displaced sound in tray if not from a target (e.g. desktop tray to full target)
            if (displacedSoundId && !fromTarget && !isMobile) {
                setAvailableSounds(prev => {
                    let next = prev.filter(s => s.id !== soundId);
                    const displaced = buildSoundObj(displacedSoundId);
                    if (displaced) next = [...next, displaced];
                    return next;
                });
            } else if (!isMobile) {
                // Just remove from tray
                setAvailableSounds(prev => prev.filter(s => s.id !== soundId));
            }
        }
    };

    const getOriginalSound = useCallback((soundId) => {
        if (!soundId) return null;
        return buildSoundObj(soundId);
    }, [buildSoundObj]);

    const activeSound = activeSoundId ? getOriginalSound(activeSoundId) : null;

    /* ─── Check Answers ─── */
    const handleCheckAnswers = () => {
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
    };

    const handleTryAgain = () => {
        const shuffledSoundIds = [...exerciseData]
            .sort(() => Math.random() - 0.5)
            .map(item => `sound-${item.id}`);

        if (isMobile) {
            setTargets(prev => prev.map((t, i) => ({ ...t, matchedSoundId: shuffledSoundIds[i], status: 'idle' })));
        } else {
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
        }
        setAdjustedSoundIds(new Set());
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
            <div className={clsx("dnd-container", isMobile && "dnd-mobile")}>
                <p className="dnd-hint">
                    {isMobile
                        ? '👆 Tap a sound to play it. Drag the handle (⣿) to swap.'
                        : '🎧 Click a sound to play it. Drag it onto the matching image.'}
                </p>

                {isMobile ? (
                    /* Mobile Layout */
                    <div className="mobile-match-grid">
                        <div className="match-grid-header">
                            <span>Image</span>
                            <span>Sound</span>
                        </div>
                        {targets.map(target => (
                            <MobileMatchRow
                                key={target.id}
                                targetItem={target}
                                matchedSoundItem={getOriginalSound(target.matchedSoundId)}
                                isAdjusted={adjustedSoundIds.has(target.matchedSoundId)}
                                isActiveSource={activeSoundId === target.matchedSoundId}
                                onPlay={playSound}
                            />
                        ))}
                    </div>
                ) : (
                    /* Desktop Layout */
                    <div className="targets-area">
                        {targets.map(target => (
                            <DroppableTarget
                                key={target.id}
                                targetItem={target}
                                matchedSoundItem={getOriginalSound(target.matchedSoundId)}
                                onPlay={playSound}
                            />
                        ))}
                    </div>
                )}

                {/* Mobile Check Actions */}
                {isMobile && (
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
                )}

                {!isMobile && (
                    <DroppableTray isDragging={isDragging}>
                        <div className="tray-header">
                            <h3 className="choices-title">🔊 Available Sounds</h3>
                            {isDragging && (
                                <span className="tray-drop-hint">← Drop here to return</span>
                            )}
                        </div>
                        <div className="choices-grid">
                            {availableSounds.map(sound => (
                                <DraggableSound key={sound.id} sound={sound} isMobile={false} onPlay={playSound} />
                            ))}
                            {availableSounds.length === 0 && validationStatus === 'idle' && (
                                <div className="tray-empty-message">
                                    All sounds assigned – click "Check" to verify!
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
                )}
            </div>

            <DragOverlay dropAnimation={{ duration: 200 }}>
                {activeSound ? <DraggableSound sound={activeSound} isDraggingOverlay isMobile={isMobile} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
