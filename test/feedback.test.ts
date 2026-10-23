import { describe, expect, it } from "vitest";
import {
  buildFeedbackLink,
  feedbackFooter,
  shouldPromptFeedback,
  FEEDBACK_AGAIN_AFTER,
  FEEDBACK_FIRST_AT,
  type FeedbackContext,
} from "@/lib/domain/feedback";

const ctx: FeedbackContext = {
  version: "1.8",
  planId: "iniciante-com-barra",
  workouts: 12,
  device: "Android",
  installed: true,
};

describe("feedbackFooter", () => {
  it("leva versão, plano, treinos e aparelho", () => {
    expect(feedbackFooter(ctx)).toBe("v1.8 · treino iniciante-com-barra · 12 treinos · Android, instalado");
    expect(feedbackFooter({ ...ctx, workouts: 1, installed: false })).toContain("1 treino · Android, no navegador");
  });
});

describe("buildFeedbackLink", () => {
  it("WhatsApp recebe o texto pré-preenchido", () => {
    const link = buildFeedbackLink("https://wa.me/5531999999999", ctx);
    expect(link.startsWith("https://wa.me/5531999999999?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toContain(feedbackFooter(ctx));
  });

  it("e-mail recebe assunto e corpo, sem trocar espaço por +", () => {
    const link = buildFeedbackLink("mailto:oi@exemplo.com", ctx);
    expect(link).toMatch(/^mailto:oi@exemplo\.com\?subject=Feedback%20do%20app&body=/);
    expect(link).not.toContain("+");
  });

  it("respeita query que já existe no canal", () => {
    expect(buildFeedbackLink("https://api.whatsapp.com/send?phone=55", ctx)).toContain("?phone=55&text=");
  });

  it("outro destino abre como está", () => {
    expect(buildFeedbackLink("https://tally.so/r/abc", ctx)).toBe("https://tally.so/r/abc");
  });
});

describe("shouldPromptFeedback", () => {
  it("só depois de uso real", () => {
    expect(shouldPromptFeedback({ completed: FEEDBACK_FIRST_AT - 1, ackedAt: null, sessionActive: false })).toBe(false);
    expect(shouldPromptFeedback({ completed: FEEDBACK_FIRST_AT, ackedAt: null, sessionActive: false })).toBe(true);
  });

  it("nunca com sessão aberta", () => {
    expect(shouldPromptFeedback({ completed: 50, ackedAt: null, sessionActive: true })).toBe(false);
  });

  it("dispensado, volta só depois de mais treinos", () => {
    const ackedAt = 7;
    expect(shouldPromptFeedback({ completed: ackedAt + FEEDBACK_AGAIN_AFTER - 1, ackedAt, sessionActive: false })).toBe(false);
    expect(shouldPromptFeedback({ completed: ackedAt + FEEDBACK_AGAIN_AFTER, ackedAt, sessionActive: false })).toBe(true);
  });
});
