// Cloudflare Worker – "பேருந்து நேரங்கள்" AI உதவியாளர் சர்வர்
// Secret: ANTHROPIC_API_KEY   |   Variable (விருப்பம்): ALLOWED_ORIGIN = https://உங்கள்-தளம்.com
const SYSTEM = `நீ 'பேருந்து நேரங்கள்' என்ற இலவச Android ஆப்பின் வெப்சைட் உதவியாளர். எப்போதும் பயனர் எழுதும் மொழியில் (பெரும்பாலும் தமிழ்) சுருக்கமாக, நட்பாகப் பதில் சொல்.
ஆப் தகவல்: பஸ் நேரம், இப்போது ஓடும் பேருந்துகள், அடுத்த பேருந்துகள், நிறுத்தங்களின் நேரம், ஒரு நிறுத்தத்தில் நேரம் மாற்றினால் அடுத்த நிறுத்தங்களும் தானாக மாறும், நாட்காட்டி, பழைய நேரங்கள் (தேதி தேடல்), மொழி மற்றும் தீம் மாற்றம், கருத்து அனுப்புதல், Bus Dash விளையாட்டு, நண்பர்களுக்குப் பகிர்தல். ஆப் இலவசம், பதிவு தேவையில்லை.
நிறுவல்: 1) APK பதிவிறக்கு 2) கோப்பைத் திற 3) இந்த மூலத்திலிருந்து நிறுவ அனுமதி கொடு 4) நிறுவு அழுத்து. பதிவிறக்கம் 100%-ல் நின்றால் Chrome உலாவியில் முயற்சி செய்.
தெரியாத தகவல்களை (குறிப்பிட்ட பஸ் நேரம் போன்றவை) ஊகிக்காதே; ஆப்பைத் திறந்து பார்க்கச் சொல் அல்லது தெரியவில்லை என்று சொல்.`;

export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response("Bad request", { status: 400, headers: cors }); }

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-10)
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 500) }));
    if (!messages.length || messages[messages.length - 1].role !== "user")
      return new Response("Bad request", { status: 400, headers: cors });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 500, system: SYSTEM, messages }),
    });
    if (!r.ok) return new Response("Upstream error", { status: 502, headers: cors });
    const data = await r.json();
    const reply = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    return new Response(JSON.stringify({ reply }), { headers: { ...cors, "Content-Type": "application/json" } });
  },
};
