export type RoadmapItem = {
  label: string;
  done: boolean;
};

export type Quarter = {
  id: string;
  title: string;
  goal: string;
  emoji: string;
  categories: { label: string; items: RoadmapItem[] }[];
};

export type CommunityRequest = {
  feature: string;
  status: string;
  issue: string;
};

export const quarters: Quarter[] = [
  {
    id: 'q1-2026',
    title: 'Q1 2026',
    goal: 'Deliver a functional, tested core system on Testnet.',
    emoji: '🏁',
    categories: [
      {
        label: 'Smart Contracts (bridgelet-core)',
        items: [
          { label: 'Basic ephemeral account contract structure', done: true },
          { label: 'Implement sweeping logic restrictions (lock to destination)', done: false },
          { label: 'Time-based expiration logic', done: false },
          { label: 'Comprehensive unit tests for core contracts', done: false },
        ],
      },
      {
        label: 'SDK (bridgelet-sdk)',
        items: [
          { label: 'Account generation utilities', done: false },
          { label: 'Transaction building for funding and claiming', done: false },
          { label: 'Basic error handling and validation', done: false },
        ],
      },
      {
        label: 'Documentation',
        items: [
          { label: 'Complete API Reference', done: false },
          { label: '"Hello World" integration tutorial', done: false },
        ],
      },
      {
        label: 'Infrastructure',
        items: [{ label: 'Stellar Testnet deployment scripts', done: false }],
      },
    ],
  },
  {
    id: 'q2-2026',
    title: 'Q2 2026',
    goal: 'Harden the system for production and improve developer experience.',
    emoji: '🛡️',
    categories: [
      {
        label: 'Security',
        items: [
          { label: 'Third-party Security Audit of core smart contracts', done: false },
          { label: 'Implement bug bounty program', done: false },
        ],
      },
      {
        label: 'SDK Enhancements',
        items: [
          { label: 'Webhook support for account events (claimed, expired)', done: false },
          { label: 'Multi-signature support for organization controls', done: false },
        ],
      },
      {
        label: 'Frontend',
        items: [
          { label: 'Release bridgelet-ui reference implementation (Next.js)', done: false },
          { label: 'Widget/iFrame support for easy integration', done: false },
        ],
      },
      {
        label: 'Network',
        items: [{ label: 'Mainnet Beta Launch (Limited pilot)', done: false }],
      },
    ],
  },
  {
    id: 'q3-2026',
    title: 'Q3 2026',
    goal: 'Support complex use cases and scale.',
    emoji: '🚀',
    categories: [
      {
        label: 'Smart Contracts',
        items: [
          { label: 'Support for non-native tokens (USDC, EURC)', done: false },
          { label: 'Batch account creation optimization', done: false },
          { label: 'Gas sponsorship delegation features', done: false },
        ],
      },
      {
        label: 'Integration',
        items: [
          { label: 'Pre-built integrations for major payroll providers', done: false },
          { label: 'Email/SMS link generation service', done: false },
        ],
      },
      {
        label: 'Ecosystem',
        items: [
          { label: 'Partner pilot program launch', done: false },
          { label: 'Hackathon sponsorship and developer grants', done: false },
        ],
      },
    ],
  },
  {
    id: 'q4-2026',
    title: 'Q4 2026',
    goal: 'Mass adoption and decentralized governance.',
    emoji: '🌍',
    categories: [
      {
        label: 'Scale',
        items: [
          { label: 'Cross-border payment specific optimizations', done: false },
          { label: 'High-throughput claim processing', done: false },
        ],
      },
      {
        label: 'Governance',
        items: [
          { label: 'Community governance model proposal', done: false },
          { label: 'Open contributor incentives', done: false },
        ],
      },
      {
        label: 'Partnerships',
        items: [
          { label: 'Integration with major Stellar wallets', done: false },
          { label: 'On/Off-ramp provider partnerships', done: false },
        ],
      },
    ],
  },
];

export const communityRequests: CommunityRequest[] = [
  { feature: 'Python SDK', status: '📝 Planned', issue: '#12' },
  { feature: 'Dashboard UI', status: '🚧 In Progress', issue: '#45' },
];

export const longTermVision: string[] = [
  'Any organization can send funds to a phone number or email without worrying about crypto complexity.',
  'Users are onboarded to non-custodial wallets progressively, only learning about keys when they are ready.',
  'Developers have a plug-and-play solution for last-mile crypto delivery.',
];
