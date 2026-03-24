import { useEffect } from 'react';

const SITE_NAME = 'finflo';

/**
 * Sets the browser tab title. Resets to site name on unmount.
 * @param {string} title - The page title (e.g. "Login")
 */
const useDocumentTitle = (title) => {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${SITE_NAME}`;
    }
    return () => {
      document.title = SITE_NAME;
    };
  }, [title]);
};

export default useDocumentTitle;
