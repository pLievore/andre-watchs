/**
 * Mostrador desenhado em SVG — vocabulário visual da marca (SPEC §3.5) sem
 * depender de foto de estoque nem de imagem de maison (SPEC §13).
 *
 * Três variantes de acabamento, todas neutras: não reproduzem o mostrador de
 * nenhuma marca específica. Servem como painel gráfico em seções editoriais.
 */

export type DialVariant = "dive" | "chronograph" | "gmt";

interface DialPlateProps {
  variant?: DialVariant;
  /** Texto curto no lugar do logo — ex.: "904L", "DESDE 2012". */
  caption?: string;
  className?: string;
  /** Ângulo dos ponteiros em graus (hora, minuto). Padrão: pose 10h10. */
  hands?: readonly [number, number];
}

export function DialPlate({
  variant = "dive",
  caption,
  className = "",
  hands = [-60, 50],
}: DialPlateProps) {
  const accent = "var(--color-accent)";
  const deep = "var(--color-accent-deep)";
  const [hourDeg, minuteDeg] = hands;

  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      role="presentation"
    >
      <defs>
        <linearGradient id={`steel-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={deep} />
          <stop offset="48%" stopColor={accent} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <radialGradient id={`dial-${variant}`} cx="50%" cy="32%" r="72%">
          <stop offset="0%" stopColor="var(--color-surface)" />
          <stop offset="100%" stopColor="var(--color-background)" />
        </radialGradient>
      </defs>

      {/* Caixa */}
      <circle cx="100" cy="100" r="92" fill={`url(#steel-${variant})`} opacity="0.22" />
      <circle cx="100" cy="100" r="92" stroke={`url(#steel-${variant})`} strokeWidth="1.2" />

      {/* Bezel: no mergulhador, os 120 cliques viram traços de minuto */}
      {variant === "dive" &&
        Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="12"
            x2="100"
            y2={deg === 0 ? "26" : "20"}
            stroke={accent}
            strokeWidth={deg === 0 ? "2.4" : "1"}
            opacity={deg === 0 ? 1 : 0.55}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}

      {/* Mostrador */}
      <circle cx="100" cy="100" r="76" fill={`url(#dial-${variant})`} />
      <circle cx="100" cy="100" r="76" stroke={deep} strokeWidth="0.6" opacity="0.6" />

      {/* Índices */}
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
        const cardinal = deg % 90 === 0;
        return (
          <line
            key={deg}
            x1="100"
            y1="34"
            x2="100"
            y2={cardinal ? "48" : "42"}
            stroke={accent}
            strokeWidth={cardinal ? "3" : "1.4"}
            opacity={cardinal ? 0.95 : 0.5}
            transform={`rotate(${deg} 100 100)`}
          />
        );
      })}

      {/* Subdials do cronógrafo */}
      {variant === "chronograph" &&
        [
          [66, 100],
          [134, 100],
          [100, 134],
        ].map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="20"
            stroke={deep}
            strokeWidth="0.8"
            opacity="0.7"
          />
        ))}

      {/* Ponteiro de 24h do GMT */}
      {variant === "gmt" && (
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="46"
          stroke={accent}
          strokeWidth="1.6"
          opacity="0.6"
          transform="rotate(135 100 100)"
        />
      )}

      {/* Ponteiros */}
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="58"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${hourDeg} 100 100)`}
      />
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="40"
        stroke={accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        transform={`rotate(${minuteDeg} 100 100)`}
      />
      <circle cx="100" cy="100" r="3.4" fill={accent} />

      {caption && (
        <text
          x="100"
          y="140"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.3em",
            fill: "var(--color-muted)",
          }}
        >
          {caption}
        </text>
      )}
    </svg>
  );
}
