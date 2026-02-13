import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface UserLocationMarkerProps {
  lat: number;
  lng: number;
}

export const UserLocationMarker = ({ lat, lng }: UserLocationMarkerProps) => {
  const [icon, setIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    // Get primary color from Versaur design system
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary')
      .trim() || '#3b82f6';

    // Create custom icon using Versaur colors
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: white;
          border: 3px solid ${primaryColor};
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: ${primaryColor};
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });

    setIcon(userIcon);
  }, []);

  if (!icon) return null;

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div className="text-sm">
          <strong>Your Location</strong>
          <br />
          <span className="text-gray-600">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>
      </Popup>
    </Marker>
  );
};
