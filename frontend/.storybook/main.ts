import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(ts|tsx)',
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@chromatic-com/storybook',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
};

export default config;
