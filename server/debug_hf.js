const { HfInference } = require('@huggingface/inference');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    const HF_API_KEY = process.env.HF_API_KEY;
    console.log('Testing Key:', HF_API_KEY ? 'Present' : 'Missing');

    const hf = new HfInference(HF_API_KEY);

    try {
        console.log('Sending textGeneration request...');
        const result = await hf.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.3',
            inputs: '<s>[INST] Hello [/INST]',
            parameters: { max_new_tokens: 10 }
        });
        console.log('SUCCESS:', result.generated_text);
        process.exit(0);
    } catch (err) {
        console.log('FAILED');
        console.error('NAME:', err.name);
        console.error('MESSAGE:', err.message);
        if (err.response) {
            const body = await err.response.text();
            console.error('STATUS:', err.response.status);
            console.error('BODY:', body);
        }
        process.exit(1);
    }
}

test();
