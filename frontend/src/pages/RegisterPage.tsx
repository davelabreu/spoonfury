import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password1: "", password2: "" });
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password1 !== form.password2) { setError("Passwords don't match."); return; }
    try {
      await register(form.username, form.email, form.password1, form.password2);
      setIsSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err: unknown) {
      const e = err as { data?: unknown };
      setError(JSON.stringify(e.data || "Registration failed."));
    }
  };

  const field = (key: keyof typeof form, placeholder: string, type = "text") => (
    <Input type={type} placeholder={placeholder}
      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
  );

  return (
    <div className="max-w-sm mx-auto mt-16">
      <Card>
        <CardHeader><CardTitle>Join Spoonfury</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {field("username", "Username")}
            {field("email", "Email", "email")}
            {field("password1", "Password", "password")}
            {field("password2", "Confirm password", "password")}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {isSuccess && <p className="text-sm text-green-600">Welcome to Spoonfury! Redirecting...</p>}
            <Button type="submit" className="w-full" disabled={isSuccess}>
              {isSuccess ? "Redirecting..." : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
