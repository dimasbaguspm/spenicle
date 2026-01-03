import {
  Button,
  ButtonGroup,
  EmailInput,
  FormLayout,
  Heading,
  Text,
  TextInput,
  Tile,
} from "@dimasbaguspm/versaur";
import { useApiLogin } from "@/hooks/use-api/built/auth";
import { useForm } from "react-hook-form";
import { type LoginFormSchema } from "./types";
import { useAuthProvider } from "@/providers/auth-provider";

const LoginPage = () => {
  const [login, , { isPending }] = useApiLogin();
  const { handleSetTokens } = useAuthProvider();
  const { register, handleSubmit } = useForm<LoginFormSchema>();

  const handleOnSubmit = async (data: LoginFormSchema) => {
    const resp = await login({
      username: data.username,
      password: data.password,
    });
    handleSetTokens(resp);
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-36 px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Heading as="h1" align="center">
            Welcome to Spenicle
          </Heading>
          <Text as="p" align="center">
            Sign in to your account to continue
          </Text>
        </div>

        <Tile>
          <form onSubmit={handleSubmit(handleOnSubmit)}>
            <FormLayout className="mb-6">
              <FormLayout.Column span={12}>
                <TextInput
                  label="Username"
                  placeholder="Enter your username"
                  {...register("username")}
                  required
                />
              </FormLayout.Column>
              <FormLayout.Column span={12}>
                <TextInput
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  required
                />
              </FormLayout.Column>
            </FormLayout>

            <ButtonGroup>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="w-full"
              >
                Sign In
              </Button>
            </ButtonGroup>
          </form>
        </Tile>
      </div>
    </div>
  );
};

export default LoginPage;
