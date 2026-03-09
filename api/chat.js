export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { message, history = [], language = 'english' } = req.body;
        const HF_API_KEY = (process.env.HF_API_KEY || '').trim();

        if (!HF_API_KEY) return res.status(500).json({ error: '❌ HF_API_KEY is missing on the server.' });

        // ── 1. FRIENDLY CHAT ─────────────────────────────────────────────
        const systemPrompt = language === 'tamil'
            ? "You are UniqueChat AI, a friendly best friend. You must respond ONLY in TAMIL script. Be warm, supportive, and humorous. Call the user 'machi' or 'da'. If they ask in English or Thanglish, you translate to beautiful Tamil."
            : "You are UniqueChat AI, a friendly best friend. You must respond ONLY in ENGLISH. Be warm, supportive, and humorous. Call the user 'machi', 'bro', or 'bestie'. If they use Tamil, you respond in clear English.";

        const formattedPrompt = `<s>[INST] ${systemPrompt}\n\nUser: ${message} [/INST]`;

        const chatRes = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inputs: formattedPrompt,
                parameters: { max_new_tokens: 500, temperature: 0.8, return_full_text: false }
            })
        });

        if (!chatRes.ok) {
            const err = await chatRes.text();
            console.error('HF API Error:', err);
            return res.json({ text: `Machi, oru nimisham wait pannu da! 😅 AI busy. Try again!` });
        }

        const data = await chatRes.json();
        let aiText = (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) || '';
        aiText = aiText.trim();
        aiText = (aiText || 'Machi, ennavo solla try pannuren! Again try pannu 😅').replace(/^(AI:|UniqueChat AI:|Assistant:)/i, '').trim();

        res.json({ text: aiText });

    } catch (error) {
        console.error('Internal Server Error:', error);
        res.status(500).json({ error: '❌ Internal Server Error. Try again!' });
    }
}
