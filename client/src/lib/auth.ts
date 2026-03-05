const SESSION_KEY = 'leoni-auth-session';

const CREDENTIALS = {
  username: 'Amine',
  password: 'pfe',
};

export interface AuthSession {
  username: string;
  loginAt: string;
}

export const auth = {
  login(username: string, password: string): boolean {
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      const session: AuthSession = { username, loginAt: new Date().toISOString() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
