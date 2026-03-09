export default async function handler(req, res) {
    const allowedOrigins = [
        'https://uniquechat1.vercel.app',
        'http://localhost:5173',
        'http://localhost:4173',
    ];
    const origin = req.headers.origin || '';
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');

    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://uniquechat1.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history = [], language = 'english' } = req.body;
        const HF_API_KEY = (process.env.HF_API_KEY || '').trim();

        if (!HF_API_KEY) return res.status(500).json({ error: '❌ HF_API_KEY is missing.' });
        if (!message) return res.status(400).json({ error: 'Message is required.' });

        const isTamil = language === 'tamil';

        const systemPrompt = isTamil
            ? `You are UniqueChat AI, a warm and funny Tamil best friend chatbot. ALWAYS reply in Tamil (தமிழ்) script only. Be helpful, funny and friendly. Address the user as 'மச்சி' or 'டா'. Give clear and useful answers.`
            : `You are UniqueChat AI, a helpful and friendly best friend chatbot. ALWAYS reply in English only. Be warm, funny, and supportive. Address the user as 'machi' or 'bro'. Give clear and useful answers.`;

        // Use chat_completion style for better results
        const messages = [
            { role: "system", content: systemPrompt },
        ];

        // Add history (last 6 messages max to avoid token limit)
        const recentHistory = history.slice(-6);
        for (const h of recentHistory) {
            if (h.role === 'user') messages.push({ role: 'user', content: h.parts?.[0]?.text || '' });
            if (h.role === 'model') messages.push({ role: 'assistant', content: h.parts?.[0]?.text || '' });
        }

        messages.push({ role: "user", content: message });

        // Use Zephyr model which is often faster and less 'busy'
        const modelId = "HuggingFaceH4/zephyr-7b-beta";
        
        const chatRes = await fetch(
            `https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    max_tokens: 512,
                    temperature: 0.7,
                    stream: false
                })
            }
        );

        if (!chatRes.ok) {
            const errText = await chatRes.text();
            console.error('HF Chat API Error:', chatRes.status, errText);

            // Fallback to text-generation API
            return await fallbackTextGeneration(req, res, message, systemPrompt, HF_API_KEY);
        }

        const data = await chatRes.json();
        let aiText = data?.choices?.[0]?.message?.content || '';
        aiText = cleanResponse(aiText, message, systemPrompt);

        if (!aiText) return await fallbackTextGeneration(req, res, message, systemPrompt, HF_API_KEY);

        return res.json({ text: aiText });

    } catch (error) {
        console.error('Internal Server Error:', error);
        return res.status(500).json({ error: '❌ Server error. Try again!' });
    }
}

// Fallback: old text-generation API
async function fallbackTextGeneration(req, res, message, systemPrompt, HF_API_KEY) {
    try {
        const prompt = `<s>[INST] ${systemPrompt}\n\nUser: ${message} [/INST]`;

        const fallbackRes = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 400,
                        temperature: 0.7,
                        return_full_text: false,
                        do_sample: true
                    }
                })
            }
        );

        if (!fallbackRes.ok) {
            const err = await fallbackRes.text();
            console.error('Fallback HF Error:', err);

            // Check if model is loading
            if (err.includes('loading') || err.includes('currently loading')) {
                return res.json({ text: '⏳ AI model is warming up! Please wait 20 seconds and try again 😊' });
            }
            return res.json({ text: 'Machi, AI busy aa iruku da! 😅 Oru nimisham wait pannu, again try pannu!' });
        }

        const data = await fallbackRes.json();
        let aiText = (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) || '';
        aiText = cleanResponse(aiText, message, systemPrompt);

        return res.json({ text: aiText || 'Machi, oru nimisham wait pannu da! Again try pannu 😅' });

    } catch (err) {
        console.error('Fallback error:', err);
        return res.json({ text: 'Machi, connection issue da! 😅 Again try pannu!' });
    }
}

// Clean up AI response — remove repeated prompts, prefixes, etc.
function cleanResponse(text, originalMessage, systemPrompt) {
    if (!text) return '';

    // Remove the system prompt if echoed back
    text = text.replace(systemPrompt, '').trim();

    // Remove common prompt artifacts
    text = text
        .replace(/^\s*\[\/INST\]\s*/i, '')
        .replace(/^\s*<s>\s*/i, '')
        .replace(/\s*<\/s>\s*$/i, '')
        .replace(/^\s*(AI|UniqueChat AI|Assistant|System)\s*:\s*/i, '')
        .replace(/^\s*User\s*:.*/i, '')  // Remove if user message echoed
        .trim();

    // If text contains the original message, only take what's after it
    const userMsgIdx = text.toLowerCase().indexOf(originalMessage.toLowerCase());
    if (userMsgIdx !== -1 && userMsgIdx < text.length / 2) {
        text = text.slice(userMsgIdx + originalMessage.length).trim();
        // Remove leading punctuation/labels after user msg
        text = text.replace(/^[\s\-:]+/, '').trim();
    }

    return text.trim();
}
