import React from 'react';
import { render, screen } from '@testing-library/react';
import ScaledText from '../ScaledText';

describe('ScaledText', () => {
  it('renders text content correctly', () => {
    render(<ScaledText text="Test Content" fontSize={16} />);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom styles correctly', () => {
    const customStyle = {
      color: 'red',
      fontSize: '16px',
    };
    render(
      <ScaledText 
        text="Styled Content"
        fontSize={16}
        style={customStyle}
      />
    );
    const element = screen.getByText('Styled Content');
    expect(element).toHaveStyle(customStyle);
  });

  it('handles empty content gracefully', () => {
    render(<ScaledText text="" fontSize={16} />);
    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('applies scale factor correctly', () => {
    render(
      <ScaledText 
        text="Scaled Content"
        fontSize={16}
        scaleFactor={0.8}
        minScale={0.5}
      />
    );
    const element = screen.getByText('Scaled Content');
    expect(element).toHaveStyle({ transform: 'scale(0.8)' });
  });

  it('respects maxWidth constraint', () => {
    render(
      <ScaledText 
        text="Long content that should be constrained"
        fontSize={16}
        maxWidth={200}
      />
    );
    const element = screen.getByText('Long content that should be constrained');
    expect(element).toHaveStyle({ maxWidth: '200px' });
  });
}); 