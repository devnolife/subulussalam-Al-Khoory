import Image from "next/image";
import type { ReactNode } from "react";

const covers = {
  portal: {
    frame: "min-h-[22rem] sm:min-h-[25rem] md:cover-spread lg:min-h-[29rem]",
    caption: "p-6 sm:p-9 lg:p-12",
    sizes: "(min-width: 1280px) 960px, (min-width: 768px) 80vw, 100vw",
  },
  login: {
    frame: "min-h-36 [--spread-fade:2.25rem] [--spread-width:63%] max-md:cover-spread sm:min-h-44 md:min-h-[28rem]",
    caption: "p-5 sm:p-8",
    sizes: "(min-width: 1152px) 520px, (min-width: 768px) 48vw, (min-width: 576px) 512px, 100vw",
  },
  dashboard: {
    frame: "cover-spread min-h-36 max-md:[--spread-fade:2.5rem] max-md:[--spread-width:69%] sm:min-h-40",
    caption: "p-4 sm:px-7 sm:py-5",
    sizes: "(min-width: 1536px) 960px, (min-width: 1024px) 60vw, (min-width: 768px) 580px, 100vw",
  },
};

export function MosqueCover({ variant, children }: { variant: keyof typeof covers; children: ReactNode }) {
  const { frame, caption, sizes } = covers[variant];
  const front = variant === "login";
  return (
    <div className={`relative isolate grid overflow-hidden bg-royal-700 ${frame}`}>
      <div className="mosque-cover-image">
        <Image
          src={front ? "/masjid/slide/gambar-masjid.jpg" : "/masjid/slide/masjid-subulussalam-al-khoory.jpg"}
          alt={front ? "Fasad dan menara masjid kampus" : "Kubah biru Masjid Subulussalam Al-Khoory di tengah kampus"}
          fill
          sizes={sizes}
          loading="eager"
          className="object-cover"
        />
      </div>
      <div className={`photo-caption ${caption}`}>{children}</div>
    </div>
  );
}
