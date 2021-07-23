import { render, screen } from '@testing-library/react';
import { Loader } from './loader';

test('renders a spinning image', () => {
  render(<Loader />);
  const img = screen.getByAltText(/Loading.../i);
  expect(img).toBeInTheDocument();
});
