import { DeepLinkHandler } from '../types';

/**
 * Parse Google Maps URL (SYNC version)
 */
function parseGoogleMapsUrl(url: string) {
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
            case 'search':
                query = parsed.query!;
                ios = `comgooglemaps://?q=${encodeURIComponent(query)}`;
                android = `geo:0,0?q=${encodeURIComponent(query)}`;
                break;

            case 'place':
                query = parsed.query || `${parsed.lat},${parsed.lng}`;
                ios = `comgooglemaps://?q=${encodeURIComponent(query)}`;
                android = `geo:${parsed.lat},${parsed.lng}?z=${parsed.zoom}`;
                break;

            case 'coords':
                query = `${parsed.lat},${parsed.lng}`;
                ios = `comgooglemaps://?center=${parsed.lat},${parsed.lng}&zoom=${parsed.zoom}`;
                android = `geo:${parsed.lat},${parsed.lng}?z=${parsed.zoom}`;
                break;

            case 'directions':
                query = parsed.query!;
                ios = `comgooglemaps://?daddr=${encodeURIComponent(query)}`;
                android = `geo:0,0?q=${encodeURIComponent(query)}`;
                break;

            default:
                ios = `comgooglemaps://`;
                android = `geo:0,0?q=`;
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
