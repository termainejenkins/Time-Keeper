import { app } from 'electron';
import { google } from 'googleapis';
import ElectronOauth2 from 'electron-oauth2';
import Store from 'electron-store';
import path from 'path';

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

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

const store = new Store<{ google_tokens: GoogleTokens }>({ name: 'google' });

export async function authenticateWithGoogleCalendar() {
  const oauth = ElectronOauth2(oauthConfig, windowParams);
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

export async function fetchGoogleCalendarEvents() {
  const tokens = store.get('google_tokens');
  if (!tokens) {
    throw new Error('No Google tokens available for authentication.');
  }
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
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