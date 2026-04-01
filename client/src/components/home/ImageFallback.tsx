interface ImageFallbackProps {
  imageUrl?: string | null;
  alt: string;
  className?: string;
}

export function ImageFallback({ imageUrl, alt, className }: ImageFallbackProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={className} />;
  }

  return (
    <div
      aria-label={alt}
      className={`${className || ""} bg-gradient-to-br from-[#ff7948]/40 via-[#811cd9]/35 to-[#b50058]/35`}
    />
  );
}
