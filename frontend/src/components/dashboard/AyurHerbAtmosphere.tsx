import fieldImage from "../../assets/field.jpeg";

const VIEW_W = 1600;
const VIEW_H = 900;
const LINE_COUNT = 15;
const STEP = 40;
const INDEX_EVERY = 5;

const waveY = (line: number, x: number) => {
  const base = 90 + line * 50;
  const primary = 26 * Math.sin(x / (230 + line * 11) + line * 0.75);
  const secondary = 11 * Math.sin(x / (95 + line * 4) + line * 1.9);
  return base + primary + secondary;
};

const buildPath = (line: number) => {
  const points: Array<[number, number]> = [];
  for (let x = -STEP; x <= VIEW_W + STEP; x += STEP) {
    points.push([x, waveY(line, x)]);
  }

  let d = `M${points[0][0]},${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i][0] + points[i + 1][0]) / 2;
    const midY = (points[i][1] + points[i + 1][1]) / 2;
    d += ` Q${points[i][0]},${points[i][1].toFixed(1)} ${midX},${midY.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  return `${d} L${last[0]},${last[1].toFixed(1)}`;
};

const CONTOURS = Array.from({ length: LINE_COUNT }, (_, line) => ({
  d: buildPath(line),
  isIndex: line % INDEX_EVERY === 0,
}));

const PINS = [
  { line: 4, x: 1180 },
  { line: 8, x: 420 },
  { line: 11, x: 900 },
].map(({ line, x }) => ({ x, y: waveY(line, x) }));

export default function AyurHerbAtmosphere() {
  return (
    <div className="ayurherb-atmosphere" aria-hidden="true">
      <div
        className="ayurherb-field-image"
        style={{ backgroundImage: `url(${fieldImage})` }}
      />

      <div className="ayurherb-field-fade" />
      <div className="ayurherb-first-light" />

      <svg
        className="ayurherb-contours"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {CONTOURS.map((contour, index) => (
          <path
            key={index}
            d={contour.d}
            className={
              contour.isIndex
                ? "ayurherb-contour ayurherb-contour-index"
                : "ayurherb-contour"
            }
          />
        ))}

        {PINS.map((pin) => (
          <g
            key={`${pin.x}-${pin.y}`}
            className="ayurherb-pin"
            transform={`translate(${pin.x} ${pin.y.toFixed(1)})`}
          >
            <circle r="14" className="ayurherb-pin-ring" />
            <circle r="3.5" className="ayurherb-pin-core" />
          </g>
        ))}
      </svg>

      <div className="ayurherb-grain" />
    </div>
  );
}