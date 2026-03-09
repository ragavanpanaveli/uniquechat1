const dotenv = require('dotenv');
dotenv.config();

async function testFetch() {
    const HF_API_KEY = process.env.HF_API_KEY;
    console.log('Testing Key via Fetch (Router)...');

    try {
        const chatRes = await fetch('https://router.huggingface.co/hf-inference/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistralai/Mistral-7B-Instruct-v0.3',
                messages: [
                    { role: 'user', content: "Hello" }
                ],
                max_tokens: 10
            })
        });

        if (!chatRes.ok) {
            const errText = await chatRes.text();
            console.log('FAILED:', chatRes.status, errText);
        } else {
            const data = await chatRes.json();
            console.log('SUCCESS:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.log('FETCH ERROR:', err.message);
    }
}

testFetch();
