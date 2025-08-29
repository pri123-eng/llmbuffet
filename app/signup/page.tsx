"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function SignupPage() {
	const router = useRouter();
	const supabase = createClient();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const { error: signupError } = await supabase.auth.signUp({ email, password });
			if (signupError) throw signupError;

			// Create a corresponding profile row for this user
			const { data: userData, error: getUserError } = await supabase.auth.getUser();
			if (getUserError) throw getUserError;
			const userId = userData.user?.id;
			if (userId) {
				// Insert profile if not exists
				await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id" });
			}

			router.push("/");
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : "Signup failed";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen grid place-items-center bg-black text-slate-100 px-4">
			<form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6">
				<h1 className="text-lg font-semibold">Create account</h1>
				<label className="block text-sm">
					<span className="block mb-1 opacity-80">Email</span>
					<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/15 focus:outline-none" />
				</label>
				<label className="block text-sm">
					<span className="block mb-1 opacity-80">Password</span>
					<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/15 focus:outline-none" />
				</label>
				{error && <div className="text-sm text-rose-400">{error}</div>}
				<button type="submit" disabled={loading} className="w-full rounded-lg px-3 py-2 bg-gradient-to-br from-cyan-400 to-indigo-500 text-black font-medium disabled:opacity-60">
					{loading ? "Creating…" : "Sign up"}
				</button>
				<p className="text-sm opacity-80">
					Have an account? <Link href="/login" className="underline">Sign in</Link>
				</p>
			</form>
		</div>
	);
}
