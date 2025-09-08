export default async function handler(req, res) {
  // --- CORS (para que funcione desde Hoppscotch y tu app en el navegador) ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // --- Solo permitimos POST ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { stats } = req.body || {};
    if (!stats) return res.status(400).json({ error: "Falta 'stats' en el body" });

    // Prompt pidiendo SOLO JSON válido
    const messages = [
      {
        role: "system",
        content:
          "Eres un generador de misiones para hábitos. Devuelve SOLO JSON válido con la forma {\"missions\":[{ \"scope\":\"daily|weekly|monthly\", \"title\":\"...\", \"desc\":\"...\", \"target\":number, \"reward\":number, \"expires\": \"YYYY-MM-DD\" }]}."
      },
      {
        role: "user",
        content:
          `Genera 2 misiones diarias, 3 semanales y 1 mensual ajustadas a estas estadísticas:\n` +
          JSON.stringify(stats)
      }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: "OpenAI error", detail: errText });
    }

    const data = await response.json();
    const content = (data?.choices?.[0]?.message?.content || "").trim();

    // Intentamos parsear el JSON que devuelve el modelo
    try {
      const parsed = JSON.parse(content);
      const missions = Array.isArray(parsed?.missions) ? parsed.missions : [];
      return res.status(200).json({ missions });
    } catch {
      // Si el modelo no devolvió JSON puro, al menos devolvemos el texto
      return res.status(200).json({ missions: [], raw: content });
    }
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Error desconocido" });
  }
}
