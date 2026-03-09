export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, language = 'english' } = req.body;
        const HF_API_KEY = (process.env.HF_API_KEY || '').trim();

        if (!HF_API_KEY) {
            return res.json({ text: "❌ Machi, HF_API_KEY set pannala! Vercel settings-la add pannu da." });
        }

        const isTamil = language === 'tamil';
        const systemPrompt = isTamil 
            ? "Tamil best friend. Reply only in Tamil script." 
            : "Friendly best friend. Reply only in English.";

        const prompt = `<s>[INST] ${systemPrompt}\n\nUser: ${message} [/INST]`;

        const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
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
            if (err.includes('loading')) {
                return res.json({ text: "⏳ AI ready agittu iruku! Oru 10 seconds kazhithu thirumba message pannu machi. 😊" });
            }
            return res.json({ text: "Machi, AI busy-a irukku. Please try again in 5 seconds! 😅" });
        }

        const data = await response.json();
        let aiText = (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) || '';
        
        // Clean the response
        aiText = aiText.replace(/\[\/INST\]/g, '').replace(/<s>/g, '').replace(/<\/s>/g, '').trim();

        res.json({ text: aiText || "Machi, enna solrathunnu therila! Try again? 😅" });

    } catch (error) {
        res.status(500).json({ text: "❌ Connection issue da! Check your internet." });
    }
}
