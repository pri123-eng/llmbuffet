import { NextRequest, NextResponse } from "next/server";

// Completely new API structure - no OpenAI, no cached routes
async function queryAI(modelId: string, prompt: string) {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error("OPENROUTER_API_KEY environment variable is not set");
	}

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: modelId,
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: prompt },
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.choices?.[0]?.message?.content ?? "";
}

type AIRequest = {
	prompt: string;
	models: string[];
};

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<AIRequest>;
		const prompt = body?.prompt?.trim();
		const models = body?.models ?? [];

		if (!process.env.OPENROUTER_API_KEY) {
			return NextResponse.json(
				{ error: "Server misconfigured: OPENROUTER_API_KEY is missing." },
				{ status: 500 }
			);
		}

		if (!prompt) {
			return NextResponse.json(
				{ error: "Missing prompt" },
				{ status: 400 }
			);
		}

		if (!Array.isArray(models) || models.length === 0) {
			return NextResponse.json(
				{ error: "No models selected" },
				{ status: 400 }
			);
		}

		const requests = models.map(async (modelId) => {
			try {
				const content = await queryAI(modelId, prompt);
				return { model: modelId, content, error: null };
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Unknown error";
				return { model: modelId, content: "", error: message };
			}
		});

		const results = await Promise.all(requests);
		return NextResponse.json({ results });
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : "Invalid request";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
