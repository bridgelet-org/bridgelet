// #119 – Minimal i18n helper for claim page (EN, FR, ES, SW, PT)
export type Locale = 'en' | 'fr' | 'es' | 'sw' | 'pt';

type Messages = {
  claimTitle: string;
  claimDescription: string;
  connectWallet: string;
  noWallet: string;
  claimButton: string;
};

const messages: Record<Locale, Messages> = {
  en: {
    claimTitle: 'Claim your payment',
    claimDescription: 'A payment has been sent to you.',
    connectWallet: 'Connect wallet',
    noWallet: "Don't have a wallet?",
    claimButton: 'Claim now',
  },
  fr: {
    claimTitle: 'Réclamez votre paiement',
    claimDescription: 'Un paiement vous a été envoyé.',
    connectWallet: 'Connecter le portefeuille',
    noWallet: "Vous n'avez pas de portefeuille ?",
    claimButton: 'Réclamer maintenant',
  },
  es: {
    claimTitle: 'Reclama tu pago',
    claimDescription: 'Se te ha enviado un pago.',
    connectWallet: 'Conectar billetera',
    noWallet: '¿No tienes billetera?',
    claimButton: 'Reclamar ahora',
  },
  sw: {
    claimTitle: 'Dai malipo yako',
    claimDescription: 'Malipo yametumwa kwako.',
    connectWallet: 'Unganisha mkoba',
    noWallet: 'Huna mkoba?',
    claimButton: 'Dai sasa',
  },
  pt: {
    claimTitle: 'Reivindique seu pagamento',
    claimDescription: 'Um pagamento foi enviado para você.',
    connectWallet: 'Conectar carteira',
    noWallet: 'Não tem carteira?',
    claimButton: 'Reivindicar agora',
  },
};

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.en;
}

export function detectLocale(acceptLanguage?: string): Locale {
  const supported: Locale[] = ['en', 'fr', 'es', 'sw', 'pt'];
  const lang = (acceptLanguage ?? 'en').split(',')[0]?.split('-')[0]?.toLowerCase() ?? 'en';
  return supported.includes(lang as Locale) ? (lang as Locale) : 'en';
}
