import api from '../api/axios';

/**
 * Tracks a visit to the application.
 * Uses sessionStorage to ensuring a 'VISIT' log is only sent once per browser session.
 */
export const trackVisit = async (path: string = window.location.pathname) => {
  try {
    const sessionKey = 'lakbay_session_visited';
    
    // Check if we already logged a visit this session
    if (sessionStorage.getItem(sessionKey)) {
      return; 
    }

    // Attempt to log visit
    await api.post('/api/activity-logs/visit', { path });
    
    // Mark as logged for this session
    sessionStorage.setItem(sessionKey, 'true');
  } catch (err) {
    // Fail silently to not disrupt user experience
    console.warn('Visit tracking failed:', err);
  }
};
