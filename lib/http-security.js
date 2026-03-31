const { randomUUID } = require('crypto');

function createRequestIdMiddleware() {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  };
}

function createSecurityHeadersMiddleware() {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
    );
    next();
  };
}

function createCorsMiddleware(allowedOrigins = []) {
  const originSet = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (!origin || originSet.size === 0 || originSet.has(origin)) {
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  };
}

function createRateLimitMiddleware({ windowMs, maxRequests, keyPrefix = 'global' }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const current = buckets.get(key);

    if (!current || current.expiresAt <= now) {
      buckets.set(key, {
        count: 1,
        expiresAt: now + windowMs
      });
      return next();
    }

    current.count += 1;
    buckets.set(key, current);

    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((current.expiresAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Muitas tentativas em sequência. Aguarde um instante e tente novamente.'
      });
    }

    return next();
  };
}

module.exports = {
  createCorsMiddleware,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createSecurityHeadersMiddleware
};
