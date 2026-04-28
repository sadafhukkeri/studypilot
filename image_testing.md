# Image Integration Testing Rules

- Always use base64-encoded images for tests
- Accepted formats: JPEG, PNG, WEBP only (no SVG/BMP/HEIC/GIF)
- Images must contain real visual features (objects, edges, textures)
- No blank/solid-color images
- Re-detect MIME after transformations
- For animated images, extract first frame only
- Resize large images to reasonable bounds
