export type Platform = 'youtube' | 'linkedin' | 'instagram' | 'telegram' |'spotify' | 'whatsapp' | 'facebook' | 'reddit' | 'threads' | 'discord' | 'unknown';

export interface DeepLinkResult {
  webUrl: string;
  ios: string | null;
  android: string | null;
  platform: Platform;
}

export interface DeepLinkHandler {
  match(url: string): RegExpMatchArray | null;
  build(url: string, match: RegExpMatchArray): DeepLinkResult;
}
