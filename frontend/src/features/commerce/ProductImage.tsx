import { useState } from "react";

export function ProductImage({
  urls,
  name,
  className = "h-full w-full object-cover",
}: {
  urls: string[];
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const source = urls[0];
  if (!source || failed)
    return (
      <div
        role="img"
        aria-label={`${name} image unavailable`}
        className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-50 to-slate-100 text-sm font-bold text-slate-400"
      >
        ITMART PRODUCT
      </div>
    );
  return (
    <img
      src={source}
      alt={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
