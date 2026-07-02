import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        New to Kintsu OS?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create your store
        </Link>
      </p>
    </div>
  );
}
