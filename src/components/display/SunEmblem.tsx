/** Lambang cadangan bila logo belum diunggah: bintang delapan dan kubah masjid. */
export function SunEmblem({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M50 5 61.5 22.3 81.8 18.2 77.7 38.5 95 50 77.7 61.5 81.8 81.8 61.5 77.7 50 95 38.5 77.7 18.2 81.8 22.3 61.5 5 50 22.3 38.5 18.2 18.2 38.5 22.3Z"
        strokeWidth="3.5"
      />
      <path d="M34 70V54c0-9 7-15.5 16-20 9 4.5 16 11 16 20v16M29 70h42M50 34v-8M44 70v-8a6 6 0 0 1 12 0v8" strokeWidth="3.5" />
    </svg>
  );
}
