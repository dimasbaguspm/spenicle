import { Text } from '@dimasbaguspm/versaur/primitive';

export function FormHeader() {
  return (
    <div className="text-center mb-8">
      <Text as="h2" fontSize="xl" fontWeight="bold" align="center">
        Create Account
      </Text>
      <Text as="p" align="center">
        Start tracking your expenses with Spenicle
      </Text>
    </div>
  );
}
