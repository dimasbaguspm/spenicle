import { Anchor, Text } from '@dimasbaguspm/versaur/primitive';
import { Link } from '@tanstack/react-router';

export function FormFooter() {
  return (
    <div className="flex flex-row gap-2 justify-center items-center mt-6">
      <Text as="p" fontSize="sm" color="gray">
        Already have an account?
      </Text>
      <Link to={'/login'}>
        <Anchor href="/login" fontSize="sm">
          Sign in here
        </Anchor>
      </Link>
    </div>
  );
}
