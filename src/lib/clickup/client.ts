const BASE_URL = "https://api.clickup.com/api/v2";

export class ClickUpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ClickUpError";
  }
}

function getToken(): string {
  const token = process.env.CLICKUP_TOKEN;
  if (!token) {
    throw new ClickUpError("CLICKUP_TOKEN is not configured", 500);
  }
  return token;
}

export async function clickup<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    next: init?.method && init.method !== "GET" ? undefined : { revalidate: 60 },
  });

  if (!res.ok) {
    let message = `ClickUp API error: ${res.status}`;
    try {
      const body = await res.json();
      if (body.err) message = body.err;
      else if (body.error) message = body.error;
    } catch {
      // use default message
    }
    throw new ClickUpError(message, res.status);
  }

  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

export function clickupErrorResponse(error: unknown): Response {
  if (error instanceof ClickUpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
