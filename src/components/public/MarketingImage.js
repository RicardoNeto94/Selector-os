// Responsive files avoid a runtime image transformation on first visit.
const dimensions = {
  arrival: [1600, 900], sommelier: [1122, 1402], evening: [1535, 1024],
  "room-experience": [1600, 900], "wine-experience": [1600, 900],
  "wine-workspace": [1600, 842], "stock-control": [1600, 842], "venue-inventory": [1600, 842],
};
export default function MarketingImage({ name, alt, priority = false, sizes = "(max-width: 700px) 100vw, 60vw", ...props }) {
  const [width, height] = dimensions[name] || [1600, 900];
  return <img width={width} height={height} {...props} src={`/marketing/${name}.webp`} srcSet={`/marketing/${name}-small.webp 800w, /marketing/${name}.webp ${width}w`} sizes={sizes} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />;
}
