/**
 * Netlify Function: generate.js
 * Updated to use native fetch (Node.js 18+) to avoid dependency errors.
 */
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const { topic, tone, apiKey } = JSON.parse(event.body);

        if (!topic) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Topic is required' }) };
        }

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return { 
                statusCode: 401, 
                headers, 
                body: JSON.stringify({ error: 'Gemini API Key missing' }) 
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`;

        const prompt = `You are a professional SEO blog writer. Write a blog post about "${topic}" in a ${tone || 'Professional'} tone. 
        Format as a VALID JSON object:
        {
            "title": "Title",
            "content": "HTML body content",
            "meta_title": "SEO Title",
            "meta_description": "SEO Description",
            "tags": "tag1, tag2",
            "canonical_url": "https://example.com",
            "external_links": ["https://link1.com", "https://link2.com"]
        }`;

        // Using global fetch (available in Node 18+)
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API Error');
        }

        let aiText = data.candidates[0].content.parts[0].text;
        const jsonContent = aiText.replace(/```json|```/gi, "").trim();

        return {
            statusCode: 200,
            headers,
            body: jsonContent
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
