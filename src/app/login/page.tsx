"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Form() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { role } = await res.json();
      // petugas tidak boleh masuk /admin
      router.replace(role === "staff" && next.startsWith("/admin") ? "/scan" : next);
      router.refresh();
    } else {
      setError("Password salah");
      setBusy(false);
    }
  }

  return (
    <main className="center">
      <form onSubmit={submit} className="card stack" style={{ width: "100%", maxWidth: 340 }}>
        <h2 style={{ margin: 0 }}>Login</h2>
        <input type="password" placeholder="Password" value={password} autoFocus
          onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="err">{error}</div>}
        <button className="btn" disabled={busy || !password}>{busy ? "Memeriksa..." : "Masuk"}</button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><Form /></Suspense>;
}
