import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";

const random = (seed: number) => {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
};

type CodeRow = {
  width: string;
  left: string;
};

type FieldCard = {
  x: number;
  y: number;
  r: number;
};

type NodeParticle = {
  x: number;
  y: number;
  size: number;
  delay: number;
};

export function EditorAssemblyLoader() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scanRef = useRef<HTMLDivElement | null>(null);

  const codeRowsRef = useRef<HTMLDivElement[]>([]);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const nodesRef = useRef<HTMLSpanElement[]>([]);

  const codeRows = useMemo<CodeRow[]>(
    () => [
      { width: "78%", left: "12%" },
      { width: "54%", left: "18%" },
      { width: "68%", left: "14%" },
      { width: "42%", left: "28%" },
      { width: "72%", left: "12%" },
      { width: "50%", left: "22%" },
      { width: "62%", left: "16%" },
      { width: "36%", left: "31%" },
    ],
    [],
  );

  const cards = useMemo<FieldCard[]>(
    () => [
      { x: -330, y: -160, r: -7 },
      { x: 320, y: -140, r: 6 },
      { x: -290, y: 135, r: 5 },
      { x: 310, y: 160, r: -5 },
      { x: -75, y: -245, r: 3 },
      { x: 92, y: 245, r: -4 },
    ],
    [],
  );

  const nodes = useMemo<NodeParticle[]>(
    () =>
      Array.from({ length: 38 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 38;
        const radius = 205 + (index % 7) * 22;

        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 3 + (index % 3),
          delay: index * 0.025 + random(index + 1) * 0.04,
        };
      }),
    [],
  );

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { scale: 0.965, opacity: 0.78 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.45,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );

      codeRowsRef.current.forEach((node, index) => {
        gsap.fromTo(
          node,
          { scaleX: 0.2, opacity: 0.26 },
          {
            scaleX: 1,
            opacity: index % 3 === 0 ? 0.88 : 0.64,
            duration: 0.72,
            delay: index * 0.075,
            repeat: -1,
            repeatDelay: 0.95,
            yoyo: true,
            ease: "power2.inOut",
            transformOrigin: "left center",
          },
        );
      });

      cardsRef.current.forEach((node, index) => {
        const card = cards[index];

        gsap.fromTo(
          node,
          {
            x: card.x,
            y: card.y,
            rotate: card.r,
            scale: 0.92,
            opacity: 0.18,
          },
          {
            x: card.x * 0.46,
            y: card.y * 0.42,
            rotate: 0,
            scale: 1,
            opacity: 0.74,
            duration: 1.2,
            delay: index * 0.11,
            repeat: -1,
            yoyo: true,
            repeatDelay: 0.18,
            ease: "power3.inOut",
          },
        );
      });

      nodesRef.current.forEach((node, index) => {
        const item = nodes[index];

        gsap.fromTo(
          node,
          {
            x: item.x,
            y: item.y,
            opacity: 0,
            scale: 0.6,
          },
          {
            x: item.x * 0.18,
            y: item.y * 0.18,
            opacity: 0.72,
            scale: 1.1,
            duration: 1.05,
            delay: item.delay,
            repeat: -1,
            yoyo: true,
            repeatDelay: 0.32,
            ease: "power2.inOut",
          },
        );
      });

      gsap.fromTo(
        scanRef.current,
        { yPercent: -120, opacity: 0 },
        {
          yPercent: 660,
          opacity: 0,
          duration: 1.55,
          repeat: -1,
          ease: "power1.inOut",
          keyframes: [
            { opacity: 0 },
            { opacity: 0.82, duration: 0.18 },
            { opacity: 0.82, duration: 0.9 },
            { opacity: 0 },
          ],
        },
      );
    }, rootRef);

    return () => ctx.revert();
  }, [cards, nodes]);

  return (
    <div
      ref={rootRef}
      className="relative flex size-full min-h-[460px] items-center justify-center overflow-hidden bg-[#F7F7F7] text-[#222222] dark:bg-[#050505] dark:text-white"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,34,34,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,34,34,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-70 [mask-image:radial-gradient(circle_at_center,black_0_54%,transparent_82%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,56,92,0.10)_0%,rgba(247,247,247,0.3)_42%,rgba(247,247,247,1)_88%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,56,92,0.14)_0%,rgba(0,0,0,0.18)_44%,rgba(5,5,5,1)_88%)]" />

      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {nodes.map((node, index) => (
          <span
            key={index}
            ref={(element) => {
              if (element) {
                nodesRef.current[index] = element;
              }
            }}
            className="absolute rounded-full bg-[#FF385C] shadow-[0_0_14px_rgba(255,56,92,0.35)] dark:shadow-[0_0_18px_rgba(255,56,92,0.55)]"
            style={{
              width: `${node.size}px`,
              height: `${node.size}px`,
              left: `${-node.size / 2}px`,
              top: `${-node.size / 2}px`,
            }}
          />
        ))}
      </div>

      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {cards.map((_, index) => (
          <div
            key={index}
            ref={(element) => {
              if (element) {
                cardsRef.current[index] = element;
              }
            }}
            className="absolute -left-16 -top-8 h-16 w-32 border border-neutral-200 bg-white/76 p-3 shadow-[0_12px_36px_rgba(34,34,34,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/58 dark:shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-3 h-1.5 w-10 bg-[#FF385C]" />
            <div className="h-1.5 w-20 bg-neutral-300 dark:bg-neutral-700" />
            <div className="mt-2 h-1.5 w-14 bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>

      <div
        ref={panelRef}
        className="relative z-10 h-[300px] w-[440px] max-w-[82vw] overflow-hidden border border-neutral-200 bg-white/88 shadow-[0_24px_80px_rgba(34,34,34,0.13)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/84 dark:shadow-[0_26px_86px_rgba(0,0,0,0.64)]"
      >
        <div className="flex h-10 items-center border-b border-neutral-200 px-4 dark:border-white/10">
          <span className="h-2 w-2 bg-[#FF385C]" />
          <span className="ml-2 h-2 w-2 bg-[#FC642D]" />
          <span className="ml-2 h-2 w-2 bg-[#00A699]" />
          <span className="ml-4 h-1.5 w-24 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="relative h-[260px] px-8 py-7">
          <div
            ref={scanRef}
            className="absolute left-0 top-0 h-12 w-full bg-gradient-to-b from-transparent via-[#FF385C]/18 to-transparent dark:via-[#FF385C]/24"
          />

          {codeRows.map((row, index) => (
            <div
              key={index}
              ref={(element) => {
                if (element) {
                  codeRowsRef.current[index] = element;
                }
              }}
              className={`mb-5 h-2 origin-left ${
                index % 4 === 0 ? "bg-[#FF385C]/80" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
              style={{
                width: row.width,
                marginLeft: row.left,
              }}
            />
          ))}

          <div className="absolute bottom-6 left-8 right-8 grid grid-cols-3 gap-3">
            <span className="h-8 border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-neutral-900" />
            <span className="h-8 border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-neutral-900" />
            <span className="h-8 border border-[#FF385C]/30 bg-[#FF385C]/10 dark:border-[#FF385C]/40 dark:bg-[#FF385C]/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
