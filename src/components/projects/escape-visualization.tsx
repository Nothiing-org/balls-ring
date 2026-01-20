'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Project, Day } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, Minus, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

// --- Simulation Constants ---
const RING_RADIUS = 260;
const BALL_RADIUS = 18;
const GAP_SIZE = 0.65;
const FROZEN_MAX_LIFE = 10000; // 10 seconds
const WALL_JUMP_FORCE = 15;
const MAX_ACTIVE_BALLS = 50; // Performance cap

const settings = {
    easy: { gravity: 0.1, ringSpeed: 0.015, friction: 0.995 },
    normal: { gravity: 0.22, ringSpeed: 0.03, friction: 0.992 },
    hard: { gravity: 0.38, ringSpeed: 0.05, friction: 0.99 },
    impossible: { gravity: 0.55, ringSpeed: 0.08, friction: 0.985 }
};

type Difficulty = keyof typeof settings;

// --- Helper Classes ---
class Ball {
    x: number; y: number; vx: number; vy: number; radius: number;
    spawnTime: number; lifeSpan: number; frozenAt: number;
    id: string; color: string; isFrozen: boolean; escaped: boolean;
    isJumping: number; opacity: number;
    
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.radius = BALL_RADIUS;
        this.spawnTime = Date.now();
        this.lifeSpan = 3000 + Math.random() * 1000;
        this.frozenAt = 0;
        this.id = Math.random().toString(36).substr(2, 9);
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
        this.isFrozen = false;
        this.escaped = false;
        this.isJumping = 0;
        this.opacity = 1;
    }
}

class Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; decay: number; color: string;
    
    constructor(x: number, y: number, color: string) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.015;
        this.color = color;
    }
    update() { 
        this.x += this.vx; 
        this.y += this.vy; 
        this.vy += 0.15; // Gravity
        this.life -= this.decay; 
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}


const EscapeVisualization = ({ project }: { project: Project }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number>();
    const audioCtxRef = useRef<AudioContext | null>(null);

    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [frozenCount, setFrozenCount] = useState(0);
    const [pendingOrbCount, setPendingOrbCount] = useState(0);
    const [statusText, setStatusText] = useState('NORMAL');
    const [showPurge, setShowPurge] = useState(false);

    const ballsRef = useRef<Ball[]>([]);
    const frozenBallsRef = useRef<Ball[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const pendingOrbsRef = useRef<number>(0);
    const ringAngleRef = useRef(0);
    const isPurgingRef = useRef(false);
    const lastDayRef = useRef<Day | null>(project.days.length > 0 ? project.days[project.days.length - 1] : null);
    
    const dims = { width: 1000, height: 1000, centerX: 500, centerY: 500 };

    // --- Sound Engine ---
    const playSound = useCallback((type: 'bounce' | 'freeze' | 'purge' | 'vanish') => {
        if (isMuted || typeof window === 'undefined') return;

        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
                return;
            }
        }
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

        switch (type) {
            case 'bounce':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.2);
                break;
            case 'freeze':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.3);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.3);
                break;
            case 'purge':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.5);
                break;
            case 'vanish':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.5);
                break;
        }
    }, [isMuted]);

    const createParticles = useCallback((x: number, y: number, color: string, count = 10) => {
        for (let i = 0; i < count; i++) particlesRef.current.push(new Particle(x, y, color));
    }, []);

    const triggerPurge = useCallback(() => {
        if (isPurgingRef.current) return;
        playSound('purge');
        isPurgingRef.current = true;
        setShowPurge(true);

        // Create dust from all current balls
        frozenBallsRef.current.forEach(b => createParticles(b.x, b.y, '#ffffff', 70));
        ballsRef.current.forEach(b => createParticles(b.x, b.y, b.color, 100));

        // Instantly remove balls from the simulation
        ballsRef.current = [];
        frozenBallsRef.current = [];

        setTimeout(() => {
            // Reset the purge state text/effects after the particles have faded
            isPurgingRef.current = false;
            setShowPurge(false);
        }, 2000);
    }, [createParticles, playSound]);

    useEffect(() => {
        const currentLastDay = project.days.length > 0 ? project.days[project.days.length - 1] : null;
        const previousLastDay = lastDayRef.current;

        if (currentLastDay && (!previousLastDay || currentLastDay.createdAt > previousLastDay.createdAt)) {
            const previousFollowerCount = previousLastDay?.followerCount || (project.days.length > 1 ? project.days[project.days.length - 2].followerCount : 0) || 0;
            const newFollowers = currentLastDay.followerCount - previousFollowerCount;
            const orbsToSpawn = newFollowers > 0 ? newFollowers * project.pixelsPerFollower : 0;

            if (orbsToSpawn > 0) {
                 pendingOrbsRef.current += orbsToSpawn;
            }
        }
        lastDayRef.current = currentLastDay;
    }, [project.days, project.pixelsPerFollower]);


    const animate = useCallback(() => {
        if (isPaused) {
            animationFrameId.current = requestAnimationFrame(animate);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height, centerX, centerY } = dims;

        // --- Spawning Logic ---
        const canSpawn = ballsRef.current.length < MAX_ACTIVE_BALLS;
        if (canSpawn && pendingOrbsRef.current > 0) {
            const orbsToSpawnNow = Math.min(pendingOrbsRef.current, MAX_ACTIVE_BALLS - ballsRef.current.length);
            for(let i=0; i<orbsToSpawnNow; i++) {
                ballsRef.current.push(new Ball(dims.centerX, dims.centerY - 100));
            }
            pendingOrbsRef.current -= orbsToSpawnNow;
        } else if (ballsRef.current.length === 0 && frozenBallsRef.current.length === 0 && pendingOrbsRef.current === 0 && !isPurgingRef.current) {
             // Fallback to ensure simulation doesn't die
            ballsRef.current.push(new Ball(centerX, centerY - 100));
        }

        // Background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for(let i=0; i<width; i+=100) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke(); }
        for(let i=0; i<height; i+=100) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke(); }

        const config = settings[difficulty];
        ringAngleRef.current += isPurgingRef.current ? 0.2 : config.ringSpeed;


        // Draw Ring
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(ringAngleRef.current);
        ctx.beginPath();
        ctx.arc(0, 0, RING_RADIUS, GAP_SIZE, Math.PI * 2);
        ctx.strokeStyle = isPurgingRef.current ? '#00ff88' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Update & Draw Particles
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);
        particlesRef.current.forEach(p => { p.update(); p.draw(ctx); });
        
        // --- Update & Collision Logic ---
        const allBalls = [...ballsRef.current, ...frozenBallsRef.current];
        for (let i = 0; i < allBalls.length; i++) {
            for (let j = i + 1; j < allBalls.length; j++) {
                const b1 = allBalls[i];
                const b2 = allBalls[j];
                
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist && dist > 0) {
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    if (!b1.isFrozen && !b2.isFrozen) { // Both balls are active
                        const overlapHalf = overlap * 0.5;
                        b1.x -= nx * overlapHalf; b1.y -= ny * overlapHalf;
                        b2.x += nx * overlapHalf; b2.y += ny * overlapHalf;

                        const relVx = b1.vx - b2.vx;
                        const relVy = b1.vy - b2.vy;
                        const dot = relVx * nx + relVy * ny;
                        
                        if (dot <= 0) {
                           const restitution = 0.8;
                           const impulse = (1 + restitution) * 0.5 * dot;
                           b1.vx -= impulse * nx;
                           b1.vy -= impulse * ny;
                           b2.vx += impulse * nx;
                           b2.vy += impulse * ny;
                        }
                    } else if (!b1.isFrozen && b2.isFrozen) { // b1 active, b2 frozen
                        b1.x -= nx * overlap;
                        b1.y -= ny * overlap;
                        
                        const normalX = -nx;
                        const normalY = -ny;
                        b1.vx = normalX * WALL_JUMP_FORCE;
                        b1.vy = normalY * WALL_JUMP_FORCE;
                        b1.isJumping = 8;
                        playSound('bounce');
                    } else if (b1.isFrozen && !b2.isFrozen) { // b1 frozen, b2 active
                        b2.x += nx * overlap;
                        b2.y += ny * overlap;

                        const normalX = nx;
                        const normalY = ny;
                        b2.vx = normalX * WALL_JUMP_FORCE;
                        b2.vy = normalY * WALL_JUMP_FORCE;
                        b2.isJumping = 8;
                        playSound('bounce');
                    }
                }
            }
        }
        
        // --- Individual Ball Update Loop ---
        const stillActiveBalls: Ball[] = [];
        ballsRef.current.forEach(b => {
            if (b.escaped) return;

            b.vy += config.gravity;
            b.vx *= config.friction;
            b.vy *= config.friction;
            b.x += b.vx;
            b.y += b.vy;

            if (b.isJumping > 0) b.isJumping--;

            const dx = b.x - centerX;
            const dy = b.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Ring collision
            if (dist + b.radius > RING_RADIUS) {
                const angle = Math.atan2(dy, dx);
                const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
                const ringStart = (ringAngleRef.current + Math.PI * 2) % (Math.PI * 2);
                const ringEnd = (ringStart + GAP_SIZE) % (Math.PI * 2);

                let inGap = ringStart < ringEnd
                    ? normalizedAngle >= ringStart && normalizedAngle <= ringEnd
                    : normalizedAngle >= ringStart || normalizedAngle <= ringEnd;

                if (inGap) {
                    if (dist > RING_RADIUS + 30) {
                        b.escaped = true;
                        triggerPurge();
                    }
                } else {
                    const nx = dx / dist; const ny = dy / dist;
                    b.vx = -nx * WALL_JUMP_FORCE; b.vy = -ny * WALL_JUMP_FORCE;
                    b.isJumping = 12;
                    createParticles(b.x, b.y, '#ffffff', 3);
                    playSound('bounce');
                    b.x = centerX + nx * (RING_RADIUS - b.radius - 2);
                    b.y = centerY + ny * (RING_RADIUS - b.radius - 2);
                }
            }
            
            if (Date.now() - b.spawnTime > b.lifeSpan && !b.escaped) {
                b.isFrozen = true;
                b.frozenAt = Date.now();
                b.vx = 0; b.vy = 0;
                b.color = '#ffffff';
                frozenBallsRef.current.push(b);
                createParticles(b.x, b.y, '#ffffff', 12);
                playSound('freeze');
            } else {
                 if (!b.escaped) {
                    stillActiveBalls.push(b);
                }
            }
        });
        ballsRef.current = stillActiveBalls;

        // Frozen ball decay
        const stillFrozenBalls: Ball[] = [];
        frozenBallsRef.current.forEach(b => {
             const timeAsFrozen = Date.now() - b.frozenAt;
             if (timeAsFrozen > FROZEN_MAX_LIFE) {
                b.opacity -= 0.05;
                if (b.opacity > 0) {
                    stillFrozenBalls.push(b);
                } else {
                    createParticles(b.x, b.y, '#ffffff', 8);
                    playSound('vanish');
                }
             } else {
                stillFrozenBalls.push(b);
             }
        });
        frozenBallsRef.current = stillFrozenBalls;

        // --- Drawing ---
        [...frozenBallsRef.current, ...ballsRef.current].forEach(b => {
            ctx.save();
            ctx.globalAlpha = b.opacity;
            ctx.beginPath();
            
            if (b.isJumping > 0) {
                ctx.shadowBlur = 25; ctx.shadowColor = '#ffffff';
            } else {
                ctx.shadowBlur = b.isFrozen ? 0 : 25; ctx.shadowColor = b.color;
            }

            if (b.isFrozen) {
                const timeAsFrozen = Date.now() - b.frozenAt;
                if (timeAsFrozen > FROZEN_MAX_LIFE * 0.75) {
                    if (Math.floor(Date.now() / 100) % 2 === 0) {
                        ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
                    }
                }
            }

            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.isJumping > 0 ? '#ffffff' : b.color;
            ctx.fill();
            ctx.restore();

            // Countdown timer text
            if (!b.isFrozen && !b.escaped) {
                const elapsed = Date.now() - b.spawnTime;
                const remainingLifetime = b.lifeSpan - elapsed;

                if (remainingLifetime <= 3100 && remainingLifetime > 0) {
                    const remainingSeconds = Math.ceil(remainingLifetime / 1000);
                    ctx.save();
                    ctx.font = 'bold 20px sans-serif';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(remainingSeconds.toString(), b.x, b.y);
                    ctx.restore();
                }
                
                // Timer Ring
                const remaining = Math.max(0, 1 - (elapsed / b.lifeSpan));
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius + 8, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * remaining));
                ctx.strokeStyle = remaining < 0.25 ? '#ff3b3b' : '#ffffff';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        });

        // Update UI Text
        setFrozenCount(frozenBallsRef.current.length);
        setPendingOrbCount(pendingOrbsRef.current);
        if (isPurgingRef.current) {
            setStatusText("PURGING");
        } else {
            setStatusText(difficulty.toUpperCase());
        }

        animationFrameId.current = requestAnimationFrame(animate);
    }, [difficulty, createParticles, triggerPurge, playSound, isPaused, dims.centerX, dims.centerY]);

    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [animate]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const DiffButton = ({ level, children }: { level: Difficulty, children: React.ReactNode }) => (
      <button
        type="button"
        className={cn(
          "diff-btn bg-white/5 border border-white/10 text-white/60 px-3.5 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all hover:bg-white/10 hover:text-white",
          { "active bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]": difficulty === level }
        )}
        onClick={() => setDifficulty(level)}
      >
        {children}
      </button>
    );

    return (
        <div ref={containerRef} className="relative w-full aspect-square bg-[#050505] rounded-lg border border-border data-[fullscreen=true]:!rounded-none data-[fullscreen=true]:!border-none" data-fullscreen={isFullscreen}>
            <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-5 z-10">
                <div className="mod-panel bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-black">Simulation Mods</div>
                        <button 
                            type="button" 
                            onClick={() => setIsMinimized(!isMinimized)} 
                            className="text-white/50 hover:text-white transition-opacity pointer-events-auto"
                        >
                            {isMinimized ? <Plus size={16} /> : <Minus size={16} />}
                        </button>
                    </div>
                    {!isMinimized && (
                        <div className="flex gap-1.5">
                            <DiffButton level="easy">Easy</DiffButton>
                            <DiffButton level="normal">Normal</DiffButton>
                            <DiffButton level="hard">Hard</DiffButton>
                            <DiffButton level="impossible">H-Impossible</DiffButton>
                        </div>
                    )}
                </div>
                 <div className="mod-panel bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto flex flex-col gap-2">
                    <div className="flex justify-between items-center min-w-[180px] bg-white/5 px-4 py-2.5 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-white/50">Core Engine</span>
                        <span className={cn("text-xs font-black", statusText === 'PURGING' ? 'text-green-400 animate-pulse' : 'text-blue-400')}>
                            {statusText}
                        </span>
                    </div>
                    <div className="flex justify-between items-center min-w-[180px] bg-white/5 px-4 py-2.5 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-white/50">Frozen Nodes</span>
                        <span className="text-xs font-black text-red-500">{frozenCount}</span>
                    </div>
                     <div className="flex justify-between items-center min-w-[180px] bg-white/5 px-4 py-2.5 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-white/50">Pending Orbs</span>
                        <span className="text-xs font-black text-yellow-400">{pendingOrbCount}</span>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-6 pointer-events-auto z-10">
                <div className="mod-panel flex gap-2 !p-2">
                    <button
                        type="button"
                        onClick={() => setIsPaused(!isPaused)}
                        className="h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 text-white/60 rounded-lg transition-all hover:bg-white/10 hover:text-white"
                        aria-label={isPaused ? 'Play' : 'Pause'}
                    >
                        {isPaused ? <Play size={20} /> : <Pause size={20} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 text-white/60 rounded-lg transition-all hover:bg-white/10 hover:text-white"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                     <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 text-white/60 rounded-lg transition-all hover:bg-white/10 hover:text-white"
                        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>
            </div>

            <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] font-black text-[#00ff88] transition-all duration-300 pointer-events-none [text-shadow:0_0_40px_rgba(0,255,136,0.6)] z-20 -tracking-wider",
                showPurge ? "opacity-100 scale-100" : "opacity-0 scale-50"
            )}>
                PURGED
            </div>

            <canvas
                ref={canvasRef}
                width={dims.width}
                height={dims.height}
                className="w-full h-full"
            />
        </div>
    );
};

export default EscapeVisualization;
