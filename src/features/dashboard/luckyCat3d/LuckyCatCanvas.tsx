import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { buildLuckyCat, type LuckyCatRig } from "./catModel";
import { CAT_SIZE } from "./constants";

/* LuckyCatCanvas — the 3D waving lucky cat (Three.js, lazy chunk).
 *
 * The model is built from primitives in catModel.ts (no model files).
 * Animation: the signature beckoning paw (faster while speaking),
 * blinking, breathing, head following the cursor, and a lean into
 * page scroll. No roaming — the cat stays bottom-right, fixed.
 * Respects prefers-reduced-motion and pauses in background tabs. */

export interface LuckyCatCanvasApi {
  pause: () => void;
  resume: () => void;
}

interface LuckyCatCanvasProps {
  speaking: boolean;
}

const LuckyCatCanvas = forwardRef<LuckyCatCanvasApi, LuckyCatCanvasProps>(
  function LuckyCatCanvas({ speaking }, ref) {
    const mountRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<LuckyCatCanvasApi | null>(null);
    const speakingRef = useRef(speaking);
    speakingRef.current = speaking;

    useImperativeHandle(
      ref,
      () => ({
        pause: () => apiRef.current?.pause(),
        resume: () => apiRef.current?.resume(),
      }),
      []
    );

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // ---------- three.js setup ----------
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(CAT_SIZE, CAT_SIZE, false);
      renderer.domElement.style.cursor = "pointer";
      renderer.domElement.style.touchAction = "manipulation";
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 1.0, 5.0);
      camera.lookAt(0, 0.85, 0);

      scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7a6c, 1.15));
      const key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(3, 5, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffe8d0, 0.5);
      fill.position.set(-4, 2, 3);
      scene.add(fill);

      const rig: LuckyCatRig = buildLuckyCat();
      scene.add(rig.group);

      const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 3 };

      const st = {
        t: 0,
        last: performance.now(),
        running: true,
        raf: 0,
        blinkAt: 2.2,
        blinkT: 0,
        headYaw: 0,
        headPitch: 0,
        lean: 0,
        scrollVel: 0,
        lastScrollY: window.scrollY,
        wavePhase: 0,
      };

      // ---------- animation loop ----------
      const loop = (now: number) => {
        if (!st.running) return;
        st.raf = requestAnimationFrame(loop);
        const dt = Math.min((now - st.last) / 1000, 0.05);
        st.last = now;
        st.t += dt;
        const t = st.t;
        const talking = speakingRef.current;

        // blink
        let eyeY = 1;
        if (st.blinkT > 0) {
          st.blinkT -= dt;
          eyeY = Math.max(0.08, Math.abs(st.blinkT / 0.12));
        } else if (t > st.blinkAt) {
          st.blinkT = 0.12;
          st.blinkAt = t + 2 + Math.random() * 3;
        }
        rig.eyeL.scale.y = eyeY;
        rig.eyeR.scale.y = eyeY;

        // head follows the cursor (gentle)
        const tYaw = reduced
          ? Math.sin(t * 0.4) * 0.08
          : THREE.MathUtils.clamp((mouse.x - window.innerWidth + 100) * 0.0011, -0.35, 0.35);
        const tPitch = reduced
          ? 0
          : THREE.MathUtils.clamp((mouse.y - window.innerHeight + 100) * 0.0009, -0.2, 0.25);
        const hk = Math.min(1, dt * 5);
        st.headYaw += (tYaw - st.headYaw) * hk;
        st.headPitch += (tPitch - st.headPitch) * hk;
        rig.head.rotation.y = st.headYaw;
        rig.head.rotation.x = st.headPitch;

        // breathing
        rig.body.scale.y = 0.95 + Math.sin(t * 2.2) * 0.012;
        rig.head.position.y = 1.02 + Math.sin(t * 2.2) * 0.008;

        // the signature beckoning wave — faster and bigger while speaking
        const waveSpeed = reduced ? 1.2 : talking ? 5.4 : 3.2;
        const waveAmp = reduced ? 0.07 : talking ? 0.38 : 0.27;
        st.wavePhase += dt * waveSpeed;
        rig.waveArm.rotation.x = -0.12 + Math.sin(st.wavePhase) * waveAmp;
        rig.waveArm.rotation.z = Math.sin(st.wavePhase * 0.5) * 0.07;
        // the bell swings with a slight lag behind the paw
        rig.bell.rotation.x = Math.sin(st.wavePhase - 0.7) * (reduced ? 0.03 : 0.16);
        // happy little bounce while talking
        rig.group.position.y = talking && !reduced ? Math.abs(Math.sin(t * 5.4)) * 0.035 : 0;

        // lean into page scroll
        st.scrollVel *= Math.pow(0.02, dt);
        const leanT = reduced ? 0 : THREE.MathUtils.clamp(-st.scrollVel * 0.0016, -0.18, 0.18);
        st.lean += (leanT - st.lean) * Math.min(1, dt * 8);
        rig.group.rotation.z = st.lean;

        renderer.render(scene, camera);
      };

      const pause = () => {
        st.running = false;
        cancelAnimationFrame(st.raf);
      };
      const resume = () => {
        if (st.running) return;
        st.running = true;
        st.last = performance.now();
        st.raf = requestAnimationFrame(loop);
      };
      apiRef.current = { pause, resume };

      // ---------- events ----------
      const onMove = (e: PointerEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      };
      const onScroll = () => {
        const y = window.scrollY;
        st.scrollVel = y - st.lastScrollY;
        st.lastScrollY = y;
      };
      const onVis = () => {
        if (document.hidden) pause();
        else resume();
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVis);

      st.raf = requestAnimationFrame(loop);

      return () => {
        pause();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVis);
        rig.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const m = mesh.material as THREE.Material | THREE.Material[];
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else if (m) m.dispose();
        });
        scene.clear();
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
        apiRef.current = null;
      };
    }, []);

    return <div ref={mountRef} className="lucky-cat-mount" style={{ width: CAT_SIZE, height: CAT_SIZE }} />;
  }
);

export default LuckyCatCanvas;
