import { Helmet } from 'react-helmet-async';

/**
 * Reusable SEO component to manage meta tags dynamically.
 * @param {Object} props
 * @param {string} props.title - The page title
 * @param {string} props.description - The meta description
 * @param {string} [props.canonical] - The canonical URL
 * @param {string} [props.ogType] - Open Graph type (default: website)
 * @param {string} [props.ogImage] - Social sharing image URL
 */
const SEO = ({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
}) => {
  const siteName = 'FinFlo Banking OS';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription =
    'FinFlo Banking OS - Secure, cloud-native finance management system designed for global financial institutions.';
  const siteUrl = 'https://www.finflo.org/';
  const image =
    ogImage ||
    'https://res.cloudinary.com/dzfcf4sqf/image/upload/v1772965794/og_sbq9d7_fzsk4z.png';

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      {canonical && <link rel="canonical" href={`${siteUrl}${canonical}`} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta
        property="og:description"
        content={description || defaultDescription}
      />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={`${siteUrl}${canonical || ''}`} />
      <meta property="og:image" content={image} />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta
        name="twitter:description"
        content={description || defaultDescription}
      />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
