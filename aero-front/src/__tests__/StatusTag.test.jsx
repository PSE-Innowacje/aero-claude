import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusOperacjiTag, StatusZleceniaTag } from '../components/StatusTag';

describe('StatusOperacjiTag', () => {
  const expectedLabels = {
    1: 'Wprowadzone',
    2: 'Odrzucone',
    3: 'Potwierdzone',
    4: 'Zaplanowane',
    5: 'Częściowo zrealiz.',
    6: 'Zrealizowane',
    7: 'Rezygnacja',
  };

  Object.entries(expectedLabels).forEach(([id, label]) => {
    it(`renders "${label}" for statusId=${id}`, () => {
      render(<StatusOperacjiTag statusId={Number(id)} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders fallback label for unknown statusId', () => {
    render(<StatusOperacjiTag statusId={99} />);
    expect(screen.getByText('Status 99')).toBeInTheDocument();
  });
});

describe('StatusZleceniaTag', () => {
  const expectedLabels = {
    1: 'Wprowadzone',
    2: 'Do akceptacji',
    3: 'Odrzucone',
    4: 'Zaakceptowane',
    5: 'Częściowo zrealiz.',
    6: 'Zrealizowane',
    7: 'Nie zrealizowane',
  };

  Object.entries(expectedLabels).forEach(([id, label]) => {
    it(`renders "${label}" for statusId=${id}`, () => {
      render(<StatusZleceniaTag statusId={Number(id)} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders fallback label for unknown statusId', () => {
    render(<StatusZleceniaTag statusId={0} />);
    expect(screen.getByText('Status 0')).toBeInTheDocument();
  });
});
