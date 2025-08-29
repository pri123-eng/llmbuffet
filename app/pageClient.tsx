"use client";
import { useMemo, useState, useEffect, useCallback } from "react";

type ModelOption = {
	label: string;
	id: string;
};

const ALL_MODELS: ModelOption[] = [
	{ label: "GPT-OSS 20B", id: "openai/gpt-oss-20b" },
	{ label: "Gemini 2.5 Flash Image Preview", id: "google/gemini-2.5-flash-image-preview" },
    { label: "DeepSeek Chat v3.1", id: "deepseek/deepseek-chat-v3.1" },
    { label: "Gemma 3N E2B Instruct", id: "google/gemma-3n-e2b-it" },
];

type Result = {
	model: string;
	content: string;
	error: string | null;
};

type Turn = {
	prompt: string;
	createdAt: number;
	responses: Record<string, { content: string; error: string | null } | undefined>;
};

type ChatThread = {
	id: string;
	title: string;
	turns: Turn[];
};

export default function ClientHome() {
	const [prompt, setPrompt] = useState("");
	const [selectedIds, setSelectedIds] = useState<string[]>([
		ALL_MODELS[0].id,
		ALL_MODELS[1].id,
	]);
	const [isLoading, setIsLoading] = useState(false);
	// Removed unused bestModel state

	// Chat history with threaded turns (start empty, no forced default chat)
	const [chats, setChats] = useState<ChatThread[]>([]);
	const [activeChatId, setActiveChatId] = useState<string | null>(null);

	// Client-only time label to avoid hydration mismatches
	const [timeLabel, setTimeLabel] = useState<string>("");
	useEffect(() => {
		try {
			setTimeLabel(
				new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
					new Date()
				)
			);
		} catch {
			setTimeLabel("");
		}
	}, []);

	// Persist chats to localStorage
	useEffect(() => {
		try {
			const raw = localStorage.getItem("llm-buffet-chats");
			if (raw) setChats(JSON.parse(raw));
		} catch {}
	}, []);
	useEffect(() => {
		try {
			localStorage.setItem("llm-buffet-chats", JSON.stringify(chats));
		} catch {}
	}, [chats]);

	const selectedModels = useMemo(
		() => ALL_MODELS.filter((m) => selectedIds.includes(m.id)),
		[selectedIds]
	);

	const activeChat = activeChatId ? chats.find((c) => c.id === activeChatId) ?? null : null;

	const ensureActiveChat = useCallback(() => {
		if (activeChatId && activeChat) return activeChatId;
		const newId = `${Date.now()}`;
		const newChat: ChatThread = { id: newId, title: "New chat", turns: [] };
		setChats((prev) => [newChat, ...prev]);
		setActiveChatId(newId);
		return newId;
	}, [activeChatId, activeChat]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const cleanPrompt = prompt.trim();
		if (!cleanPrompt || selectedIds.length === 0) return;

		const chatId = ensureActiveChat();

		// Create a new turn
		const newTurn: Turn = {
			prompt: cleanPrompt,
			createdAt: Date.now(),
			responses: {},
		};
		setChats((prev) =>
			prev.map((c) => (c.id === chatId ? { ...c, turns: [...c.turns, newTurn] } : c))
		);
		setIsLoading(true);
		// Removed unused setBestModel call
		setPrompt("");

		try {
			const res = await fetch("/api/v1/ai-models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: cleanPrompt, models: selectedIds }),
			});
			const data = (await res.json()) as { results: Result[]; error?: string };
			const results = data?.results ?? [];
			setChats((prev) =>
				prev.map((c) => {
					if (c.id !== chatId) return c;
					const turns = [...c.turns];
					const lastIdx = turns.length - 1;
					if (lastIdx >= 0) {
						const t = { ...turns[lastIdx] };
						const updatedResponses: Turn["responses"] = { ...t.responses };
						for (const r of results) {
							updatedResponses[r.model] = { content: r.content, error: r.error ?? null };
						}
						turns[lastIdx] = { ...t, responses: updatedResponses };
					}
					// Always name chat after the first prompt when it's still generic or empty
					const shouldRename = c.turns.length <= 1 || c.title.trim().toLowerCase() === "new chat";
					const title = shouldRename ? (cleanPrompt.length > 40 ? cleanPrompt.slice(0, 40) + "…" : cleanPrompt) : c.title;
					return { ...c, title, turns };
				})
			);
		} catch {
			// keep turn but no responses
		} finally {
			setIsLoading(false);
		}
	}

	function toggle(id: string) {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
		);
	}

	function startNewChat() {
		// Archive current chat (title already set on first send). Do not duplicate.
		const newId = `${Date.now()}`;
		const newChat: ChatThread = { id: newId, title: "New chat", turns: [] };
		setChats((prev) => [newChat, ...prev]);
		setActiveChatId(newId);
		setPrompt("");
		// Removed unused setBestModel call
	}

	function openChat(id: string) {
		setActiveChatId(id);
	}

	function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Trigger submit
			const form = (e.currentTarget as HTMLTextAreaElement).closest("form");
			form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
		}
	}

	return (
		<div className="min-h-screen flex overflow-hidden bg-[radial-gradient(1200px_600px_at_50%_-10%,#0b1220_0%,transparent_60%),linear-gradient(180deg,#0b1020_0%,#05070d_100%)] text-slate-100">
			{/* Sidebar */}
			<aside className="hidden sm:flex sm:flex-col w-64 border-r border-white/10 bg-white/5 backdrop-blur-md">
				<div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
					<div className="h-7 w-7 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-indigo-400" />
					<div>
						<h1 className="text-sm font-semibold tracking-tight">LLM Buffet</h1>
						<p className="text-[11px] opacity-70">Compare AI Models</p>
					</div>
				</div>
				<div className="p-3">
					<button onClick={startNewChat} className="w-full text-left text-sm rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 shadow-sm">+ New Chat</button>
				</div>
				<div className="px-4 pb-2 text-[11px] uppercase tracking-wide opacity-60">Today</div>
				<div className="flex-1 overflow-y-auto px-2 pb-40 space-y-1">
					{chats.filter((c) => c.turns.length > 0).map((c) => (
						<button
							key={c.id}
							onClick={() => openChat(c.id)}
							className={`w-full text-left truncate text-sm rounded-lg px-3 py-2 border ${activeChatId === c.id ? "bg-white/15 border-white/30" : "bg-transparent border-white/10 hover:bg-white/10"}`}
						>
							{c.title}
						</button>
					))}
				</div>
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Two response columns with enhanced divider */}
				<div className="flex-1 overflow-y-auto px-6 pt-6 pb-36">
					<div className="md:flex md:items-stretch md:gap-6">
						{/* Column A */}
						<div className="md:flex-1 grid grid-cols-1 gap-4">
							{selectedModels.slice(0, 1).map((m) => {
								return (
									<div
										key={m.id}
										className={`relative rounded-2xl p-0 border backdrop-blur-md bg-white/5 border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] card-fade-in hover:ring-1 hover:ring-white/20 transition`}
										style={{
											backgroundImage:
												"linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)",
										}}
									>
										{/* Card header */}
										<div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
											<div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center text-black text-sm">⚡</div>
											<div className="min-w-0">
												<div className="text-sm font-medium truncate">{m.label}</div>
												<div className="text-[11px] opacity-70">AI Assistant</div>
											</div>
										</div>

										{/* Thread - user + this model's responses per turn */}
										<div className="px-5 py-4 space-y-4">
											{(activeChat?.turns ?? []).map((t, idx) => {
												return (
													<div key={idx} className="space-y-3">
														<div className="flex items-start gap-2">
															<div className="h-8 w-8 rounded-full bg-slate-700/70 grid place-items-center text-sm">🙂</div>
															<div className="max-w-full">
																<div className="bg-slate-800/70 rounded-xl px-4 py-2 text-sm">{t.prompt}</div>
																<div className="text-[11px] opacity-60 mt-1" suppressHydrationWarning>{timeLabel}</div>
															</div>
														</div>
														{t.responses[m.id] && (
															<div className="flex items-start gap-2">
																<div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center text-black text-sm">⚡</div>
																<div className="max-w-full">
																	<div className="bg-white/8 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
																		{t.responses[m.id]?.error ? (
																			<span className="text-rose-400">{t.responses[m.id]?.error}</span>
																		) : (
																			 t.responses[m.id]?.content
																		)}
																	</div>
																	<div className="text-[11px] opacity-60 mt-1" suppressHydrationWarning>{timeLabel}</div>
																</div>
															</div>
														)}
													</div>
											);
										})}
									</div>

								</div>
							);
							})}
						</div>

						{/* Enhanced Divider */}
						<div className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-white/20 to-transparent" />

						{/* Column B */}
						<div className="md:flex-1 grid grid-cols-1 gap-4 mt-6 md:mt-0">
							{selectedModels.slice(1, 2).map((m) => {
								return (
									<div
										key={m.id}
										className={`relative rounded-2xl p-0 border backdrop-blur-md bg-white/5 border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] card-fade-in hover:ring-1 hover:ring-white/20 transition`}
										style={{
											backgroundImage:
												"linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)",
										}}
									>
										{/* Card header */}
										<div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
											<div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-black text-sm">🧠</div>
											<div className="min-w-0">
												<div className="text-sm font-medium truncate">{m.label}</div>
												<div className="text-[11px] opacity-70">AI Assistant</div>
											</div>
										</div>

										{/* Thread */}
										<div className="px-5 py-4 space-y-4">
											{(activeChat?.turns ?? []).map((t, idx) => {
												const response = t.responses[m.id];
												return (
													<div key={idx} className="space-y-3">
														<div className="flex items-start gap-2">
															<div className="h-8 w-8 rounded-full bg-slate-700/70 grid place-items-center text-sm">🙂</div>
															<div className="max-w-full">
																<div className="bg-slate-800/70 rounded-xl px-4 py-2 text-sm">{t.prompt}</div>
																<div className="text-[11px] opacity-60 mt-1" suppressHydrationWarning>{timeLabel}</div>
															</div>
														</div>
														{response && (
															<div className="flex items-start gap-2">
																<div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-black text-sm">🧠</div>
																<div className="max-w-full">
																	<div className="bg-white/8 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
																		{response.error ? (
																			<span className="text-rose-400">{response.error}</span>
																		) : (
																			response.content
																		)}
																	</div>
																	<div className="text-[11px] opacity-60 mt-1" suppressHydrationWarning>{timeLabel}</div>
																</div>
															</div>
														)}
													</div>
											);
									})}
								</div>
								</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Bottom input bar (keeps model toggles intact) */}
			<form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 px-4 sm:px-6 pb-5 pt-3 bg-gradient-to-t from-black/60 via-black/40 to-transparent backdrop-blur-md">
				<div className="mx-auto max-w-5xl flex items-center gap-2">
					<textarea
						className="flex-1 resize-none rounded-xl border border-white/15 bg-white/10 px-4 py-3 h-11 text-sm leading-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05)] placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 no-scrollbar overflow-hidden"
						rows={1}
						placeholder="Ask both AI models anything…"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={handleTextareaKeyDown}
					/>
					<button
						type="submit"
						disabled={isLoading}
						className="h-11 rounded-xl px-5 bg-gradient-to-br from-cyan-400 to-indigo-500 text-black font-medium shadow-md hover:brightness-110 disabled:opacity-60"
					>
						{isLoading ? "Sending…" : "Send"}
					</button>
				</div>
				<div className="mx-auto max-w-5xl flex flex-wrap gap-2 pt-2">
					{ALL_MODELS.map((m) => (
						<button
							key={m.id}
							type="button"
							className={`text-xs rounded-full px-3 py-1 border transition-colors ${selectedIds.includes(m.id) ? "bg-white/20 border-white/30" : "bg-transparent border-white/20 hover:bg-white/10"}`}
							onClick={() => toggle(m.id)}
						>
							{m.label}
						</button>
					))}
				</div>
			</form>
		</div>
	);
}
