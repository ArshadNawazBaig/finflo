const uploadKind = (url) => {
  const path = new URL(url, 'https://app.invalid').pathname.replace(/^\/api(?=\/)/, '');
  if (/^\/(members|loans)\/bulk-import$/.test(path)) return 'csv';
  if (path === '/ocr/process-id') return 'ocr';
  if (/^\/chat\/conversations\/[^/]+\/messages$/.test(path)) return 'chat';
  if (/^\/(auth|member-auth)\/update(profilepicture|businesslogo|businessstamp|ceosignature)$/.test(path)) return 'user';
  if (/^\/customers\/[^/]+\/documents$/.test(path)) return 'customer';
  if (path === '/loans/request' || /^\/loans\/my-loans\/[^/]+\/documents$/.test(path)) return 'loanDoc';
  if (/^\/tickets(?:\/|$)/.test(path)) return 'ticket';
  if (/^\/(branches|members|loans|system-settings)(?:\/|$)/.test(path)) return 'general';
  return null;
};

export const prepareDirectUploads = async (config, api, uploadFetch = fetch) => {
  if (!(config.data instanceof FormData)) return config;
  const kind = uploadKind(config.url);
  if (!kind) return config;
  const body = Object.create(null);
  const uploads = [];
  for (const [fieldname, value] of config.data.entries()) {
    if (value instanceof Blob) {
      const { data: signed } = await api.post('/uploads/sign', {
        kind, name: value.name, size: value.size, mimetype: value.type || 'application/octet-stream',
      });
      const form = new FormData();
      for (const [key, param] of Object.entries(signed.params)) form.append(key, String(param));
      form.append('file', value);
      const response = await uploadFetch(signed.url, {
        method: 'POST', body: form, credentials: 'omit', signal: config.signal,
      });
      if (!response.ok) throw new Error('File upload failed. Please try again.');
      uploads.push({ fieldname, proof: signed.proof });
    } else if (Object.hasOwn(body, fieldname)) {
      body[fieldname] = [].concat(body[fieldname], value);
    } else {
      body[fieldname] = value;
    }
  }
  body.__directUploads = uploads;
  config.data = body;
  if (config.headers?.set) config.headers.set('Content-Type', 'application/json');
  else config.headers = { ...config.headers, 'Content-Type': 'application/json' };
  return config;
};

export { uploadKind };
