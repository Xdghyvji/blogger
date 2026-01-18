/**
 * Netlify Function: generate.js
 * Uses gemini-2.5-flash (Free Tier) to generate SEO-optimized blog content.
 * All logic is handled server-side using Netlify Environment Variables for security.
 */

exports.handler = async (event, context) => {
    // Enable CORS for frontend communication
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST requests for data generation
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    try {
        const { topic, tone } = JSON.parse(event.body);

        if (!topic) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ error: 'Topic is required' }) 
            };
        }

        // Retrieve API Key from Netlify Environment Variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 401, 
                headers, 
                body: JSON.stringify({ error: 'GEMINI_API_KEY not found in server environment.' }) 
            };
        }

        /**
         * Model: gemini-2.5-flash
         * Endpoint: v1beta
         */
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `You are a professional SEO blog writer. Write a detailed blog post about "${topic}" in a ${tone || 'Professional'} tone. 
        Return the response strictly as a VALID JSON object:
        {
            "title": "A catchy blog title",
            "content": "The blog body in HTML format (use <h2>, <p>, <ul> tags)",
            "meta_title": "SEO title under 60 chars",
            "meta_description": "SEO description under 160 chars",
            "tags": "comma, separated, keywords",
            "canonical_url": "https://example.com/blog-post",
            "external_links": ["https://authority-site.org"]
        }`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: data.error?.message || 'Gemini API Error' })
            };
        }

        // Extract the text part of the AI response
        const aiResponseText = data.candidates[0].content.parts[0].text;
        
        // Remove potential markdown wrappers like ```json ... ```
        const jsonString = aiResponseText.replace(/```json|```/gi, "").trim();

        return {
            statusCode: 200,
            headers,
            body: jsonString
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal Server Error: " + error.message })
        };
    }
};
