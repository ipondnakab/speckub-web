import { inject } from '@vercel/analytics';

inject();

// Keep existing shared repository/branch/endpoint URLs working.
if (new URLSearchParams(location.search).has("repo")) {
  void import("./main");
} else {
  void import("./home");
}
