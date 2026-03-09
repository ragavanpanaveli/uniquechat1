const dotenv = require('dotenv');
dotenv.config();

async function testRouter() {
    const HF_API_KEY = process.env.HF_API_KEY;
    const url = 'https://router.huggingface.co/v1/chat/completions';

    console.log('Testing Llama-3.1-8B via Router...');

    try {
        const chatRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages: [
                    { role: 'system', content: "You are a helpful assistant." },
                    { role: 'user', content: "Hi" }
                ],
                max_tokens: 20
            })
        });

        console.log('HTTP Status:', chatRes.status);
        const data = await chatRes.json();

        if (!chatRes.ok) {
            console.log('FAILED:', JSON.stringify(data, null, 2));
        } else {
            console.log('SUCCESS:', data.choices[0].message.content);
        }
    } catch (err) {
        console.log('FETCH ERROR:', err.message);
    }
}

testRouter();
