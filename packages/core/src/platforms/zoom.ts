import { DeepLinkHandler } from '../types';

/**
 * Zoom Meeting Deep Link Handler
 *
 * Supports:
 * - Meeting links: https://zoom.us/j/1234567890
 * - Meeting links with password: https://zoom.us/j/1234567890?pwd=abcdef
 * - Meeting links from subdomains: https://us02web.zoom.us/j/1234567890
 *
 * Deep link schemes:
 * - iOS: zoomus://zoom.us/join?confno=<meeting_id>&pwd=<password>
 * - Android: intent://zoom.us/join?confno=<meeting_id>&pwd=<password>#Intent;scheme=zoomus;package=us.zoom.videomeetings;end
 */
export const zoomHandler: DeepLinkHandler = {
  match: (url) => {
    // Match zoom.us/j/<meeting_id> or *.zoom.us/j/<meeting_id>
    return url.match(/^https?:\/\/(?:[a-z0-9-]+\.)?zoom\.us\/j\/(\d+)(?:\?pwd=([a-zA-Z0-9]+))?/);
  },

  build: (webUrl, match) => {
    const meetingId = match[1];
    const password = match[2] || '';

    // Build the deep link path
    let deepLinkParams = `confno=${meetingId}`;
    if (password) {
      deepLinkParams += `&pwd=${password}`;
    }

    return {
      webUrl,
      ios: `zoomus://zoom.us/join?${deepLinkParams}`,
      android: `intent://zoom.us/join?${deepLinkParams}#Intent;scheme=zoomus;package=us.zoom.videomeetings;end`,
      platform: 'zoom',
    };
  },
};
