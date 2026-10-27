"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileSettings } from "@/components/config/ProfileSettings";
import { ThemeSettings } from "@/components/config/ThemeSettings";
import { DataSettings } from "@/components/config/DataSettings";
import { AppFooter, AppSettings } from "@/components/config/AppSettings";
import { ResetSettings } from "@/components/config/ResetSettings";

/**
 * Ajustes ficou só com o que é do app e da pessoa: você, a aparência, seus dados, o app e,
 * sozinho no fim, apagar. Tudo que muda o treino mora na aba Treino.
 *
 * O lembrete (5.1) saiu daqui de propósito: guardava horário mas nunca
 * disparou notificação. `ReminderSettings` volta quando a entrega existir.
 */
export default function ConfigPage() {
  return (
    <div className="px-4">
      <PageHeader title="Ajustes" />

      <ProfileSettings />

      <ThemeSettings />

      <DataSettings />

      <AppSettings />

      <ResetSettings />

      <AppFooter />
      <div className="h-4" />
    </div>
  );
}
