const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Use the default in-memory session store (no SQLite or file system needed)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;

app.post('/auth', async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const { access_token } = tokenResponse.data;
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const guildMemberResponse = await axios.get(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const hasAccess = guildMemberResponse.data.roles.includes(REQUIRED_ROLE_ID);

        req.session.user = {
            id: userResponse.data.id,
            username: userResponse.data.username,
            access: hasAccess,
        };

        res.json({ access: hasAccess });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

app.get('/check-auth', (req, res) => {
    if (req.session.user && req.session.user.access) {
        res.json({ access: true });
    } else {
        res.json({ access: false });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
