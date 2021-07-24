import { render, screen } from '@testing-library/react';
import {App} from '../app/app';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/react/i);
  expect(linkElement).toBeInTheDocument();
});
