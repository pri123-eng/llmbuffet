import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const prompt = body?.prompt?.trim();
		const models = body?.models ?? [];

		if (!process.env.OPENROUTER_API_KEY) {
			return NextResponse.json(
				{ error: "OPENROUTER_API_KEY environment variable is missing." },
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

		const results = await Promise.all(
			models.map(async (modelId: string) => {
				try {
					const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
						method: "POST",
						headers: {
							"Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
						throw new Error(`API error: ${response.status}`);
					}

					const data = await response.json();
					const content = data.choices?.[0]?.message?.content ?? "";
					return { model: modelId, content, error: null };
				} catch (err) {
					const message = err instanceof Error ? err.message : "Unknown error";
					return { model: modelId, content: "", error: message };
				}
			})
		);

		return NextResponse.json({ results });
	} catch (e) {
		const message = e instanceof Error ? e.message : "Invalid request";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
