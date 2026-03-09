export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, language = 'english' } = req.body;
        const HF_API_KEY = (process.env.HF_API_KEY || '').trim();

        if (!HF_API_KEY) return res.json({ text: "❌ HF_API_KEY is missing." });
        
        const isTamil = language === 'tamil';
        const systemPrompt = isTamil 
            ? "Friendly Tamil friend. Use Tamil script only. Call user 'machi'." 
            : "Friendly English friend. Call user 'machi' or 'bro'.";

        // Using Zephyr: It's extremely fast and stable
        const prompt = `<s>[INST] ${systemPrompt}\n\nUser: ${message} [/INST]`;

        const response = await fetch(
            "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: { max_new_tokens: 300, temperature: 0.7, return_full_text: false }
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            if (err.includes('loading')) return res.json({ text: "⏳ AI is loading. Wait 10s and chat! 😊" });
            return res.json({ text: "Machi, AI busy-a irukku. Re-send pannu da! 😅" });
        }

        const data = await response.json();
        let aiText = (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) || '';
        
        // Final cleaning
        aiText = aiText.replace(/\[\/INST\]/g, '').replace(/<s>/g, '').replace(/<\/s>/g, '').trim();

        res.json({ text: aiText || "Machi, try again! 😅" });

    } catch (e) {
        res.status(500).json({ text: "❌ Connection Error" });
    }
}
