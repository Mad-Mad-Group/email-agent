import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './index';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
  argTypes: {
    onPageChange: { action: 'pageChanged' },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    current: 1,
    total: 50,
    pageSize: 10,
  },
};

export const MiddlePage: Story = {
  args: {
    current: 3,
    total: 50,
    pageSize: 10,
  },
};

export const LastPage: Story = {
  args: {
    current: 5,
    total: 50,
    pageSize: 10,
  },
};

export const SinglePage: Story = {
  args: {
    current: 1,
    total: 5,
    pageSize: 10,
  },
};

export const ManyPages: Story = {
  args: {
    current: 1,
    total: 200,
    pageSize: 10,
  },
};

export const Interactive: Story = {
  render: function Render() {
    const [page, setPage] = useState(1);
    return <Pagination current={page} total={75} pageSize={10} onPageChange={setPage} />;
  },
};
