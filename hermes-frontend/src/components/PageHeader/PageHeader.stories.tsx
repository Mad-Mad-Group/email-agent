import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './index';
import { Button } from '../Button/index';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Leads',
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'Leads',
    subtitle: 'Manage and track all your sales leads',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Email Queue',
    subtitle: 'View and manage outgoing emails',
  },
  render: (args) => (
    <PageHeader {...args}>
      <Button variant="default">Export</Button>
      <Button variant="primary">Compose</Button>
    </PageHeader>
  ),
};

export const TitleOnly: Story = {
  args: {
    title: 'Dashboard',
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Customer Relationship Management Overview',
    subtitle: 'A comprehensive view of all your customer interactions and pipeline status',
  },
  render: (args) => (
    <PageHeader {...args}>
      <Button variant="sm">Filter</Button>
      <Button variant="default">Export CSV</Button>
      <Button variant="primary">Add Contact</Button>
    </PageHeader>
  ),
};
