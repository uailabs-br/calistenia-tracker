import { ChevronDownIcon } from "@/components/ui/icons";
import { FAQ } from "@/components/landing/content";

/**
 * Perguntas fechadas, uma de cada vez. `details` nativo: abre sem JS e o leitor
 * de tela já anuncia aberto/fechado. Mesmo desenho da política de privacidade.
 */
export function Faq() {
  return (
    <div className="mt-6 border-t border-border">
      {FAQ.map((item) => (
        <details key={item.q} className="group border-b border-border">
          <summary className="tap flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 font-medium [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDownIcon className="h-4 w-4 shrink-0 -rotate-90 text-muted transition-transform duration-200 group-open:rotate-0" />
          </summary>
          <p className="max-w-2xl pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
