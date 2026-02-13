export const MapLoadingSkeleton = () => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-2">Loading map...</div>
        <div className="text-sm text-gray-500">Getting your location</div>
      </div>
    </div>
  );
};
