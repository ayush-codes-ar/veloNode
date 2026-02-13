import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CinematicHero = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [images, setImages] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [progress, setProgress] = useState(0);

    const frameCount = 224;
    const currentFrame = (index) => `/assets/hero-sequence/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;

    // 1. Preload all frames
    useEffect(() => {
        let loadedCount = 0;
        const tempImages = [];
        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                loadedCount++;
                setProgress(Math.round((loadedCount / frameCount) * 100));
                if (loadedCount === 20) setIsLoaded(true);
            };
            tempImages.push(img);
        }
        setImages(tempImages);
    }, []);

    // 2. Canvas rendering with smart positioning
    useEffect(() => {
        if (images.length === 0) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const render = (index, resize = false) => {
            if (!images[index]) return;
            if (resize) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            const img = images[index];
            const sw = img.width;
            const sh = img.height;
            const imgAspect = sw / sh;

            // Frame width: big enough to look cinematic, small enough to not cover text
            // Desktop: 65% of viewport width, Tablet: 80%, Mobile: 95%
            let frameW;
            if (canvas.width >= 1024) {
                frameW = canvas.width * 0.65;
            } else if (canvas.width >= 768) {
                frameW = canvas.width * 0.80;
            } else {
                frameW = canvas.width * 0.95;
            }

            // Clamp
            if (frameW > 1200) frameW = 1200;

            const frameH = frameW / imgAspect;

            // Center horizontally
            const drawX = (canvas.width - frameW) / 2;

            // Push DOWN so it clears the top headline area
            // Top of frame starts at ~35% of viewport height on desktop
            // This leaves the top ~35% free for the VeloNode title
            let topOffset;
            if (canvas.width >= 1024) {
                topOffset = canvas.height * 0.30;
            } else if (canvas.width >= 768) {
                topOffset = canvas.height * 0.28;
            } else {
                topOffset = canvas.height * 0.25;
            }

            const drawY = topOffset;

            // Black background to match frame edges
            context.fillStyle = "#000000";
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the frame
            context.drawImage(img, 0, 0, sw, sh, drawX, drawY, frameW, frameH);
        };

        render(0, true);

        const handleResize = () => render(Math.floor(playhead.frame), true);
        window.addEventListener('resize', handleResize);

        // 3. GSAP scroll animation
        const playhead = { frame: 0 };
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: wrapperRef.current,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.1,
                }
            });
            tl.to(playhead, { frame: 50, snap: "frame", ease: "none", duration: 0.2 })
                .to(playhead, { frame: 70, snap: "frame", ease: "none", duration: 0.1 })
                .to(playhead, { frame: 90, snap: "frame", ease: "none", duration: 0.1 })
                .to(playhead, { frame: 170, snap: "frame", ease: "none", duration: 0.35 })
                .to(playhead, { frame: frameCount - 1, snap: "frame", ease: "none", duration: 0.25 });
            tl.eventCallback("onUpdate", () => render(Math.floor(playhead.frame)));
        }, containerRef);

        return () => {
            window.removeEventListener('resize', handleResize);
            ctx.revert();
        };
    }, [isLoaded, images]);

    return (
        <div ref={wrapperRef} className="relative w-full h-[200vh] bg-black">
            <div ref={containerRef} className="sticky top-0 w-full h-screen overflow-hidden">

                {/* Canvas */}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

                {/* Text Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="relative w-full h-full max-w-[1600px] mx-auto px-6 md:px-12">

                        {/* TOP CENTER: Brand */}
                        <div className="absolute top-[8%] md:top-[10%] left-1/2 transform -translate-x-1/2 text-center w-full z-10">
                            <span className="text-blue-500 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-3 block animate-pulse">
                                Decentralized Intelligence
                            </span>
                            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-2xl">
                                Velo<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Node</span>
                            </h1>
                        </div>

                        {/* LEFT SIDE */}
                        <div className="hidden md:block absolute top-[45%] left-[3%] lg:left-[5%] max-w-[220px] lg:max-w-[260px] text-left space-y-3">
                            <div>
                                <h3 className="text-white font-bold text-base lg:text-lg mb-1">Compute Unleashed</h3>
                                <div className="h-[2px] w-10 bg-blue-500 rounded-full"></div>
                            </div>
                            <p className="text-gray-500 text-xs lg:text-sm leading-relaxed">
                                Access massive GPU compute power instantly or monetize your idle hardware.
                            </p>
                        </div>

                        {/* RIGHT SIDE */}
                        <div className="hidden md:flex absolute top-[45%] right-[3%] lg:right-[5%] max-w-[220px] lg:max-w-[260px] text-right flex-col items-end space-y-4">
                            <div>
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Network Status</p>
                                <div className="flex items-center justify-end space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <p className="text-lg font-mono text-white">OPTIMAL</p>
                                </div>
                            </div>
                            <div className="pointer-events-auto">
                                <button className="group relative px-6 py-3 bg-transparent border border-blue-500/30 text-blue-400 font-bold uppercase tracking-widest text-xs rounded transition-all hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                                    Launch App
                                    <span className="absolute inset-0 rounded ring-1 ring-white/10 group-hover:ring-white/20 transition-all"></span>
                                </button>
                            </div>
                        </div>

                        {/* Mobile CTA */}
                        <div className="md:hidden absolute bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-auto text-center">
                            <p className="text-gray-500 text-xs mb-4">Decentralized GPU Network</p>
                            <button className="px-8 py-3 bg-transparent border border-blue-500/30 text-blue-400 font-bold uppercase tracking-widest text-xs rounded transition-all hover:bg-blue-500/10">
                                Launch App
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

                {/* Loading */}
                {!isLoaded && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">Loading... {progress}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CinematicHero;
