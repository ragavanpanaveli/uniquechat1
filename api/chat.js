export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, language = 'english' } = req.body;
        const key = (process.env.HF_API_KEY || '').trim();

        if (!key) return res.json({ text: "❌ API Key Missing in Vercel settings!" });
        if (!message) return res.json({ text: "Machi, message ethuvum illaye! 😅" });

        const isTamil = language === 'tamil';
        const systemPrompt = isTamil 
            ? "Tamil best friend. Respond only in Tamil script. Call user 'machi'." 
            : "English best friend. Call user 'machi' or 'bro'.";

        // Using Mistral-7B-Instruct-v0.2 directly for maximum stability
        const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: `<s>[INST] ${systemPrompt}\n\nUser: ${message} [/INST]`,
                    parameters: { max_new_tokens: 300, temperature: 0.7, return_full_text: false }
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            if (err.includes('loading')) return res.json({ text: "⏳ AI is warming up! Give me 10 seconds and try again machi. 😊" });
            return res.json({ text: "Machi, AI busy-a irukku. Re-send pannu da! 😅" });
        }

        const data = await response.json();
        let aiText = (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) || '';
        
        // Clean any leftovers
        aiText = aiText.replace(/\[\/INST\]/g, '').replace(/<s>/g, '').replace(/<\/s>/g, '').trim();

        return res.json({ text: aiText || "Machi, ennala ipo solla mudila, thirumba try pannuriya? 😅" });

    } catch (e) {
        return res.status(500).json({ text: "❌ Connection Error" });
    }
}
