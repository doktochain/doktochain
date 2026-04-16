import { useMemo } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

export interface AddressMapProps {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
  country?: string | null;
  height?: number;
  className?: string;
  showDirectionsLink?: boolean;
}

function buildFullAddress(props: AddressMapProps): string {
  const parts = [
    props.addressLine1,
    props.addressLine2 || '',
    `${props.city}, ${props.province}${props.postalCode ? ' ' + props.postalCode : ''}`,
    props.country || 'Canada',
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Renders an embedded map for a postal address.
 *
 * - If `VITE_GOOGLE_MAPS_EMBED_KEY` is set, uses Google Maps Embed (higher fidelity).
 * - Otherwise falls back to OpenStreetMap's free embed (no API key required).
 */
export default function AddressMap(props: AddressMapProps) {
  const { height = 220, className = '', showDirectionsLink = true } = props;
  const fullAddress = useMemo(() => buildFullAddress(props), [props]);
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined;

  const googleSrc = googleKey
    ? `https://www.google.com/maps/embed/v1/place?key=${googleKey}&q=${encodeURIComponent(fullAddress)}`
    : null;

  const osmSrc = !googleSrc
    ? `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&search=${encodeURIComponent(fullAddress)}`
    : null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  if (!props.addressLine1 || !props.city) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-muted/40 border border-dashed border-border text-muted-foreground ${className}`}
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          <span>Address not set</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-border bg-muted ${className}`}>
      {googleSrc ? (
        <iframe
          title={`Map of ${fullAddress}`}
          src={googleSrc}
          style={{ border: 0, width: '100%', height }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <iframe
          title={`Map of ${fullAddress}`}
          src={osmSrc!}
          style={{ border: 0, width: '100%', height }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      {showDirectionsLink && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 bg-white/95 dark:bg-gray-900/95 text-xs font-medium px-2 py-1 rounded-md shadow border border-border flex items-center gap-1 hover:bg-white dark:hover:bg-gray-900"
        >
          <ExternalLink className="w-3 h-3" />
          Directions
        </a>
      )}
    </div>
  );
}
