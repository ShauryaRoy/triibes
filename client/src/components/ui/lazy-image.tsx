import React from 'react';

type LazyImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
};

export function LazyImage({ loading = 'lazy', decoding = 'async', ...props }: LazyImageProps) {
  return <img loading={loading} decoding={decoding} {...props} />;
}

export default LazyImage;
