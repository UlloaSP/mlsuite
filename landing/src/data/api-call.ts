// A real call to the demo client's bookmark on the live instance (key elided; the key is revoked).
export const request = `POST /api/v1/bookmarks/efa17390-…/predictions
X-MLSuite-Key: mls_…
Content-Type: application/json

{"features": {
  "bill_length_mm": 48.7, "bill_depth_mm": 14.1,
  "flipper_length_mm": 210,
  "island__Biscoe": 1, "island__Dream": 0,
  "island__Torgersen": 0,
  "sex__female": 1, "sex__male": 0
}}`;

export const response = `{
  "requestId": "2eb799f0-8c0c-43d8-ad8d-78b9ee0f1b47",
  "bookmark": { "id": "efa17390-…", "name": "species-api" },
  "snapshot": { "version": 1, "name": "v1" },
  "model": {
    "name": "Penguin Species",
    "sha256": "f90d67af0136ba47…5f161dec977f8"
  },
  "outputs": [{
    "prediction": "Gentoo",
    "probabilities": { "Adelie": 0.0, "Chinstrap": 0.0, "Gentoo": 1.0 }
  }]
}`;
