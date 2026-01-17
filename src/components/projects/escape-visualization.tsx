'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import type { Project, Day } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- Helper Classes ---
class Vector {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(v: Vector) { return new Vector(this.x + v.x, this.y + v.y); }
    subtract(v: Vector) { return new Vector(this.x - v.x, this.y - v.y); }
    multiply(s: number) { return new Vector(this.x * s, this.y * s); }
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const mag = this.magnitude();
        return mag > 0 ? new Vector(this.x / mag, this.y / mag) : new Vector();
    }
    dot(v: Vector) { return this.x * v.x + this.y * v.y; }
}

class Orb {
    pos: Vector;
    vel: Vector;
    radius: number;
    lifeClock: number; // in seconds
    id: number;

    constructor(pos: Vector, vel: Vector, radius: number) {
        this.pos = pos;
        this.vel = vel;
        this.radius = radius;
        this.lifeClock = 4.0;
        this.id = Math.random();
    }

    update(dt: number) {
        this.pos = this.pos.add(this.vel.multiply(dt));
        this.lifeClock -= dt;
    }
}

class Particle {
    pos: Vector;
    vel: Vector;
    radius: number;
    life: number;
    maxLife: number;

    constructor(pos: Vector, vel: Vector) {
        this.pos = pos;
        this.vel = vel;
        this.radius = Math.random() * 3 + 1;
        this.life = 1.0;
        this.maxLife = 1.0;
    }

    update(dt: number) {
        this.pos = this.pos.add(this.vel.multiply(dt));
        this.life -= dt;
    }
}


const EscapeVisualization = ({ project }: { project: Project }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();
    const lastTimeRef = useRef<number>();

    // Simulation state stored in refs
    const orbsRef = useRef<Orb[]>([]);
    const frozenOrbsRef = useRef<Orb[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const apertureAngleRef = useRef(0);
    const lastDayRef = useRef<Day | null>(project.days.length > 0 ? project.days[project.days.length - 1] : null);

    const createBurst = useCallback((pos: Vector, count: number) => {
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 200 + 50;
            const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
            newParticles.push(new Particle(pos, vel));
        }
        particlesRef.current.push(...newParticles);
    }, []);
    
    const purgeAndBurst = useCallback((escapePos: Vector, frozenOrbs: Orb[]) => {
        createBurst(escapePos, 150); // More particles for the winner
        for (const orb of frozenOrbs) {
            createBurst(orb.pos, 50); // Burst for each frozen orb
        }
    }, [createBurst]);

    // Effect to spawn new orbs when project.days changes
    useEffect(() => {
        const currentLastDay = project.days.length > 0 ? project.days[project.days.length - 1] : null;
        const previousLastDay = lastDayRef.current;

        if (currentLastDay && (!previousLastDay || currentLastDay.createdAt > previousLastDay.createdAt)) {
            const previousFollowerCount = previousLastDay?.followerCount || (project.days.length > 1 ? project.days[project.days.length-2].followerCount : 0) || 0;
            const newFollowers = currentLastDay.followerCount - previousFollowerCount;
            const orbsToSpawn = newFollowers * project.pixelsPerFollower; // Repurposing pixelsPerFollower

            if (orbsToSpawn > 0) {
                const newOrbs: Orb[] = [];
                for (let i = 0; i < orbsToSpawn; i++) {
                    const pos = new Vector(500, 500);
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 100 + 50;
                    const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
                    newOrbs.push(new Orb(pos, vel, 5));
                }
                orbsRef.current.push(...newOrbs);
            }
        }
        lastDayRef.current = currentLastDay;
    }, [project.days, project.pixelsPerFollower]);

    // The main animation loop
    const animate = useCallback((timestamp: number) => {
        if (lastTimeRef.current === undefined) {
            lastTimeRef.current = timestamp;
        }
        const dt = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas;
        const center = new Vector(width / 2, height / 2);
        const containerRadius = width / 2 - 20;

        // --- Update Logic ---
        apertureAngleRef.current += 0.5 * dt; // Rotate aperture

        // Update active orbs
        const stillActiveOrbs: Orb[] = [];
        const newlyFrozenOrbs: Orb[] = [];
        
        for (const orb of orbsRef.current) {
            orb.update(dt);

            if (orb.lifeClock <= 0) {
                newlyFrozenOrbs.push(orb);
                continue;
            }
            
            // Wall collision
            const toOrb = orb.pos.subtract(center);
            const distFromCenter = toOrb.magnitude();

            if (distFromCenter > containerRadius - orb.radius) {
                const normal = toOrb.normalize().multiply(-1); // Inward normal
                const reflectVel = orb.vel.subtract(normal.multiply(2 * orb.vel.dot(normal)));
                orb.vel = reflectVel;
                orb.pos = center.add(toOrb.normalize().multiply(containerRadius - orb.radius));

                // Check for escape
                const orbAngle = Math.atan2(orb.pos.y - center.y, orb.pos.x - center.x);
                const apertureSize = Math.PI / 8;
                let angleDiff = Math.abs(orbAngle - apertureAngleRef.current);
                angleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
                
                if (angleDiff <= apertureSize / 2) {
                     // WIN!
                    purgeAndBurst(orb.pos, frozenOrbsRef.current);
                    frozenOrbsRef.current = []; // Purge
                } else {
                     stillActiveOrbs.push(orb);
                }
            } else {
                 stillActiveOrbs.push(orb);
            }
        }
        orbsRef.current = stillActiveOrbs;
        frozenOrbsRef.current.push(...newlyFrozenOrbs);
        
        // Orb-orb collision
        const allOrbs = [...orbsRef.current, ...frozenOrbsRef.current];
        for(let i = 0; i < allOrbs.length; i++) {
            for(let j = i + 1; j < allOrbs.length; j++) {
                const orb1 = allOrbs[i];
                const orb2 = allOrbs[j];
                const distVec = orb1.pos.subtract(orb2.pos);
                const distMag = distVec.magnitude();
                const min_dist = orb1.radius + orb2.radius;

                if (distMag < min_dist && distMag > 0) {
                    const normal = distVec.normalize();
                    const tangent = new Vector(-normal.y, normal.x);
                    const isOrb1Frozen = frozenOrbsRef.current.some(o => o.id === orb1.id);
                    const isOrb2Frozen = frozenOrbsRef.current.some(o => o.id === orb2.id);

                    // Positional Correction
                    const overlap = min_dist - distMag;
                    if (!isOrb1Frozen && !isOrb2Frozen) {
                        orb1.pos = orb1.pos.add(normal.multiply(overlap / 2));
                        orb2.pos = orb2.pos.subtract(normal.multiply(overlap / 2));
                    } else if (!isOrb1Frozen) {
                        orb1.pos = orb1.pos.add(normal.multiply(overlap));
                    } else if (!isOrb2Frozen) {
                        orb2.pos = orb2.pos.subtract(normal.multiply(overlap));
                    }

                    // Velocity Update
                    const dpTan1 = orb1.vel.dot(tangent);
                    const dpTan2 = orb2.vel.dot(tangent);

                    if (isOrb1Frozen && isOrb2Frozen) continue;

                    if (!isOrb1Frozen && isOrb2Frozen) { // Orb1 hits frozen Orb2
                        const dpNorm1 = orb1.vel.dot(normal);
                        orb1.vel = tangent.multiply(dpTan1).add(normal.multiply(-dpNorm1));
                    } else if (isOrb1Frozen && !isOrb2Frozen) { // Orb2 hits frozen Orb1
                        const dpNorm2 = orb2.vel.dot(normal);
                        orb2.vel = tangent.multiply(dpTan2).add(normal.multiply(-dpNorm2));
                    } else { // Two active orbs collide
                        const dpNorm1 = orb1.vel.dot(normal);
                        const dpNorm2 = orb2.vel.dot(normal);
                        orb1.vel = tangent.multiply(dpTan1).add(normal.multiply(dpNorm2));
                        orb2.vel = tangent.multiply(dpTan2).add(normal.multiply(dpNorm1));
                    }
                }
            }
        }

        // Update particles
        particlesRef.current = particlesRef.current.filter(p => {
            p.update(dt);
            return p.life > 0;
        });

        // --- Drawing Logic ---
        ctx.clearRect(0, 0, width, height);

        // Draw container
        const apertureStart = apertureAngleRef.current - (Math.PI / 16);
        const apertureEnd = apertureAngleRef.current + (Math.PI / 16);
        ctx.beginPath();
        ctx.arc(center.x, center.y, containerRadius, apertureEnd, apertureStart + 2 * Math.PI);
        ctx.strokeStyle = 'hsl(var(--foreground))';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw frozen orbs
        for (const orb of frozenOrbsRef.current) {
            ctx.beginPath();
            ctx.arc(orb.pos.x, orb.pos.y, orb.radius, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(var(--accent))`;
            ctx.globalAlpha = 0.75;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Draw active orbs
        for (const orb of orbsRef.current) {
            ctx.beginPath();
            ctx.arc(orb.pos.x, orb.pos.y, orb.radius, 0, Math.PI * 2);
            const lifeRatio = Math.max(0, orb.lifeClock / 4.0);
            ctx.fillStyle = `hsl(var(--primary))`;
            ctx.globalAlpha = lifeRatio;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Timer countdown
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = `hsl(var(--primary-foreground))`;
            ctx.lineWidth = 1.5;
            ctx.arc(orb.pos.x, orb.pos.y, orb.radius + 3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * lifeRatio));
            ctx.stroke();
            ctx.restore();
        }
        
        // Draw particles
        for (const p of particlesRef.current) {
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(var(--primary))`;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        animationFrameId.current = requestAnimationFrame(animate);
    }, [createBurst, purgeAndBurst]);

    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            lastTimeRef.current = undefined;
        };
    }, [animate]);

    return (
        <Card className="premium-card">
            <CardHeader>
                <CardTitle className="label-sm">Kinetic Frustration Engine</CardTitle>
            </CardHeader>
            <CardContent>
                <canvas
                    ref={canvasRef}
                    width={1000}
                    height={1000}
                    className="w-full h-auto aspect-square bg-input rounded-lg border"
                />
            </CardContent>
        </Card>
    );
};

export default EscapeVisualization;
