"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function AuthStatus() {
	const supabase = createClient();
	const [email, setEmail] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		supabase.auth.getUser().then(({ data }) => {
			if (!mounted) return;
			setEmail(data.user?.email ?? null);
		});
		const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
			setEmail(session?.user?.email ?? null);
		});
		return () => {
			mounted = false;
			sub.subscription.unsubscribe();
		};
	}, [supabase]);

	async function signOut() {
		await supabase.auth.signOut();
		setEmail(null);
	}

	return email ? (
		<div className="flex items-center gap-2">
			<span className="hidden sm:inline opacity-80">Signed in as {email}</span>
			<button onClick={signOut} className="rounded-lg px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10">Sign out</button>
		</div>
	) : (
		<div className="flex items-center gap-2">
			<Link href="/login" className="rounded-lg px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10">Login</Link>
			<Link href="/signup" className="rounded-lg px-3 py-1.5 border border-white/15 bg-gradient-to-br from-cyan-400 to-indigo-500 text-black font-medium hover:brightness-110">Sign up</Link>
		</div>
	);
}
