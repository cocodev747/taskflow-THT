import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../auth/AuthContext";
import { errMsg } from "../lib/apiError";
import { useToast } from "../ui/Toast";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, register: signUp } = useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  if (user) {
    return <Navigate to="/tasks" replace />;
  }

  async function onSubmit(values: FormValues) {
    try {
      await signUp(values.email, values.password);
      toast.ok("Account created!");
      navigate("/tasks");
    } catch (err) {
      toast.err(errMsg(err, "Could not create account."));
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Start managing your tasks</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3" noValidate>
        <div>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-slate-900 hover:underline">
          Login
        </Link>
      </p>
    </section>
  );
}
