/**
 * Standardizes every JSON response from the main `/api` router into a consistent
 * envelope, on the way out, without touching individual controllers:
 *
 *   success (status < 400):  res.json(payload)        → { success: true,  data: payload }
 *   error   (status >= 400): res.json({ message, … })  → { success: false, message, … }
 *
 * Controllers keep calling `res.json(...)` exactly as before — this wraps the
 * output. The web/mobile client unwraps it transparently in `@/lib/axios`, so
 * existing pages read `res.data` / `res.data.data` unchanged; new/external
 * consumers get a predictable shape (`success` flag + `data`/`message`).
 *
 * Mounted on the main `/api` routes only — AFTER the raw-body Stripe webhook (so
 * the webhook response is left untouched) and after express.json/sanitize.
 *
 * `res.send` / `res.download` / `res.redirect` / `res.end` are intentionally not
 * wrapped (file/stream/redirect responses stay raw). Wrapping is applied once
 * and guarded against double-enveloping.
 */
const responseEnvelope = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Don't re-wrap something already enveloped (defensive; controllers don't
    // normally do this, but a passthrough/proxy handler might).
    if (body && typeof body === 'object' && typeof body.success === 'boolean') {
      return originalJson(body);
    }

    if (res.statusCode >= 400) {
      const payload =
        body && typeof body === 'object' && !Array.isArray(body)
          ? body
          : { message: body };
      return originalJson({ success: false, ...payload });
    }

    return originalJson({ success: true, data: body });
  };

  next();
};

module.exports = responseEnvelope;
