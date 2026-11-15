import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, RefreshCw, ZoomIn, ZoomOut, Eye } from 'lucide-react';

interface VisitingCard3DCanvasProps {
  frontDataUrl?: string;
  backDataUrl?: string;
  frontSettings?: { x: number; y: number; scale: number; rotation: number };
  backSettings?: { x: number; y: number; scale: number; rotation: number };
  className?: string;
  initialView?: 'front' | 'back';
}

export const VisitingCard3DCanvas: React.FC<VisitingCard3DCanvasProps> = ({
  frontDataUrl,
  backDataUrl,
  frontSettings = { x: 0, y: 0, scale: 1, rotation: 0 },
  backSettings = { x: 0, y: 0, scale: 1, rotation: 0 },
  className = '',
  initialView = 'front',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [currentFace, setCurrentFace] = useState<'front' | 'back'>(initialView);
  const cardMeshRef = useRef<THREE.Mesh | null>(null);
  const targetRotationY = useRef<number>(initialView === 'back' ? Math.PI : 0);

  // Helper to draw a side onto an offscreen canvas for texture creation
  const createFaceTexture = (
    dataUrl?: string,
    settings = { x: 0, y: 0, scale: 1, rotation: 0 }
  ): Promise<THREE.CanvasTexture> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1087; // 92mm @ 300 DPI
      canvas.height = 614; // 52mm @ 300 DPI
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        const fallbackTex = new THREE.CanvasTexture(canvas);
        resolve(fallbackTex);
        return;
      }

      // Base: crisp white 300 GSM art paper
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle fine paper texture/grain
      ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
      for (let i = 0; i < canvas.width; i += 4) {
        for (let j = 0; j < canvas.height; j += 4) {
          if ((i + j) % 7 === 0) {
            ctx.fillRect(i, j, 1.5, 1.5);
          }
        }
      }

      if (!dataUrl) {
        // Draw elegant default visiting card watermark outline
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 3;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 28px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('300 GSM ART PAPER', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('92 × 52 MM · WHITE PAPER BASE', canvas.width / 2, canvas.height / 2 + 20);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        resolve(texture);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Apply positioning (x, y are percentage offsets from center)
        const offsetX = (settings.x / 100) * canvas.width;
        const offsetY = (settings.y / 100) * canvas.height;
        ctx.translate(offsetX, offsetY);

        // Apply rotation
        ctx.rotate((settings.rotation * Math.PI) / 180);

        // Calculate aspect-preserving dimensions with scale
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawW = canvas.width;
        let drawH = canvas.height;

        if (imgAspect > canvasAspect) {
          drawW = canvas.width * settings.scale;
          drawH = (canvas.width / imgAspect) * settings.scale;
        } else {
          drawH = canvas.height * settings.scale;
          drawW = (canvas.height * imgAspect) * settings.scale;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        resolve(texture);
      };
      img.onerror = () => {
        const texture = new THREE.CanvasTexture(canvas);
        resolve(texture);
      };
      img.src = dataUrl;
    });
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 340;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F8F8FA');

    // 2. Camera: dynamically adjusted for portrait vs landscape viewports
    const initialAsp = width / height;
    const camera = new THREE.PerspectiveCamera(42, initialAsp, 0.1, 1000);
    camera.position.set(0, 0, initialAsp < 0.9 ? 19.5 : (initialAsp < 1.2 ? 17.5 : 15));

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight1.position.set(5, 10, 8);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.bias = -0.0001;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xfff8ee, 0.8);
    dirLight2.position.set(-6, -4, 6);
    scene.add(dirLight2);

    // 5. Geometry & Materials for 300 GSM Card
    // Dimensions scaled proportionally to 92mm x 52mm: width=9.2, height=5.2, depth=0.04 (300 GSM)
    const cardGeo = new THREE.BoxGeometry(9.2, 5.2, 0.04);

    // White paper edge material (clean matte paper sides)
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Default placeholder materials
    const frontMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.02,
    });
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.02,
    });

    // Order of materials for BoxGeometry: [+X, -X, +Y, -Y, +Z (Front), -Z (Back)]
    const materials = [
      edgeMaterial, // Right edge
      edgeMaterial, // Left edge
      edgeMaterial, // Top edge
      edgeMaterial, // Bottom edge
      frontMaterial, // Front face (+Z)
      backMaterial, // Back face (-Z)
    ];

    const cardMesh = new THREE.Mesh(cardGeo, materials);
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    cardMesh.rotation.y = initialView === 'back' ? Math.PI : 0;
    scene.add(cardMesh);
    cardMeshRef.current = cardMesh;

    // Soft drop shadow floor plane
    const shadowGeo = new THREE.PlaneGeometry(16, 12);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.set(0, -3.2, 0);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Load asynchronous textures
    let isDisposed = false;
    Promise.all([
      createFaceTexture(frontDataUrl, frontSettings),
      createFaceTexture(backDataUrl, backSettings),
    ]).then(([frontTex, backTex]) => {
      if (isDisposed) {
        frontTex.dispose();
        backTex.dispose();
        return;
      }
      frontMaterial.map = frontTex;
      frontMaterial.needsUpdate = true;

      backMaterial.map = backTex;
      backMaterial.needsUpdate = true;
    });

    // Interaction handling (drag to rotate)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      setIsRotating(false);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !cardMesh) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      cardMesh.rotation.y += deltaX * 0.012;
      cardMesh.rotation.x = Math.max(-0.6, Math.min(0.6, cardMesh.rotation.x + deltaY * 0.012));
      targetRotationY.current = cardMesh.rotation.y;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    domEl.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        const asp = newW / newH;
        camera.aspect = asp;
        camera.position.z = asp < 0.9 ? 19.5 : (asp < 1.2 ? 17.5 : 15);
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (cardMesh) {
        // Auto slow spin if idle and user didn't lock
        if (isRotating && !isDragging) {
          cardMesh.rotation.y += 0.008;
          targetRotationY.current = cardMesh.rotation.y;
        } else if (!isDragging) {
          // Smooth interpolation towards target view
          cardMesh.rotation.y += (targetRotationY.current - cardMesh.rotation.y) * 0.1;
          cardMesh.rotation.x += (0 - cardMesh.rotation.x) * 0.1;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      domEl.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      domEl.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      cardGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, [frontDataUrl, backDataUrl, frontSettings, backSettings, isRotating, initialView]);

  const handleFlip = () => {
    setIsRotating(false);
    if (currentFace === 'front') {
      targetRotationY.current = Math.PI;
      setCurrentFace('back');
    } else {
      targetRotationY.current = 0;
      setCurrentFace('front');
    }
  };

  const handleResetAngle = () => {
    setIsRotating(false);
    targetRotationY.current = 0;
    setCurrentFace('front');
    if (cardMeshRef.current) {
      cardMeshRef.current.rotation.x = 0;
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF9FD] to-[#F0EFF5] border border-zinc-200 shadow-inner ${className}`}>
      {/* Three.js viewport mount */}
      <div ref={mountRef} className="w-full h-full min-h-[320px] cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Controls overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
        <span className="bg-zinc-900/85 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5 border border-white/10">
          <Eye className="w-3 h-3 text-[#FF7A00]" />
          <span>Interactive 3D Preview · 300 GSM</span>
        </span>
      </div>

      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={handleFlip}
          className="bg-white/95 hover:bg-white text-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200/90 shadow-sm backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="Flip visiting card to opposite side"
        >
          <RotateCw className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>Flip to {currentFace === 'front' ? 'Back' : 'Front'}</span>
        </button>

        <button
          onClick={() => setIsRotating((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            isRotating
              ? 'bg-[#FF7A00] text-white border-[#FF7A00]'
              : 'bg-white/95 hover:bg-white text-zinc-700 border-zinc-200/90'
          }`}
          title="Toggle automatic turntable rotation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
          <span>{isRotating ? 'Auto-Spin ON' : 'Auto-Spin OFF'}</span>
        </button>

        <button
          onClick={handleResetAngle}
          className="bg-white/95 hover:bg-white text-zinc-700 text-xs font-semibold p-2 rounded-lg border border-zinc-200/90 shadow-sm backdrop-blur-md transition-all cursor-pointer active:scale-95"
          title="Reset to Front View"
        >
          Reset
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10 text-[10px] font-mono text-zinc-400 bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded border border-zinc-200/60 pointer-events-none">
        Drag to inspect 360° · 92 × 52 MM
      </div>
    </div>
  );
};
