import { DeepLinkHandler } from '../types';

/**
 * Check if URL is a Google Maps short URL
 */
function isShortUrl(url: string): boolean {
    return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url);
}

/**
 * Parse Google Maps URL (SYNC version)
 */
function parseGoogleMapsUrl(url: string) {
    // Handle short URLs - they can't be parsed synchronously
    if (isShortUrl(url)) {
        return { type: 'shorturl' };
    }

    try {
        const apiUrl = new URL(url);
        const qp = apiUrl.searchParams;

        // 1. API=1 query
        if (qp.get('query')) {
            return { type: 'search', query: qp.get('query')! };
        }

        // 2. Search path
        const searchMatch = url.match(/\/maps\/search\/([^/?#]+)/);
        if (searchMatch) {
            return { type: 'search', query: decodeURIComponent(searchMatch[1]) };
        }

        // 3. Directions
        const dirMatch = url.match(/\/maps\/dir\/([^/]+)\/([^/?#]+)/);
        if (dirMatch) {
            const start = decodeURIComponent(dirMatch[1]);
            const end = decodeURIComponent(dirMatch[2]);
            return { type: 'directions', query: `${start} to ${end}` };
        }

        // 4. Place
        const placeMatch = url.match(
            /\/maps\/place\/([^/@]+)\/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)([mz])/
        );
        if (placeMatch) {
            return {
                type: 'place',
                query: decodeURIComponent(placeMatch[1]),
                lat: placeMatch[2],
                lng: placeMatch[3],
                zoom: convertZoom(placeMatch[4], placeMatch[5]),
            };
        }

        // 5. Coordinates
        const coordsMatch = url.match(
            /\/maps\/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)([mz])/
        );
        if (coordsMatch) {
            return {
                type: 'coords',
                lat: coordsMatch[1],
                lng: coordsMatch[2],
                zoom: convertZoom(coordsMatch[3], coordsMatch[4]),
            };
        }
    } catch (e) {
        // If URL parsing fails, return unknown
    }

    return { type: 'unknown' };
}

/** Convert meters to zoom */
function convertZoom(value: string, unit: string): string {
    if (unit === 'z') return value;
    const meters = parseFloat(value);
    const zoom = Math.round(18 - Math.log2(meters / 500));
    return String(Math.max(1, Math.min(20, zoom)));
}

export const googlemapsHandler: DeepLinkHandler = {
    match: (url) => {
        const patterns = [
            /^https?:\/\/(?:www\.)?google\.com\/maps/,
            /^https?:\/\/maps\.google\.com/,
            /^https?:\/\/maps\.app\.goo\.gl/,
            /^https?:\/\/goo\.gl\/maps/,
        ];

        for (const pattern of patterns) {
            const m = url.match(pattern);
            if (m) return m;
        }

        return null;
    },

    build: (webUrl, match) => {
        const parsed = parseGoogleMapsUrl(webUrl);

        let ios = '';
        let android = '';
        let query = '';

        switch (parsed.type) {
            case 'shorturl':
                // For short URLs, use the URL directly with Google Maps schemes
                // Google Maps apps can handle these short URLs
                ios = `comgooglemaps://?url=${encodeURIComponent(webUrl)}`;
                // Android intent to open the short URL in Google Maps app
                const commonDeepLink = `https://${webUrl.replace(/^https?:\/\//, '')}`;
                return {
                    platform: 'googlemaps',
                    webUrl: webUrl,
                    ios: commonDeepLink,
                    android: commonDeepLink,
                };

            case 'search':
                query = parsed.query!;
                ios = `comgooglemaps://?q=${encodeURIComponent(query)}`;
                // Android intent using geo scheme to open search in Google Maps app
                const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                android = `intent://0,0?q=${encodeURIComponent(query)}#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(searchUrl)};end`;
                break;

            case 'place':
                query = parsed.query || `${parsed.lat},${parsed.lng}`;
                ios = `comgooglemaps://?q=${encodeURIComponent(query)}`;
                // Android intent using geo scheme to open place in Google Maps app
                const placeUrl = `https://www.google.com/maps/place/${encodeURIComponent(query)}/@${parsed.lat},${parsed.lng},${parsed.zoom}z`;
                android = `intent://${parsed.lat},${parsed.lng}?q=${encodeURIComponent(query)}#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(placeUrl)};end`;
                break;

            case 'coords':
                query = `${parsed.lat},${parsed.lng}`;
                ios = `comgooglemaps://?center=${parsed.lat},${parsed.lng}&zoom=${parsed.zoom}`;
                // Android intent using geo scheme to open coordinates in Google Maps app
                const coordsUrl = `https://www.google.com/maps/@${parsed.lat},${parsed.lng},${parsed.zoom}z`;
                android = `intent://${parsed.lat},${parsed.lng}?z=${parsed.zoom}#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(coordsUrl)};end`;
                break;

            case 'directions':
                query = parsed.query!;
                ios = `comgooglemaps://?daddr=${encodeURIComponent(query)}`;
                // Android intent using geo scheme to open directions in Google Maps app
                // Parse start and end from the directions query
                const dirParts = query.split(' to ');
                const dirStart = dirParts[0] || '';
                const dirEnd = dirParts[1] || dirParts[0] || '';
                const directionsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(dirStart)}/${encodeURIComponent(dirEnd)}`;
                android = `intent://0,0?q=${encodeURIComponent(query)}#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(directionsUrl)};end`;
                break;

            default:
                ios = `comgooglemaps://`;
                // Android intent using geo scheme to open Google Maps app
                const defaultUrl = 'https://www.google.com/maps';
                android = `intent://0,0#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(defaultUrl)};end`;
        }

        const normalizedWebUrl = query
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
            : webUrl;

        return {
            platform: 'googlemaps',
            webUrl: normalizedWebUrl,
            ios,
            android,
        };
    },
};
