import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Lunar Crime Analyzer title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Lunar Crime Analyzer/i);
  expect(titleElement).toBeInTheDocument();
});