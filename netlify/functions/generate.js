const fetch = require('node-fetch');

/**
 * Netlify Function: generate.js
 * This serves as the secure backend for the AI Blog Agent.
 * It keeps your Gemini API Key hidden from the client-side.
 */
exports.handler = async (event, context) => {
    // Enable CORS for frontend requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST requests
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

        // Use the API key provided from the frontend (fetched from Firestore)
        // Or fallback to an environment variable if you prefer to store it in Netlify settings
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return { 
                statusCode: 401, 
                headers, 
                body: JSON.stringify({ error: 'Gemini API Key missing' }) 
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`;

        const prompt = `You are a professional SEO blog writer and digital marketer. 
        Write a comprehensive, high-authority blog post about "${topic}" in a ${tone || 'Professional'} tone. 
        
        Requirements:
        1. Originality: The content must be unique and appear plagiarism-free.
        2. SEO: Include a compelling meta title and description.
        3. Structure: Use H1 for the title, and H2/H3 tags for subheadings. Use bullet points and bold text where appropriate.
        4. Links: Suggest 2 high-authority external URLs (like Wikipedia, .gov, or .edu sites) relevant to the context.
        
        Format the response as a STICT VALID JSON object with the following keys:
        {
            "title": "The Blog Title",
            "content": "The full HTML body content",
            "meta_title": "SEO Optimized Title",
            "meta_description": "SEO Optimized Description (max 160 chars)",
            "tags": "tag1, tag2, tag3",
            "canonical_url": "https://example.com/blog-slug",
            "external_links": ["https://link1.com", "https://link2.com"]
        }`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gemini API Error');
        }

        const data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;

        // Clean up AI output in case it includes markdown code blocks
        const jsonContent = aiText.replace(/```json|```/gi, "").trim();

        return {
            statusCode: 200,
            headers,
            body: jsonContent
        };

    } catch (error) {
        console.error('Generator Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
