import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Discord developer credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://feoservices.site/auth/discord/callback";

// Configure CORS specifically to authorize your frontend workstation and permit headers
app.use(cors({
    origin: ['https://feoservices.site', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Express middleware to parse incoming JSON bodies (MUST be active before routes)
app.use(express.json());

// Main Authentication Exchange Endpoint
app.post('/auth/discord/exchange', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Authorization code parameter is missing from the payload." });
    }

    try {
        console.log(`[OAuth Exchange] Received exchange request for code: ${code.substring(0, 5)}...`);

        // 1. Exchange OAuth code for a secure Access Token via application/x-www-form-urlencoded
        const tokenParams = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI
        });

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams
        });

        if (!tokenResponse.ok) {
            const errorDetails = await tokenResponse.json();
            console.error("[OAuth Exchange Error] Discord token exchange failed:", errorDetails);
            return res.status(tokenResponse.status).json({
                error: "Exchange gateway rejected code verification.",
                details: errorDetails
            });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        console.log("[OAuth Exchange] Token acquired. Fetching Discord user profile...");

        // 2. Fetch the authorized user profile from Discord using the Bearer token
        const profileResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!profileResponse.ok) {
            const profileError = await profileResponse.text();
            console.error("[OAuth Exchange Error] Discord user fetch failed:", profileError);
            return res.status(profileResponse.status).json({ error: "Failed to extract authenticated user profile." });
        }

        const userData = await profileResponse.json();
        console.log(`[OAuth Exchange] Profile parsed successfully for user: ${userData.username}`);

        // 3. Return the payload safely back to the frontend
        return res.json({
            user: userData
        });

    } catch (error) {
        console.error("[OAuth Exchange Critical Exception] Backend server crash prevented:", error);
        return res.status(500).json({ error: "Internal Auth Gateway Server Failure." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`[Gate Server] Listening on port ${PORT}`);
    console.log(`[Gate Server] Exchange route registered: POST /auth/discord/exchange`);
    console.log(`===================================================`);
});