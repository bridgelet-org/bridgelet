import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SendFormStep } from './send-form-step';

const meta: Meta<typeof SendFormStep> = {
  title: 'Components/SendFormStep',
  component: SendFormStep,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SendFormStep>;

export const FirstStep: Story = {
  args: {
    step: 1,
    totalSteps: 3,
    title: 'Enter payment details',
    description: 'Specify the amount and asset you want to send.',
    children: <p className="text-sm text-slate-600">Form fields go here.</p>,
    onNext: () => {},
  },
};

export const MiddleStep: Story = {
  args: {
    step: 2,
    totalSteps: 3,
    title: 'Recipient information',
    description: 'Add optional notes for the recipient.',
    children: <p className="text-sm text-slate-600">Form fields go here.</p>,
    onBack: () => {},
    onNext: () => {},
  },
};

export const LastStep: Story = {
  args: {
    step: 3,
    totalSteps: 3,
    title: 'Review and confirm',
    children: <p className="text-sm text-slate-600">Summary goes here.</p>,
    onBack: () => {},
    onNext: () => {},
    nextLabel: 'Send Payment',
  },
};

export const Loading: Story = {
  args: {
    step: 3,
    totalSteps: 3,
    title: 'Sending…',
    children: <p className="text-sm text-slate-600">Creating ephemeral account…</p>,
    onBack: () => {},
    onNext: () => {},
    nextLabel: 'Send Payment',
    isLoading: true,
  },
};
