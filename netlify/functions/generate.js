/**
 * Netlify Function: generate.js
 * Version: 7.0 - Authority Research Agent
 * Features: Google Search Grounding, Verified External Linking, Smart Link Mapping
 */

// Internal Link Map for SEO Injection
const LINK_MAP = {
    "TikTok": "/tiktok.html",
    "Instagram": "/instagram.html",
    "Email Extractor": "/email-tools.html",
    "Blog Writer": "/blog-tools.html",
    "SEO": "/blog-tools.html",
    "Twitter": "/twitter-tools.html",
    "Pricing": "/subscription.html",
    "Contact": "/contact.html"
};

// Supported model for Google Search Grounding
const MODEL = "gemini-2.5-flash-preview-09-2025";

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
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'GEMINI_API_KEY missing' }) };
        }

        // Endpoint for Gemini 2.5 with grounding support
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
        
        const systemPrompt = `You are an elite SEO researcher and journalist. Your goal is to write a high-authority blog post with verified data.
        
        STRICT FORMATTING RULES:
        - 1-2-3 Rule: Max 3 lines per paragraph.
        - Hierarchical Headings: H1 (Title), H2 (Sections), H3 (Sub-points).
        - Grounding: Use the Google Search tool to find 3-5 real, high-authority external URLs (e.g., Wikipedia, Forbes, Research papers) and include them as HTML anchors in the content.
        - Internal Linking: Naturally integrate these keywords if possible: ${Object.keys(LINK_MAP).join(', ')}.

        Return strictly as VALID JSON:
        {
            "title": "SEO Title",
            "content": "Full blog body in HTML with embedded external and internal links",
            "meta_title": "SEO Meta Title",
            "meta_description": "SEO Meta Description",
            "image_prompts": ["Cinematic photo of...", "Diagram showing...", "Professional render of..."],
            "slug": "url-slug",
            "tags": "tag1, tag2",
            "sources": [{"title": "Source Title", "uri": "URL"}]
        }`;

        const payload = {
            contents: [{ parts: [{ text: `Write a detailed 2000-word blog post about "${topic}" in a ${tone || 'Professional'} tone.` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ "google_search": {} }] // Enable Google Search grounding
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error?.message || 'Gemini API Error');
        }

        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const groundings = result.candidates?.[0]?.groundingMetadata?.groundingAttributions?.map(a => ({
            uri: a.web?.uri,
            title: a.web?.title
        })) || [];

        let blogData = JSON.parse(aiText.replace(/```json|```/gi, "").trim());

        // Attach verified sources to the blog data
        blogData.verified_sources = groundings;

        // Apply Internal Link Mapping
        Object.keys(LINK_MAP).forEach(keyword => {
            const regex = new RegExp(`(${keyword})(?![^<]*>|[^<>]*<\/a>)`, 'gi');
            blogData.content = blogData.content.replace(regex, `<a href="${LINK_MAP[keyword]}" class="text-blue-600 font-bold hover:underline">$1</a>`);
        });

        // Generate Pollinations.ai Images
        blogData.images = blogData.image_prompts.map((p, idx) => {
            const seed = Math.floor(Math.random() * 100000);
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=1200&height=630&nologo=true&seed=${seed}`;
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
