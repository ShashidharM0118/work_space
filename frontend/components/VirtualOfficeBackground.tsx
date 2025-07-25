import { useEffect, useRef } from 'react';

interface VirtualOfficeBackgroundProps {
    className?: string;
}

export default function VirtualOfficeBackground({ className }: VirtualOfficeBackgroundProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<any>(null);
    const rendererRef = useRef<any>(null);
    const animationIdRef = useRef<number>();

    useEffect(() => {
        // Check if we're in browser environment
        if (typeof window === 'undefined') return;

        // Dynamic import to avoid SSR issues
        const initThreeJS = async () => {
            try {
                // Use require instead of dynamic import for better Next.js compatibility
                const THREE = require('three');

                if (!mountRef.current) return;

                // Scene setup
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0f172a);

                // Camera setup
                const camera = new THREE.PerspectiveCamera(
                    75,
                    window.innerWidth / window.innerHeight,
                    0.1,
                    1000
                );
                camera.position.set(0, 5, 10);
                camera.lookAt(0, 0, 0);

                // Renderer setup
                const renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true
                });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                mountRef.current.appendChild(renderer.domElement);

                // Lighting
                const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(10, 10, 5);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                scene.add(directionalLight);

                // Floor
                const floorGeometry = new THREE.PlaneGeometry(20, 20);
                const floorMaterial = new THREE.MeshLambertMaterial({
                    color: 0x2d3748,
                    transparent: true,
                    opacity: 0.8
                });
                const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                floor.rotation.x = -Math.PI / 2;
                floor.receiveShadow = true;
                scene.add(floor);

                // Office desks
                const deskGeometry = new THREE.BoxGeometry(2, 0.1, 1);
                const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x8b5cf6 });

                const desks = [];
                for (let i = 0; i < 6; i++) {
                    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
                    const angle = (i / 6) * Math.PI * 2;
                    desk.position.x = Math.cos(angle) * 4;
                    desk.position.z = Math.sin(angle) * 4;
                    desk.position.y = 0.5;
                    desk.castShadow = true;
                    scene.add(desk);
                    desks.push(desk);

                    // Computer monitors
                    const monitorGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.05);
                    const monitorMaterial = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
                    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
                    monitor.position.copy(desk.position);
                    monitor.position.y += 0.35;
                    monitor.position.z += 0.2;
                    scene.add(monitor);

                    // Screen glow
                    const screenGeometry = new THREE.PlaneGeometry(0.7, 0.4);
                    const screenMaterial = new THREE.MeshBasicMaterial({
                        color: 0x3b82f6,
                        transparent: true,
                        opacity: 0.7
                    });
                    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
                    screen.position.copy(monitor.position);
                    screen.position.z += 0.026;
                    scene.add(screen);
                }

                // Floating particles
                const particleGeometry = new THREE.BufferGeometry();
                const particleCount = 100;
                const positions = new Float32Array(particleCount * 3);

                for (let i = 0; i < particleCount * 3; i++) {
                    positions[i] = (Math.random() - 0.5) * 20;
                }

                particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

                const particleMaterial = new THREE.PointsMaterial({
                    color: 0x667eea,
                    size: 0.05,
                    transparent: true,
                    opacity: 0.6
                });

                const particles = new THREE.Points(particleGeometry, particleMaterial);
                scene.add(particles);

                // Office walls (transparent)
                const wallMaterial = new THREE.MeshLambertMaterial({
                    color: 0x374151,
                    transparent: true,
                    opacity: 0.3
                });

                // Back wall
                const backWallGeometry = new THREE.PlaneGeometry(20, 8);
                const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
                backWall.position.z = -10;
                backWall.position.y = 4;
                scene.add(backWall);

                // Side walls
                const sideWallGeometry = new THREE.PlaneGeometry(20, 8);
                const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
                leftWall.rotation.y = Math.PI / 2;
                leftWall.position.x = -10;
                leftWall.position.y = 4;
                scene.add(leftWall);

                const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
                rightWall.rotation.y = -Math.PI / 2;
                rightWall.position.x = 10;
                rightWall.position.y = 4;
                scene.add(rightWall);

                // Store references
                sceneRef.current = scene;
                rendererRef.current = renderer;

                // Animation loop
                const animate = () => {
                    animationIdRef.current = requestAnimationFrame(animate);

                    // Rotate desks slowly
                    desks.forEach((desk, index) => {
                        desk.rotation.y += 0.002;
                    });

                    // Animate particles
                    const positions = particles.geometry.attributes.position.array as Float32Array;
                    for (let i = 1; i < positions.length; i += 3) {
                        positions[i] += 0.01;
                        if (positions[i] > 10) {
                            positions[i] = -10;
                        }
                    }
                    particles.geometry.attributes.position.needsUpdate = true;

                    // Rotate particles system
                    particles.rotation.y += 0.001;

                    // Camera movement
                    const time = Date.now() * 0.0005;
                    camera.position.x = Math.cos(time) * 12;
                    camera.position.z = Math.sin(time) * 12;
                    camera.lookAt(0, 0, 0);

                    renderer.render(scene, camera);
                };

                animate();

                // Handle resize
                const handleResize = () => {
                    if (!camera || !renderer) return;

                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth, window.innerHeight);
                };

                window.addEventListener('resize', handleResize);

                return () => {
                    window.removeEventListener('resize', handleResize);
                };

            } catch (error) {
                console.error('Failed to load Three.js:', error);
                // Fallback to CSS animation
                if (mountRef.current) {
                    mountRef.current.innerHTML = `
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
              opacity: 0.9;
            "></div>
          `;
                }
            }
        };

        initThreeJS();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            if (rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            className={className}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                overflow: 'hidden'
            }}
        />
    );
}