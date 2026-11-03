import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo size="lg" />
      <h1 className="text-5xl font-extrabold text-white">404</h1>
      <p className="text-muted">We couldn't find that page.</p>
      <Link to="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
