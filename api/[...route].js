import { createApp } from "../backend/src/app.js";

const app = createApp({
  apiPrefix: "",
  serveFrontend: false,
});

export default function handler(request, response) {
  if (request.url === "/api") {
    request.url = "/";
  } else if (request.url.startsWith("/api/")) {
    request.url = request.url.slice(4) || "/";
  }

  return app(request, response);
}
