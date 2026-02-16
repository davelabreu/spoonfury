import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <Card>
        <CardHeader><CardTitle>Sign in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Username"
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input className="w-full border rounded px-3 py-2 text-sm" type="password" placeholder="Password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
            <p className="text-sm text-center text-muted-foreground">
              No account? <Link to="/register" className="underline">Join Spoonfury</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
