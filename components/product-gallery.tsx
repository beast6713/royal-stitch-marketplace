"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomImage } from "@/components/ZoomImage";

export function ProductGallery({
  images,
  alt
}: {
  images: string[];
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <div className="relative h-full w-full overflow-hidden lg:rounded-[32px] shadow-royal">
        <ZoomImage
          src={images[activeIndex]}
          alt={alt}
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                activeIndex === index ? "border-gold" : "border-transparent hover:border-royal/30"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
