"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWithGoogleCalendar = authenticateWithGoogleCalendar;
exports.fetchGoogleCalendarEvents = fetchGoogleCalendarEvents;
const googleapis_1 = require("googleapis");
const electron_oauth2_1 = __importDefault(require("electron-oauth2"));
const electron_store_1 = __importDefault(require("electron-store"));
// Load credentials from environment or config
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost'; // Electron desktop app
const oauthConfig = {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    useBasicAuthorizationHeader: false,
    redirectUri: REDIRECT_URI,
};
const windowParams = {
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
        nodeIntegration: false,
    },
};
const store = new electron_store_1.default({ name: 'google' });
async function authenticateWithGoogleCalendar() {
    const oauth = (0, electron_oauth2_1.default)(oauthConfig, windowParams);
    let tokens = store.get('google_tokens');
    if (!tokens) {
        tokens = await oauth.getAccessToken({
            scope: [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
            ],
        });
        store.set('google_tokens', tokens);
    }
    return tokens;
}
async function fetchGoogleCalendarEvents() {
    const tokens = store.get('google_tokens');
    if (!tokens) {
        throw new Error('No Google tokens available for authentication.');
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials(tokens);
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();
    const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });
    return res.data.items || [];
}
