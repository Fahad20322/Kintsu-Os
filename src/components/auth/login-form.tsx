"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mode, setMode] = React.useState<"password" | "otp">("password");

  // Set once password sign-in reports 2FA is required.
  const [needsTwoFactor, setNeedsTwoFactor] = React.useState(false);
  const [twoFactorCode, setTwoFactorCode] = React.useState("");

  // One-time-code (passwordless) login flow.
  const [otpEmail, setOtpEmail] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSuccess() {
    toast.success("Welcome back");
    router.push("/dashboard");
    router.refresh();
  }

  async function onSubmit(values: LoginValues) {
    setIsSubmitting(true);
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Invalid email or password");
      return;
    }

    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setNeedsTwoFactor(true);
      return;
    }

    onSuccess();
  }

  async function verifyTwoFactor() {
    setIsSubmitting(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: twoFactorCode });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Invalid code");
      return;
    }
    onSuccess();
  }

  async function sendOtp() {
    setIsSubmitting(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: otpEmail,
      type: "sign-in",
    });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Could not send code");
      return;
    }
    setOtpSent(true);
    toast.success("Check your email for a sign-in code");
  }

  async function verifyOtp() {
    setIsSubmitting(true);
    const { error } = await authClient.signIn.emailOtp({ email: otpEmail, otp: otpCode });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Invalid or expired code");
      return;
    }
    onSuccess();
  }

  if (needsTwoFactor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={verifyTwoFactor}
            disabled={isSubmitting || twoFactorCode.length !== 6}
          >
            {isSubmitting ? "Verifying..." : "Verify"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mode === "otp") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in with a one-time code</CardTitle>
          <CardDescription>
            {otpSent
              ? "Enter the code we emailed you."
              : "We'll email you a 6-digit sign-in code."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="owner@kintsu.com"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
            disabled={otpSent}
          />
          {otpSent && (
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          )}
          {otpSent ? (
            <Button
              className="w-full"
              onClick={verifyOtp}
              disabled={isSubmitting || otpCode.length !== 6}
            >
              {isSubmitting ? "Verifying..." : "Sign in"}
            </Button>
          ) : (
            <Button className="w-full" onClick={sendOtp} disabled={isSubmitting || !otpEmail}>
              {isSubmitting ? "Sending..." : "Send code"}
            </Button>
          )}
          <Button variant="link" className="w-full" onClick={() => setMode("password")}>
            Back to password sign-in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your store.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="owner@kintsu.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setMode("otp")}
            >
              Sign in with a one-time code instead
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
