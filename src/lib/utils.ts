export const isAllowedWebhookUrl = (url: URL): boolean => {
  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '0:0:0:0:0:0:0:1',
  ];
  
  if (localhostPatterns.some(pattern => hostname === pattern || hostname.startsWith(pattern + '.'))) {
    return false;
  }


  const privateIPv4Ranges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
  ];

  if (privateIPv4Ranges.some(pattern => pattern.test(hostname))) {
    return false;
  }


  const privateIPv6Patterns = [
    /^fe80:/i,      // Link-local
    /^fc00:/i,      // Unique local addresses
    /^fd00:/i,      // Unique local addresses
    /^ff00:/i,      // Multicast
  ];

  if (privateIPv6Patterns.some(pattern => pattern.test(hostname))) {
    return false;
  }


  const blockedTLDs = [
    '.local',
    '.internal',
    '.localhost',
    '.test',
    '.example',
    '.invalid',
  ];

  if (blockedTLDs.some(tld => hostname.endsWith(tld))) {
    return false;
  }


  const metadataEndpoints = [
    '169.254.169.254',
    'metadata.google.internal',
    'metadata',
  ];

  if (metadataEndpoints.includes(hostname)) {
    return false;
  }


  const internalDnsPatterns = [
    /^(.*\.)?internal$/i,
    /^(.*\.)?corp$/i,
    /^(.*\.)?intranet$/i,
    /^(.*\.)?lan$/i,
  ];

  if (internalDnsPatterns.some(pattern => pattern.test(hostname))) {
    return false;
  }

  if (hostname.startsWith('[') && hostname.includes(':')) {
    const ipv6 = hostname.slice(1, -1);
    if (privateIPv6Patterns.some(pattern => pattern.test(ipv6))) {
      return false;
    }
  }


  return true;
};


export const validateWebhookUrl = (urlString: string): { valid: boolean; url?: URL; error?: string } => {
  try {
    const url = new URL(urlString);
    
    if (!isAllowedWebhookUrl(url)) {
      return {
        valid: false,
        error: 'Webhook URL targets a disallowed destination (private network, localhost, or internal domain)',
      };
    }

    return { valid: true, url };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
};
