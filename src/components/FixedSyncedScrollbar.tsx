import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FixedSyncedScrollbarProps = {
  targetRef: React.RefObject<HTMLElement>;
  /** String/valor para forçar re-medidas quando conteúdo/colunas mudam */
  watch?: unknown;
  /** Distância do rodapé do viewport */
  bottom?: number;
  /** Altura da barra (px) */
  height?: number;
  className?: string;
};

function rafThrottle(fn: () => void) {
  let raf = 0;
  return () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      fn();
    });
  };
}

export function FixedSyncedScrollbar({
  targetRef,
  watch,
  bottom = 0,
  height = 16,
  className,
}: FixedSyncedScrollbarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const target = targetRef.current;
    const bar = barRef.current;
    const content = contentRef.current;
    if (!target || !bar || !content) return;

    const update = () => {
      const rect = target.getBoundingClientRect();
      const hasOverflow = target.scrollWidth - target.clientWidth > 1;

      bar.style.display = hasOverflow ? "block" : "none";
      if (!hasOverflow) return;

      const left = Math.max(0, rect.left);
      const width = Math.max(0, rect.width);

      bar.style.left = `${left}px`;
      bar.style.width = `${width}px`;
      bar.style.bottom = `${bottom}px`;
      content.style.width = `${target.scrollWidth}px`;

      if (!syncing.current) {
        syncing.current = true;
        bar.scrollLeft = target.scrollLeft;
        syncing.current = false;
      }
    };

    const scheduleUpdate = rafThrottle(update);

    const onTargetScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      bar.scrollLeft = target.scrollLeft;
      syncing.current = false;
    };

    const onBarScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      target.scrollLeft = bar.scrollLeft;
      syncing.current = false;
    };

    // Primeira medida
    update();

    target.addEventListener("scroll", onTargetScroll, { passive: true });
    bar.addEventListener("scroll", onBarScroll, { passive: true });

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(target);
    if (target.firstElementChild) ro.observe(target.firstElementChild);

    window.addEventListener("resize", scheduleUpdate, { passive: true });
    // Se a página rola (fora do wrapper), o rect muda
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleUpdate);
    vv?.addEventListener("scroll", scheduleUpdate);

    return () => {
      target.removeEventListener("scroll", onTargetScroll);
      bar.removeEventListener("scroll", onBarScroll);
      ro.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
      vv?.removeEventListener("resize", scheduleUpdate);
      vv?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [mounted, targetRef, watch, bottom]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={barRef}
      aria-hidden="true"
      className={cn(
        "fixed z-[9999] overflow-x-auto border-t border-border bg-background shadow-md",
        className,
      )}
      style={{ display: "none", height }}
    >
      <div ref={contentRef} style={{ height: 1, width: 1 }} />
    </div>,
    document.body,
  );
}
