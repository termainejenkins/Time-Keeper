import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScaledText } from '../ScaledText';

describe('ScaledText', () => {
  it('renders text content correctly', () => {
    render(<ScaledText>Test Content</ScaledText>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom styles correctly', () => {
    const customStyle = {
      color: 'red',
      fontSize: '16px',
    };
    render(
      <ScaledText style={customStyle}>
        Styled Content
      </ScaledText>
    );
    const element = screen.getByText('Styled Content');
    expect(element).toHaveStyle(customStyle);
  });

  it('handles empty content gracefully', () => {
    render(<ScaledText></ScaledText>);
    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('applies scale factor correctly', () => {
    render(
      <ScaledText scaleFactor={0.8} minScale={0.5}>
        Scaled Content
      </ScaledText>
    );
    const element = screen.getByText('Scaled Content');
    expect(element).toHaveStyle({ transform: 'scale(0.8)' });
  });

  it('respects maxWidth constraint', () => {
    render(
      <ScaledText maxWidth={200}>
        Long content that should be constrained
      </ScaledText>
    );
    const element = screen.getByText('Long content that should be constrained');
    expect(element).toHaveStyle({ maxWidth: '200px' });
  });
}); 