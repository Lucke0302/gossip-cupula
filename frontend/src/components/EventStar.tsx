/**
 * A estrelinha fixada num dia.
 *
 * O formato vem do `clip-path` do canvas — uma estrela de cinco pontas
 * desenhada em porcentagens. O pontinho claro no meio é o alfinete que
 * prende a estrela no papel, e a sombra é o que faz ela parecer colada
 * por cima da folha em vez de impressa nela.
 */
const PONTAS =
  'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';

export function EventStar({
  color,
  size = 34,
  rotation = 0,
  className = '',
}: {
  color: string;
  size?: number;
  rotation?: number;
  className?: string;
}) {
  const alfinete = Math.round(size * 0.18);

  return (
    <span
      aria-hidden="true"
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(1px 2px 1.5px rgba(0,0,0,.35))',
      }}
    >
      <span
        className="block h-full w-full"
        style={{ background: color, clipPath: PONTAS }}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: alfinete,
          height: alfinete,
          left: '50%',
          top: '45%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle at 35% 35%, #fff, #bbb 60%, #777)',
        }}
      />
    </span>
  );
}
