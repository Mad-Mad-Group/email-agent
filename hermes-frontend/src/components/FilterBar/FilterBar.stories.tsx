import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FilterBar } from './index';
import { Button } from '../Button/index';

const meta: Meta<typeof FilterBar> = {
  title: 'Components/FilterBar',
  component: FilterBar,
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Button variant="sm">All</Button>
        <Button variant="sm">Active</Button>
        <Button variant="sm">Archived</Button>
      </>
    ),
  },
};

export const WithSearchAndFilters: Story = {
  render: () => (
    <FilterBar>
      <input
        type="text"
        placeholder="Search..."
        style={{
          padding: '4px 8px',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          fontSize: '0.875rem',
        }}
      />
      <Button variant="sm">Status</Button>
      <Button variant="sm">Date Range</Button>
      <Button variant="sm">Owner</Button>
    </FilterBar>
  ),
};

export const SingleChild: Story = {
  args: {
    children: <Button variant="primary">Add New</Button>,
  },
};

export const ManyFilters: Story = {
  render: () => (
    <FilterBar>
      <Button variant="sm">All</Button>
      <Button variant="sm">New</Button>
      <Button variant="sm">Pending</Button>
      <Button variant="sm">Contacted</Button>
      <Button variant="sm">Qualified</Button>
      <Button variant="sm">Rejected</Button>
      <Button variant="sm">Draft</Button>
      <Button variant="sm">Sent</Button>
    </FilterBar>
  ),
};
