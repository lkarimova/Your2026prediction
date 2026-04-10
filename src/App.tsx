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
  const [rotation, setRotation] = useState({ x: Math.PI / 3, y: Math.PI / 4 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: Math.PI / 3, y: Math.PI / 4 });
  const lastDragTime = useRef(0);
  const lastDragPos = useRef({ x: 0, y: 0 });
  const dragVelocity = useRef({ x: 0, y: 0 });
  const hasExceededDragThreshold = useRef(false);
  const dragThreshold = 8;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sphereContainerRef = useRef<HTMLDivElement>(null);
  const lastShakeTime = useRef(0);
  const lastSampleTime = useRef(0);

  const SHAKE_CONFIG = {
    threshold: 15,
    cooldown: 1000,
    sampleRate: 100,
    requireAllAxes: false,
    enableInBackground: false,
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(mobile);

      if (mobile && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        setNeedsIOSPermission(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    { light: 'rgba(75, 60, 120, 0.8)', dark: 'rgba(25, 20, 45, 1)' },
    { light: 'rgba(40, 70, 130, 0.8)', dark: 'rgba(15, 25, 50, 1)' },
    { light: 'rgba(120, 45, 80, 0.8)', dark: 'rgba(45, 15, 35, 1)' },
    { light: 'rgba(30, 90, 60, 0.8)', dark: 'rgba(10, 35, 25, 1)' },
    { light: 'rgba(130, 75, 40, 0.8)', dark: 'rgba(50, 25, 15, 1)' },
    { light: 'rgba(90, 50, 110, 0.8)', dark: 'rgba(35, 20, 45, 1)' },
    { light: 'rgba(30, 80, 110, 0.8)', dark: 'rgba(10, 30, 45, 1)' },
    { light: 'rgba(110, 40, 55, 0.8)', dark: 'rgba(45, 15, 25, 1)' },
    { light: 'rgba(35, 95, 80, 0.8)', dark: 'rgba(15, 40, 35, 1)' },
    { light: 'rgba(100, 85, 25, 0.8)', dark: 'rgba(40, 35, 10, 1)' },
    { light: 'rgba(70, 35, 100, 0.8)', dark: 'rgba(30, 15, 45, 1)' },
    { light: 'rgba(55, 55, 110, 0.8)', dark: 'rgba(20, 20, 45, 1)' },
    { light: 'rgba(105, 40, 40, 0.8)', dark: 'rgba(45, 15, 15, 1)' },
    { light: 'rgba(25, 85, 95, 0.8)', dark: 'rgba(10, 35, 40, 1)' },
    { light: 'rgba(75, 100, 35, 0.8)', dark: 'rgba(30, 40, 15, 1)' },
    { light: 'rgba(95, 40, 105, 0.8)', dark: 'rgba(40, 15, 45, 1)' },
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
      color: colors[i],
    });
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpinning) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    setIsDragging(false);
    hasExceededDragThreshold.current = false;

    dragStart.current = { x: e.clientX, y: e.clientY };
    lastDragTime.current = Date.now();
    lastDragPos.current = { x: e.clientX, y: e.clientY };
    dragVelocity.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpinning) return;

    const totalDeltaX = e.clientX - dragStart.current.x;
    const totalDeltaY = e.clientY - dragStart.current.y;
    const movedDistance = Math.sqrt(totalDeltaX ** 2 + totalDeltaY ** 2);

    if (!hasExceededDragThreshold.current) {
      if (movedDistance < dragThreshold) return;
      hasExceededDragThreshold.current = true;
      setIsDragging(true);
    }

    const deltaX = e.clientX - lastDragPos.current.x;
    const deltaY = e.clientY - lastDragPos.current.y;

    const rotationSpeed = 0.005;

    const newRotation = {
      x: currentRotation.current.x - deltaY * rotationSpeed,
      y: currentRotation.current.y + deltaX * rotationSpeed,
    };

    setRotation(newRotation);
    currentRotation.current = newRotation;

    const currentTime = Date.now();
    const timeDelta = currentTime - lastDragTime.current;

    if (timeDelta > 0) {
      dragVelocity.current = {
        x: deltaX / timeDelta,
        y: deltaY / timeDelta,
      };
    }

    lastDragTime.current = currentTime;
    lastDragPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    setIsDragging(false);
    hasExceededDragThreshold.current = false;
    dragVelocity.current = { x: 0, y: 0 };
  };

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);

    const randomCircle = circles[Math.floor(Math.random() * circles.length)];

    const targetY = -randomCircle.theta + currentRotation.current.y + Math.PI * 4;
    const targetX = -randomCircle.phi + Math.PI / 2;

    const startRotation = { ...currentRotation.current };
    const startTime = Date.now();
    const duration = 2500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
      setCameraError(null);
    }
    setIsCameraOn(!isCameraOn);
  };

  useEffect(() => {
    if (cameraError) {
      const timer = setTimeout(() => {
        setCameraError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cameraError]);

  useEffect(() => {
    if (!shakeEnabled || !isMobile) return;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (SHAKE_CONFIG.enableInBackground === false && document.hidden) return;
      if (isSpinning) return;

      const currentTime = Date.now();
      const timeDelta = currentTime - lastSampleTime.current;

      if (timeDelta < SHAKE_CONFIG.sampleRate) return;

      const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };

      if (x === null || y === null || z === null) return;

      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > SHAKE_CONFIG.threshold) {
        const shakeTimeDelta = currentTime - lastShakeTime.current;

        if (shakeTimeDelta > SHAKE_CONFIG.cooldown) {
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }

          handleSpin();
          lastShakeTime.current = currentTime;
        }
      }

      lastSampleTime.current = currentTime;
    };

    window.addEventListener('devicemotion', handleDeviceMotion);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [shakeEnabled, isMobile, isSpinning]);

  const enableShake = async () => {
    if (needsIOSPermission) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setShakeEnabled(true);
        } else {
          setCameraError('Motion sensor permission denied. Please allow in Settings.');
        }
      } catch (error) {
        setCameraError('Failed to request motion sensor permission.');
      }
    } else {
      setShakeEnabled(true);
    }
  };

  const getCirclePosition = (circle: Circle) => {
    const radius = 250;

    const rotatedPhi = circle.phi;
    const rotatedTheta = circle.theta + rotation.y;

    let x = radius * Math.sin(rotatedPhi) * Math.cos(rotatedTheta);
    let y = radius * Math.sin(rotatedPhi) * Math.sin(rotatedTheta);
    let z = radius * Math.cos(rotatedPhi);

    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const y2 = y * cosX - z * sinX;
    const z2 = y * sinX + z * cosX;

    return { x, y: y2, z: z2 };
  };

  const sortedCircles = [...circles]
    .map((circle) => {
      const pos = getCirclePosition(circle);
      return { circle, pos };
    })
    .sort((a, b) => a.pos.z - b.pos.z);

  return (
    <div
      className="w-screen h-screen overflow-hidden select-none relative"
      style={{ backgroundColor: '#00001E', position: 'fixed', inset: 0 }}
    >
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

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255, 255, 255, 0.03) 70%, rgba(255, 255, 255, 0.08) 100%)',
        }}
      />

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

      {!isMobile && (
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
      )}

      <div className="w-full h-full flex items-center justify-center" style={{ padding: 'clamp(60px, 15vh, 100px) 0' }}>
        <div
          className={isMobile ? 'relative cursor-pointer' : 'relative cursor-grab active:cursor-grabbing'}
          style={{
            width: 'min(700px, 90vw)',
            height: 'min(700px, 90vw)',
            maxHeight: '60vh',
            maxWidth: '60vh',
            touchAction: 'none',
            overscrollBehavior: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          ref={sphereContainerRef}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {sortedCircles.map(({ circle, pos }) => {
              const perspective = 1000;
              const scale = perspective / (perspective - pos.z);
              const size = 40 * scale;

              const opacity = 0.3 + ((pos.z + 200) / 400) * 0.7;
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
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 20%, transparent 50%)',
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 40%, transparent 60%, rgba(255, 255, 255, 0.1) 100%)',
                      }}
                    />
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

      <div className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-4 ${isMobile ? 'bottom-12' : 'bottom-2 md:bottom-8'}`}>
        {!isMobile && (
          <p className="text-white/60 text-center text-xs md:text-base">
            Drag to explore.
          </p>
        )}

        {isMobile && (
          <p className="text-white/60 text-center text-xs">
            Drag to explore.
          </p>
        )}

        {isMobile && !shakeEnabled && (
          <button
            onClick={enableShake}
            className="px-3 py-1 rounded-full border border-white/20 transition-all duration-300 hover:bg-white/15 hover:border-white/30 backdrop-blur-sm text-xs"
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Enable Shake to Spin
          </button>
        )}

        {isMobile && shakeEnabled && (
          <p className="text-white/40 text-center text-xs">
            Shake your phone to spin
          </p>
        )}

        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className="px-3 md:px-5 py-1 md:py-1.5 rounded-full border border-white/20 transition-all duration-300 hover:bg-white/15 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          {isSpinning ? 'Spinning...' : (isMobile ? 'Get Prediction' : 'Spin for me')}
        </button>

        {isMobile && (
          <button
            onClick={toggleCamera}
            className="px-3 py-1 rounded-full border border-white/20 transition-all duration-300 hover:bg-white/15 hover:border-white/30 backdrop-blur-sm text-xs"
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            {isCameraOn ? 'Camera Off' : 'Camera On'}
          </button>
        )}
      </div>

      <div className="absolute bottom-0.5 md:bottom-1 left-1/2 -translate-x-1/2">
        <p className="text-white/40 italic text-center text-[8px] md:text-[10px]">A project by Liza Karimova.</p>
      </div>

      {cameraError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded z-20">
          {cameraError}
        </div>
      )}
    </div>
  );
}