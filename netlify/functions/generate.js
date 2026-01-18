/**
 * Netlify Function: generate.js
 * Uses gemini-2.5-flash for SEO content and Pollinations.ai for image generation.
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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { topic, tone } = JSON.parse(event.body);
        if (!topic) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Topic is required' }) };

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return { statusCode: 401, headers, body: JSON.stringify({ error: 'GEMINI_API_KEY missing' }) };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `You are an elite SEO strategist. Write a comprehensive blog post about "${topic}" in a ${tone || 'Professional'} tone. 
        
        STRICT RULES:
        1. STRUCTURE: Min 1500 words. 1-2-3 paragraph rule. Use H1, H2, H3. Bold key terms.
        2. SEO: Meta title (50-60 chars), Meta description (120-155 chars). Primary keyword in first 100 words.
        3. IMAGES: You must create 3 highly descriptive image prompts related to the content.
        
        Return strictly as VALID JSON:
        {
            "title": "SEO Title",
            "content": "Full blog body in HTML",
            "meta_title": "SEO Meta Title",
            "meta_description": "SEO Meta Description",
            "image_prompts": [
                "A cinematic high-resolution shot of...",
                "A professional 3d render representing...",
                "A wide-angle atmospheric photography of..."
            ],
            "slug": "url-slug",
            "tags": "tag1, tag2",
            "category": "Category"
        }`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'API Error');

        const aiText = data.candidates[0].content.parts[0].text;
        const blogData = JSON.parse(aiText.replace(/```json|```/gi, "").trim());

        // Generate Pollinations.ai URLs based on AI prompts
        // We use a seed and dimensions for better results
        blogData.images = blogData.image_prompts.map(p => {
            const encodedPrompt = encodeURIComponent(p);
            return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(blogData)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
