import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import Orb from './components/Orb';

interface Circle {
  id: number;
  phi: number;
  theta: number;
  phrase: string;
  color: { light: string; dark: string };
}

export default function App() {
  // Initialize rotation to ensure no circle appears centered on load
  const [rotation, setRotation] = useState({ x: Math.PI / 3, y: Math.PI / 4 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: Math.PI / 3, y: Math.PI / 4 });
  const lastDragTime = useRef(0);
  const lastDragPos = useRef({ x: 0, y: 0 });
  const dragVelocity = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sphereContainerRef = useRef<HTMLDivElement>(null);

  // Create circles distributed on a sphere using Fibonacci sphere algorithm
  const phrases = [
    'Something small ends up being important',
    'A delay turns out to be useful',
    'The obvious path quietly disappears',
    'An old idea becomes relevant again',
    'Timing works out without effort',
    'A backup plan becomes the plan',
    'A quiet opportunity keeps compounding',
    'The long way around proves shorter',
    'Something ends without drama',
    'A constraint creates clarity',
    'Momentum shows up late, but steady',
    'An assumption quietly breaks',
    'The pressure lifts unexpectedly',
    'The situation simplifies itself',
    'The overlooked thing gets recognized',
    'Clarity appears in an unexpected place',
  ];

  const colors = [
    { light: 'rgba(75, 60, 120, 0.8)', dark: 'rgba(25, 20, 45, 1)' }, // Dark purple
    { light: 'rgba(40, 70, 130, 0.8)', dark: 'rgba(15, 25, 50, 1)' }, // Dark blue
    { light: 'rgba(120, 45, 80, 0.8)', dark: 'rgba(45, 15, 35, 1)' }, // Dark pink
    { light: 'rgba(30, 90, 60, 0.8)', dark: 'rgba(10, 35, 25, 1)' }, // Dark green
    { light: 'rgba(130, 75, 40, 0.8)', dark: 'rgba(50, 25, 15, 1)' }, // Dark orange
    { light: 'rgba(90, 50, 110, 0.8)', dark: 'rgba(35, 20, 45, 1)' }, // Dark purple-pink
    { light: 'rgba(30, 80, 110, 0.8)', dark: 'rgba(10, 30, 45, 1)' }, // Dark sky blue
    { light: 'rgba(110, 40, 55, 0.8)', dark: 'rgba(45, 15, 25, 1)' }, // Dark rose
    { light: 'rgba(35, 95, 80, 0.8)', dark: 'rgba(15, 40, 35, 1)' }, // Dark teal
    { light: 'rgba(100, 85, 25, 0.8)', dark: 'rgba(40, 35, 10, 1)' }, // Dark yellow
    { light: 'rgba(70, 35, 100, 0.8)', dark: 'rgba(30, 15, 45, 1)' }, // Deep dark purple
    { light: 'rgba(55, 55, 110, 0.8)', dark: 'rgba(20, 20, 45, 1)' }, // Dark indigo
    { light: 'rgba(105, 40, 40, 0.8)', dark: 'rgba(45, 15, 15, 1)' }, // Dark red
    { light: 'rgba(25, 85, 95, 0.8)', dark: 'rgba(10, 35, 40, 1)' }, // Dark cyan
    { light: 'rgba(75, 100, 35, 0.8)', dark: 'rgba(30, 40, 15, 1)' }, // Dark lime
    { light: 'rgba(95, 40, 105, 0.8)', dark: 'rgba(40, 15, 45, 1)' }, // Dark fuchsia
  ];

  const circles: Circle[] = [];
  const numCircles = 16;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < numCircles; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / numCircles);
    const theta = (2 * Math.PI * i) / goldenRatio;
    circles.push({ 
      id: i, 
      phi, 
      theta, 
      phrase: phrases[i],
      color: colors[i]
    });
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastDragTime.current = Date.now();
    lastDragPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    const rotationSpeed = 0.005;
    setRotation({
      x: currentRotation.current.x - deltaY * rotationSpeed,
      y: currentRotation.current.y + deltaX * rotationSpeed,
    });

    // Update velocity
    const currentTime = Date.now();
    const timeDelta = currentTime - lastDragTime.current;
    if (timeDelta > 0) {
      dragVelocity.current = {
        x: (e.clientX - lastDragPos.current.x) / timeDelta,
        y: (e.clientY - lastDragPos.current.y) / timeDelta,
      };
    }
    lastDragTime.current = currentTime;
    lastDragPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    currentRotation.current = rotation;
    
    // Start momentum spin to land on a circle
    const velocityMagnitude = Math.sqrt(
      dragVelocity.current.x ** 2 + dragVelocity.current.y ** 2
    );
    
    // Only spin if there's sufficient velocity
    if (velocityMagnitude > 0.1 && !isSpinning) {
      setIsSpinning(true);
      
      // Pick a random circle
      const randomCircle = circles[Math.floor(Math.random() * circles.length)];
      
      // Calculate momentum-based extra rotation (reduced by half)
      const rotationSpeed = 0.005;
      const momentumX = -dragVelocity.current.y * rotationSpeed * 250; // Reduced from 500 to 250
      const momentumY = dragVelocity.current.x * rotationSpeed * 250; // Reduced from 500 to 250
      
      // Target rotation includes momentum and lands on the selected circle
      const targetY = -randomCircle.theta + rotation.y + momentumY;
      const targetX = -randomCircle.phi + Math.PI / 2 + momentumX;
      
      // Animate rotation
      const startRotation = { ...rotation };
      const startTime = Date.now();
      const duration = 2500; // 2.5 seconds
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const newRotation = {
          x: startRotation.x + (targetX - startRotation.x) * eased,
          y: startRotation.y + (targetY - startRotation.y) * eased,
        };
        
        setRotation(newRotation);
        currentRotation.current = newRotation;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsSpinning(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    // Reset velocity
    dragVelocity.current = { x: 0, y: 0 };
  };

  // Add native touch event listeners with passive: false to enable preventDefault
  useEffect(() => {
    const container = sphereContainerRef.current;
    if (!container) return;

    const handleTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      setIsDragging(true);
      dragStart.current = { x: touch.clientX, y: touch.clientY };
      lastDragTime.current = Date.now();
      lastDragPos.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault(); // This prevents scrolling
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.current.x;
      const deltaY = touch.clientY - dragStart.current.y;

      const rotationSpeed = 0.005;
      setRotation({
        x: currentRotation.current.x - deltaY * rotationSpeed,
        y: currentRotation.current.y + deltaX * rotationSpeed,
      });

      // Update velocity
      const currentTime = Date.now();
      const timeDelta = currentTime - lastDragTime.current;
      if (timeDelta > 0) {
        dragVelocity.current = {
          x: (touch.clientX - lastDragPos.current.x) / timeDelta,
          y: (touch.clientY - lastDragPos.current.y) / timeDelta,
        };
      }
      lastDragTime.current = currentTime;
      lastDragPos.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEndNative = () => {
      setIsDragging(false);
      currentRotation.current = rotation;
      
      // Start momentum spin to land on a circle
      const velocityMagnitude = Math.sqrt(
        dragVelocity.current.x ** 2 + dragVelocity.current.y ** 2
      );
      
      // Only spin if there's sufficient velocity
      if (velocityMagnitude > 0.1 && !isSpinning) {
        setIsSpinning(true);
        
        // Pick a random circle
        const randomCircle = circles[Math.floor(Math.random() * circles.length)];
        
        // Calculate momentum-based extra rotation
        const rotationSpeed = 0.005;
        const momentumX = -dragVelocity.current.y * rotationSpeed * 250;
        const momentumY = dragVelocity.current.x * rotationSpeed * 250;
        
        // Target rotation includes momentum and lands on the selected circle
        const targetY = -randomCircle.theta + rotation.y + momentumY;
        const targetX = -randomCircle.phi + Math.PI / 2 + momentumX;
        
        // Animate rotation
        const startRotation = { ...rotation };
        const startTime = Date.now();
        const duration = 2500;
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          
          const newRotation = {
            x: startRotation.x + (targetX - startRotation.x) * eased,
            y: startRotation.y + (targetY - startRotation.y) * eased,
          };
          
          setRotation(newRotation);
          currentRotation.current = newRotation;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setIsSpinning(false);
          }
        };
        
        requestAnimationFrame(animate);
      }
      
      // Reset velocity
      dragVelocity.current = { x: 0, y: 0 };
    };

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStartNative, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    container.addEventListener('touchend', handleTouchEndNative, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartNative);
      container.removeEventListener('touchmove', handleTouchMoveNative);
      container.removeEventListener('touchend', handleTouchEndNative);
    };
  }, [rotation, isDragging, isSpinning]);

  const handleSpin = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    
    // Pick a random circle
    const randomCircle = circles[Math.floor(Math.random() * circles.length)];
    
    // Calculate target rotation to bring this circle to the center front
    // We want the circle to end up with z at maximum (front) and x,y near 0 (center)
    // For a sphere, max z happens when phi is close to 0
    // We need: rotatedTheta = 0 (so rotation.y = -theta) 
    // And we need to rotate X so the circle moves to phi ≈ 0
    const targetY = -randomCircle.theta + currentRotation.current.y + Math.PI * 4; // Add 2 full rotations
    
    // Calculate target X rotation to bring the circle to the front
    // The circle's original phi determines how much we need to rotate
    // We want to rotate so that this circle ends up at phi ≈ 0 (top/front of sphere)
    const targetX = -randomCircle.phi + Math.PI / 2; // Adjust to bring to center
    
    // Animate rotation
    const startRotation = { ...currentRotation.current };
    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const newRotation = {
        x: startRotation.x + (targetX - startRotation.x) * eased,
        y: startRotation.y + (targetY - startRotation.y) * eased,
      };
      
      setRotation(newRotation);
      currentRotation.current = newRotation;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
      }
    };
    
    requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isDragging) return;
      
      setIsDragging(false);
      currentRotation.current = rotation;
      
      // Start momentum spin to land on a circle
      const velocityMagnitude = Math.sqrt(
        dragVelocity.current.x ** 2 + dragVelocity.current.y ** 2
      );
      
      // Only spin if there's sufficient velocity
      if (velocityMagnitude > 0.1 && !isSpinning) {
        setIsSpinning(true);
        
        // Pick a random circle
        const randomCircle = circles[Math.floor(Math.random() * circles.length)];
        
        // Calculate momentum-based extra rotation (reduced by half)
        const rotationSpeed = 0.005;
        const momentumX = -dragVelocity.current.y * rotationSpeed * 250; // Reduced from 500 to 250
        const momentumY = dragVelocity.current.x * rotationSpeed * 250; // Reduced from 500 to 250
        
        // Target rotation includes momentum and lands on the selected circle
        const targetY = -randomCircle.theta + rotation.y + momentumY;
        const targetX = -randomCircle.phi + Math.PI / 2 + momentumX;
        
        // Animate rotation
        const startRotation = { ...rotation };
        const startTime = Date.now();
        const duration = 2500; // 2.5 seconds
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          
          const newRotation = {
            x: startRotation.x + (targetX - startRotation.x) * eased,
            y: startRotation.y + (targetY - startRotation.y) * eased,
          };
          
          setRotation(newRotation);
          currentRotation.current = newRotation;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setIsSpinning(false);
          }
        };
        
        requestAnimationFrame(animate);
      }
      
      // Reset velocity
      dragVelocity.current = { x: 0, y: 0 };
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [rotation, isDragging, isSpinning]);

  // Camera effect
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        setIsCameraOn(false);
        setCameraError('Camera access denied. Please allow camera permissions in your browser.');
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (isCameraOn) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraOn]);

  const toggleCamera = () => {
    if (!isCameraOn) {
      setCameraError(null); // Clear any previous errors
    }
    setIsCameraOn(!isCameraOn);
  };

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (cameraError) {
      const timer = setTimeout(() => {
        setCameraError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cameraError]);

  // Calculate 3D position for each circle
  const getCirclePosition = (circle: Circle) => {
    const radius = 250;

    // Apply rotation
    const rotatedPhi = circle.phi;
    const rotatedTheta = circle.theta + rotation.y;

    // Spherical to Cartesian coordinates
    let x = radius * Math.sin(rotatedPhi) * Math.cos(rotatedTheta);
    let y = radius * Math.sin(rotatedPhi) * Math.sin(rotatedTheta);
    let z = radius * Math.cos(rotatedPhi);

    // Apply X rotation
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const y2 = y * cosX - z * sinX;
    const z2 = y * sinX + z * cosX;

    return { x, y: y2, z: z2 };
  };

  // Sort circles by z-index (back to front)
  const sortedCircles = [...circles]
    .map((circle) => {
      const pos = getCirclePosition(circle);
      return { circle, pos };
    })
    .sort((a, b) => a.pos.z - b.pos.z);

  return (
    <div className="w-screen h-screen overflow-hidden select-none relative" style={{ backgroundColor: '#00001E', position: 'fixed', inset: 0 }}>
      {/* Camera Background */}
      {isCameraOn && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.6 }}
        />
      )}

      {/* Orb Background */}
      {!isCameraOn && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <div style={{ width: '200%', height: '200%', position: 'relative', opacity: 0.8 }}>
            <Orb
              hue={270}
              hoverIntensity={0.4}
              rotateOnHover={false}
              forceHoverState={false}
              backgroundColor="#00001E"
            />
          </div>
        </div>
      )}

      {/* Edge Glow for Depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255, 255, 255, 0.03) 70%, rgba(255, 255, 255, 0.08) 100%)',
        }}
      />
      
      {/* Title */}
      <div className="absolute top-2 md:top-6 left-1/2 -translate-x-1/2 z-10 px-1">
        <h1 
          className="md:whitespace-nowrap text-center max-w-[95vw]"
          style={{
            fontFamily: '"Rock 3D", system-ui',
            fontSize: 'clamp(1.2rem, 6vw, 3.5rem)',
            color: 'white',
            textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(138, 43, 226, 0.4)',
            lineHeight: '1.2',
          }}
        >
          Your 2026 Prediction
        </h1>
      </div>

      {/* Camera Toggle Button */}
      <button
        onClick={toggleCamera}
        className="absolute top-2 md:top-6 right-2 md:right-6 z-10 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-white/20 transition-all duration-300 hover:bg-white/15 hover:border-white/30 backdrop-blur-sm"
        style={{
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        {isCameraOn ? 'Camera Off' : 'Camera On'}
      </button>

      {/* Sphere Container */}
      <div className="w-full h-full flex items-center justify-center" style={{ padding: 'clamp(60px, 15vh, 100px) 0' }}>
        {/* Draggable Sphere Area */}
        <div
          className="relative cursor-grab active:cursor-grabbing"
          style={{
            width: 'min(700px, 90vw)',
            height: 'min(700px, 90vw)',
            maxHeight: '60vh',
            maxWidth: '60vh',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={sphereContainerRef}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {sortedCircles.map(({ circle, pos }) => {
              // Calculate scale based on z position (closer = larger)
              const perspective = 1000;
              const scale = perspective / (perspective - pos.z);
              const size = 40 * scale;

              // Calculate opacity based on z position
              const opacity = 0.3 + (pos.z + 200) / 400 * 0.7;

              // Determine if this circle is near the center
              const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
              const isCenter = distanceFromCenter < 60 && pos.z > 120;

              return (
                <motion.div
                  key={circle.id}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    x: pos.x,
                    y: pos.y,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                  }}
                >
                  <motion.div
                    className="rounded-full overflow-hidden w-full h-full relative"
                    style={{
                      opacity: isCenter ? 1 : opacity * 0.9,
                      boxShadow: isCenter
                        ? '0 0 25px rgba(220, 180, 255, 0.4), 0 0 40px rgba(200, 150, 255, 0.25), inset 0 0 60px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.1)'
                        : '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.05)',
                      background: `radial-gradient(circle at 25% 25%, ${circle.color.light}, ${circle.color.dark} 70%, rgba(0, 0, 0, 0.9))`,
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                    animate={{
                      scale: isCenter ? 3 : 1,
                    }}
                    transition={
                      isCenter
                        ? {
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                          }
                        : {
                            type: 'spring',
                            stiffness: 100,
                            damping: 30,
                            duration: 0.8,
                          }
                    }
                  >
                    {/* Liquid glass shine effects */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 20%, transparent 50%)',
                      }}
                    />
                    {/* Secondary highlight for liquid effect */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 40%, transparent 60%, rgba(255, 255, 255, 0.1) 100%)',
                      }}
                    />
                    {/* Bottom reflection */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1/3 rounded-full pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at bottom, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
                      }}
                    />
                    {isCenter && (
                      <div
                        className="w-full h-full flex items-center justify-center pointer-events-none p-3 text-center relative z-10"
                        style={{
                          fontFamily: '"Cardo", serif',
                          color: '#D7D9DB',
                          fontWeight: 700,
                          fontSize: '5.25px',
                          textShadow: '0 0 8px rgba(255, 255, 255, 0.6), 0 0 15px rgba(255, 255, 255, 0.3)',
                          lineHeight: '1.3',
                        }}
                      >
                        {circle.phrase}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instructions and Button */}
      <div className="absolute bottom-2 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-4">
        <p className="text-white/60 text-center text-xs md:text-base">Drag to spin for your prediction.</p>
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className="px-3 md:px-5 py-1 md:py-1.5 rounded-full border border-white/20 transition-all duration-300 hover:bg-white/15 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          {isSpinning ? 'Spinning...' : 'Spin for me'}
        </button>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-0.5 md:bottom-1 left-1/2 -translate-x-1/2">
        <p className="text-white/40 italic text-center text-[8px] md:text-[10px]">A project by Liza Karimova.</p>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded z-20">
          {cameraError}
        </div>
      )}
    </div>
  );
}