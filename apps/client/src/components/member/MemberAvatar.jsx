/* eslint-disable react/prop-types -- project convention: no propTypes */
import { memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// In-memory blocklist of image URLs that failed to load this session.
// Google's lh3.googleusercontent.com CDN rate-limits aggressively (429), and
// once a URL has failed we don't want every <MemberAvatar> instance on the
// page to keep retrying it on every re-render — that just makes the problem
// worse. We track failures globally so the *next* time we see the same URL
// we skip the <img> entirely and render the fallback directly.
const failedUrls = new Set();

/**
 * Renders a member's profile picture when available, falling back to a tinted
 * initial-letter tile. Centralizes the image-or-initial pattern so every
 * member-avatar surface (member card, guarantor row, teller spotlight, etc.)
 * looks the same and picks up image enhancements in one place.
 *
 * Props:
 *   - name           string  — used for the initial fallback (first non-space char)
 *   - profilePicture string  — optional image URL
 *   - size           number  — pixel size, default 40 (≈ h-10 w-10)
 *   - rounded        string  — Tailwind rounded utility, default 'rounded-2xl'
 *   - className      string  — wrapper override
 *   - textClassName  string  — initial-letter text override
 *   - fallback       node    — optional element shown when no name AND no image
 */
const MemberAvatar = ({
  name = '',
  profilePicture = '',
  size = 40,
  rounded = 'rounded-2xl',
  className = '',
  textClassName = '',
  fallback = null,
}) => {
  const dimension = { width: size, height: size };
  const initial = (name || '').trim().charAt(0).toUpperCase();
  const [errored, setErrored] = useState(() =>
    profilePicture ? failedUrls.has(profilePicture) : false,
  );

  // If the URL prop changes (e.g. parent re-renders with a different member),
  // re-check the blocklist against the new URL.
  useEffect(() => {
    setErrored(profilePicture ? failedUrls.has(profilePicture) : false);
  }, [profilePicture]);

  const showImage = profilePicture && !errored;

  if (showImage) {
    return (
      <img
        src={profilePicture}
        alt={name || 'Member'}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => {
          failedUrls.add(profilePicture);
          setErrored(true);
        }}
        style={dimension}
        className={cn(
          rounded,
          'object-cover shrink-0 ring-1 ring-slate-100 dark:ring-white/[0.06]',
          className,
        )}
      />
    );
  }

  return (
    <div
      style={dimension}
      className={cn(
        rounded,
        'shrink-0 flex items-center justify-center bg-primary/10 text-primary font-extrabold',
        className,
      )}
    >
      {fallback || (
        <span className={cn('leading-none', textClassName)}>
          {initial || '?'}
        </span>
      )}
    </div>
  );
};

// Rendered in nearly every list row and card across the app (21 import sites),
// so a parent re-render would otherwise re-run every avatar. Props are all
// primitives → React.memo's shallow compare skips re-renders when they're equal.
export default memo(MemberAvatar);
