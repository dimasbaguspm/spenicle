import { Text } from '@dimasbaguspm/versaur/primitive';
import { Link } from '@tanstack/react-router';

export function FormFooter() {
  return (
    <div className="flex flex-row gap-2 justify-center mt-6">
      <Text as="p" fontSize="sm" color="tertiary">
        Already have an account?
      </Text>
      <Link to="/login">Sign in here</Link>
    </div>
  );
}
