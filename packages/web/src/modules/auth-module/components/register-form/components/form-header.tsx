interface FormHeaderProps {
  title: string;
  subtitle: string;
}

export function FormHeader({ title, subtitle }: FormHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-slate-700 mb-2">{title}</h1>
      <p className="text-slate-500">{subtitle}</p>
    </div>
  );
}
