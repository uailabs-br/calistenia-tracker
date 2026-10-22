/**
 * Os dois extremos que o app atende, lado a lado. As ilustrações são as mesmas
 * do "como executar" (RepDB, crédito no rodapé da página) e vêm do host do
 * dataset — se falharem, sobra o rótulo, que é o que carrega o sentido.
 *
 * O dataset não tem versão sem fundo: o arquivo é opaco, com fundo azul claro,
 * que briga com a paleta escura. A correção é duotone em CSS puro — inverter a
 * luminância joga o fundo pro preto e a figura pro claro, e o multiply pinta o
 * que sobrou na cor do accent. Nenhuma imagem é modificada nem republicada.
 */
import { DuotoneImage } from "@/components/ui/DuotoneImage";

const HOST = "https://exercise-dataset.com/images/flat/";

const LEVELS = [
  {
    tag: "Ainda não faz uma barra",
    name: "Remada invertida",
    file: "inverted-row-peak.webp",
  },
  {
    tag: "Já faz muscle-up",
    name: "Front lever",
    file: "front-lever-main.webp",
  },
] as const;

export function LevelShowcase() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {LEVELS.map((level) => (
        <figure key={level.name} className="min-w-0">
          <DuotoneImage src={`${HOST}${level.file}`} alt={level.name} lazy />
          <figcaption className="mt-2">
            <p className="font-mono text-[11px] text-muted">{level.tag}</p>
            <p className="text-sm font-medium">{level.name}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
