/** Ícones SVG (não emoji). viewBox 24x24, currentColor. */

type IconProps = { className?: string };

function Svg({
  className,
  fill = "none",
  children,
}: IconProps & { fill?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill={fill} className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

/** Ícone de traço único. 1.8 é o peso padrão; 2.2 marca ação (check, +, −, seta). */
function stroke(d: string, width = 1.8) {
  return function StrokeIcon({ className }: IconProps) {
    return (
      <Svg className={className}>
        <path
          d={d}
          stroke="currentColor"
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  };
}

/* ── Navegação e estrutura ─────────────────────────────────────────────── */

export const DumbbellIcon = stroke("M6.5 6.5v11M3 9v6M17.5 6.5v11M21 9v6M6.5 12h11");
export const HistoryIcon = stroke("M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 2.6-6.1M6 4v3h3");
export const ChartIcon = stroke("M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6M20 16v-2");
export const HomeIcon = stroke("M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5");
export const ChevronDownIcon = stroke("M6 9l6 6 6-6");
export const ChevronRightIcon = stroke("M9 6l6 6-6 6");
export const ChevronLeftIcon = stroke("M15 6l-6 6 6 6");

export function CogIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1l-2.1 2.1M7.2 16.8l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ── Treino ────────────────────────────────────────────────────────────── */

export const CheckIcon = stroke("M5 12.5l4.5 4.5L19 7", 2.2);
export const PlusIcon = stroke("M12 5v14M5 12h14", 2.2);
export const MinusIcon = stroke("M5 12h14", 2.2);
export const ArrowUpIcon = stroke("M12 19V5M6 11l6-6 6 6", 2.2);
export const OfflineIcon = stroke(
  "M3 3l18 18M8.5 16.5a4 4 0 0 1 .9-7.4M12 5a7 7 0 0 1 6.9 5.8A3.5 3.5 0 0 1 18 17.5h-6"
);
export const ResumeIcon = stroke("M3 12a9 9 0 1 0 2.6-6.3M3 4v5h5M12 8v4.5l3 1.8");
export const TimerIcon = stroke("M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 10v4l2.5 1.5M9 2h6");
export const TrophyIcon = stroke(
  "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"
);
export const MedalIcon = stroke("M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.5 14 7 22l5-3 5 3-1.5-8");
export const TrashIcon = stroke(
  "M4 7h16M9 7V4.5h6V7M6.5 7l.9 12a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8l.9-12M10 11v6M14 11v6"
);

export function PlayIcon({ className }: IconProps) {
  return (
    <Svg className={className} fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </Svg>
  );
}

/* ── Ícones líderes das linhas de Ajustes ─────────────────────────────── */

export const UserIcon = stroke("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0");
export const TargetIcon = stroke(
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12h.01"
);
export const SlidersIcon = stroke("M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5");
/** Estilo visual (Ajustes → Aparência). */
export const MonitorIcon = stroke("M3.5 5h17v11h-17zM8 20h8M12 16v4");
/** Scanlines do tema tático. */
export const ScanlinesIcon = stroke("M4 7h16M4 11h16M4 15h16M4 19h16");
export const SparkleIcon = stroke(
  "M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5ZM18.5 16.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z"
);
export const FlagIcon = stroke("M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11");
export const LockIcon = stroke("M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3");
export const UnlockIcon = stroke("M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.6-1.6");
export const ListIcon = stroke(
  "M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"
);
export const BellIcon = stroke(
  "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2 2 0 0 0 4 0"
);
export const DownloadIcon = stroke("M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14");
export const UploadIcon = stroke("M12 16V5M7.5 9L12 4.5 16.5 9M5 20h14");
export const DeviceIcon = stroke(
  "M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5ZM11 17.5h2"
);
export const CopyIcon = stroke(
  "M9 9h9.5A1.5 1.5 0 0 1 20 10.5V19.5A1.5 1.5 0 0 1 18.5 21h-9A1.5 1.5 0 0 1 8 19.5V10a1 1 0 0 1 1-1ZM16 9V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"
);
export const PasteIcon = stroke(
  "M9 4.5h6M9 4.5a1 1 0 0 0-1 1V6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-.5a1 1 0 0 0-1-1M9 4.5H7A1.5 1.5 0 0 0 5.5 6v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2M9 12h6M9 16h4"
);
export const PencilIcon = stroke("M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5l-4 1ZM14 7l3 3");
export const ExternalIcon = stroke(
  "M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"
);
/** Etapas ligadas subindo: o mapa de progressões (aba Skills). */
export const ProgressionIcon = stroke(
  "M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6.6 16.6l3.8-3.2M13.6 10.6l3.8-3.2"
);
export const MessageIcon = stroke(
  "M5.5 4.5h13a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H11l-4.5 3.5V17h-1a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2ZM8 9h8M8 12.5h5"
);

/** Arco girando — estado "trabalhando" de uma linha. Gira via `animate-spin`. */
export function SpinnerIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
