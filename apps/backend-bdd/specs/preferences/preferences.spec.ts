import { test, expect } from "@fixtures/index";

/**
 * Jakarta test location for geo-cache refresh tests
 * Using Jakarta coordinates as test reference point
 */
const JAKARTA_LOCATION = {
  name: "Jakarta City Center",
  latitude: -6.2088,
  longitude: 106.8456,
};

test.describe("Preferences - Geo Cache Refresh", () => {
  test("POST /preferences/refresh-geo-cache - refresh with coordinates", async ({
    preferenceAPI,
  }) => {
    const res = await preferenceAPI.refreshGeoCache({
      latitude: JAKARTA_LOCATION.latitude,
      longitude: JAKARTA_LOCATION.longitude,
    });

    // Backend returns 204 No Content for async operations
    expect(res.status).toBe(204);
  });

  test("POST /preferences/refresh-geo-cache - refresh without coordinates", async ({
    preferenceAPI,
  }) => {
    const res = await preferenceAPI.refreshGeoCache();

    // Should accept empty body (both coords optional)
    expect(res.status).toBe(204);
  });

  test("POST /preferences/refresh-geo-cache - refresh with only latitude (invalid)", async ({
    preferenceAPI,
  }) => {
    const res = await preferenceAPI.refreshGeoCache({
      latitude: JAKARTA_LOCATION.latitude,
      longitude: null,
    });

    // Backend should still accept (both are optional fields)
    expect(res.status).toBe(204);
  });

  test("POST /preferences/refresh-geo-cache - refresh with only longitude (invalid)", async ({
    preferenceAPI,
  }) => {
    const res = await preferenceAPI.refreshGeoCache({
      latitude: null,
      longitude: JAKARTA_LOCATION.longitude,
    });

    // Backend should still accept (both are optional fields)
    expect(res.status).toBe(204);
  });
});
