import { SunEmblem } from "@/components/display/SunEmblem";

export function MosqueMark({ logo, className }: { logo: string | null; className: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center overflow-hidden ${logo ? "bg-white" : "bg-royal-600 text-white"} ${className}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Logo juga dapat berasal dari unggahan pengurus.
        <img src={logo} alt="" className="size-full object-contain" />
      ) : (
        <SunEmblem className="size-full" />
      )}
    </span>
  );
}
