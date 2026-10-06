import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface Props {
  /** Inicio del evento (ISO con desfase de Madrid). */
  inicio: string;
  /** Fin del evento (ISO): hasta entonces se muestra "en marcha". */
  fin: string;
  /** Sin horario confirmado la cuenta va por días (no hay hora a la que contar). */
  conHora: boolean;
  /** Instante del render en el servidor: el primer pintado coincide al hidratar. */
  ahoraServidor: number;
  compacta?: boolean;
}

const DIA = 86_400_000;

function partes(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}

export default function CuentaAtras({ inicio, fin, conHora, ahoraServidor, compacta = false }: Props) {
  const [ahora, setAhora] = useState(ahoraServidor);
  const tInicio = new Date(inicio).getTime();
  const tFin = new Date(fin).getTime();

  useEffect(() => {
    setAhora(Date.now());
    // Con horas: cada segundo. Por días basta con revisar cada minuto.
    const id = window.setInterval(() => setAhora(Date.now()), conHora ? 1000 : 60_000);
    return () => window.clearInterval(id);
  }, [conHora]);

  const etiqueta =
    "inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-accent";

  if (ahora >= tFin) return null;

  if (ahora >= tInicio) {
    return (
      <p className={`${etiqueta} lio-pulso`} role="status">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        ¡Hoy hay Lío!
      </p>
    );
  }

  const restante = tInicio - ahora;

  if (!conHora) {
    const dias = Math.ceil(restante / DIA);
    const texto = dias <= 1 ? "¡Es mañana!" : `Faltan ${dias} días`;
    return (
      <p className={etiqueta} role="timer" aria-live="off">
        <Timer size={12} strokeWidth={2} aria-hidden="true" />
        {texto}
      </p>
    );
  }

  const { dias, horas, minutos, segundos } = partes(restante);
  const bloques = [
    { valor: dias, nombre: "días" },
    { valor: horas, nombre: "horas" },
    { valor: minutos, nombre: "min" },
    { valor: segundos, nombre: "seg" },
  ];
  const resumen = `Faltan ${dias} días, ${horas} horas y ${minutos} minutos`;

  return (
    <div role="timer" aria-label={resumen}>
      {!compacta && (
        <p className={`${etiqueta} mb-3`}>
          <Timer size={12} strokeWidth={2} aria-hidden="true" />
          Cuenta atrás
        </p>
      )}
      <ol className="flex gap-2" aria-hidden="true">
        {bloques.map((b) => (
          <li
            key={b.nombre}
            className={`flex flex-col items-center border border-border bg-bg2 ${compacta ? "min-w-11 px-2 py-1.5" : "min-w-16 px-3 py-2.5"}`}
          >
            <span className={`font-display leading-none text-text tabular-nums ${compacta ? "text-xl" : "text-3xl"}`}>
              {String(b.valor).padStart(2, "0")}
            </span>
            <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted">{b.nombre}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
