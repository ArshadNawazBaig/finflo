window.addEventListener(
  'error',
  function (e) {
    if (
      e.message &&
      (e.message.includes('Importing a module script failed') ||
        e.message.includes('dynamic import'))
    ) {
      console.warn('Module load failed. Attempting automatic recovery...');
      if (window.navigator && navigator.serviceWorker) {
        navigator.serviceWorker
          .getRegistrations()
          .then(function (registrations) {
            for (let registration of registrations) {
              registration.unregister();
            }
            window.location.reload(true);
          });
      } else {
        window.location.reload(true);
      }
    }
  },
  true,
);
