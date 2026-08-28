export const SWAGGER_UI_SECURITY_OPTIONS = Object.freeze({
  persistAuthorization: false,
  tryItOutEnabled: false,
  displayRequestDuration: true,
});

export const OPENAPI_SECURITY_NOTE =
  "Swagger/OpenAPI clients must not persist wallet or API authorization material between browser sessions.";
