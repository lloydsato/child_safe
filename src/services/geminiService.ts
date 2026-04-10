// Calls the server-side API instead of Gemini directly from the browser
// This keeps the API key secure on the server

export async function compareFaces(image1Base64: string, image2Base64: string) {
  try {
    // 35s timeout (slightly longer than server's 30s timeout for OpenRouter)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const res = await fetch("/api/compare-faces", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ image1Base64, image2Base64 }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Compare faces API error:", res.status);
      // Return a fallback score so matches can still be created
      return {
        confidence_score: Math.floor(Math.random() * 40) + 20,
        analysis: "Server error during comparison. Fallback score generated for review.",
      };
    }

    const result = await res.json();
    return {
      confidence_score: result.confidence_score || 0,
      analysis: result.analysis || "No analysis provided.",
    };
  } catch (error) {
    console.error("AI Matching Error:", error);
    // Return a fallback score instead of 0 so matches can still be saved for review
    return {
      confidence_score: Math.floor(Math.random() * 40) + 20,
      analysis: "AI matching timed out or failed. Fallback score generated for manual review.",
    };
  }
}

