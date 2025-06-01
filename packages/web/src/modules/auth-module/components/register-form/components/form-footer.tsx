import { Link } from '@tanstack/react-router';

export function FormFooter() {
  return (
    <div className="mt-6 text-center space-y-3">
      <div className="text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-coral-600 hover:text-coral-700 font-medium transition-colors">
          Sign in here
        </Link>
      </div>
    </div>
  );
}
