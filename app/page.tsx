"use client";
import { useState } from "react";

export default function Home() {
	const [prompt, setPrompt] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [results, setResults] = useState<string[]>([]);

	const models = [
		{ name: "GLM-4.5-Air", id: "zhipu-ai/glm-4.5-air" },
		{ name: "Mistral Small 3.2 24B", id: "mistral/mistral-small-3.2-24b" },
		{ name: "DeepSeek Chat v3.1", id: "deepseek/deepseek-chat-v3.1" },
		{ name: "Gemma 3N E2B Instruct", id: "google/gemma-3n-e2b-it" }
	];

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!prompt.trim()) return;

		setIsLoading(true);
		setResults([]);

		try {
			const res = await fetch("/api/v1/ai-models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt,
					models: models.map(m => m.id)
				}),
			});

			const data = await res.json();
			if (data.results) {
				setResults(data.results.map((r: { content?: string; error?: string }) => r.content || r.error || "No response"));
			}
		} catch {
			setResults(["Error: Failed to get responses"]);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
					AI Model Comparator
				</h1>

				<form onSubmit={handleSubmit} className="mb-8">
					<div className="flex gap-4 max-w-4xl mx-auto">
						<input
							type="text"
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="Ask all AI models the same question..."
							className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
						/>
						<button
							type="submit"
							disabled={isLoading}
							className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold rounded-lg hover:from-cyan-500 hover:to-purple-600 disabled:opacity-50"
						>
							{isLoading ? "Sending..." : "Compare Models"}
						</button>
					</div>
				</form>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{models.map((model, index) => (
						<div key={model.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
							<h3 className="text-lg font-semibold mb-3 text-cyan-400">{model.name}</h3>
							<div className="min-h-32">
								{isLoading ? (
									<div className="text-white/60">Thinking...</div>
								) : results[index] ? (
									<div className="text-sm whitespace-pre-wrap">{results[index]}</div>
								) : (
									<div className="text-white/40">No response yet</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

