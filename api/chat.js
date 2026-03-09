export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    res.setHeader('Access-Control-Allow-Origin', '*'); // Simple CORS for testing
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, history = [], language = 'english' } = req.body;
        const HF_API_KEY = (process.env.HF_API_KEY || '').trim();

        if (!HF_API_KEY) return res.status(500).json({ error: 'HF_API_KEY missing' });
        
        const isTamil = language === 'tamil';
        const systemPrompt = isTamil
            ? "You are UniqueChat AI, a funny Tamil friend. Use Tamil script. Call user 'machi'."
            : "You are UniqueChat AI, a friendly bestie. Use English. Call user 'machi'.";

        const messages = [
            { role: "system", content: systemPrompt },
            ...history.slice(-4).map(h => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.parts?.[0]?.text || ''
            })),
            { role: "user", content: message }
        ];

        // Retry logic: Try 3 times if AI is busy
        let aiResponse = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const chatRes = await fetch(
                    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2/v1/chat/completions',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${HF_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messages,
                            max_tokens: 500,
                            temperature: 0.7
                        })
                    }
                );

                if (chatRes.ok) {
                    const data = await chatRes.json();
                    aiResponse = data?.choices?.[0]?.message?.content;
                    if (aiResponse) break;
                } else {
                    const error = await chatRes.text();
                    if (error.includes('loading')) {
                        console.log(`Model loading, attempt ${attempts}...`);
                        await new Promise(r => setTimeout(r, 5000)); // Wait 5s before retry
                        continue;
                    }
                }
            } catch (e) {
                console.error(`Attempt ${attempts} failed:`, e);
            }
        }

        if (aiResponse) {
            return res.json({ text: aiResponse.trim() });
        } else {
            return res.json({ text: "Machi, AI innum ready agala da! 😅 Oru 10 seconds kazhithu message pannu, kandippa reply tharen!" });
        }

    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
}
