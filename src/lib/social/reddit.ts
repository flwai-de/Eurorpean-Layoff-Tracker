function getCredentials() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Reddit API credentials not configured");
  }

  return { clientId, clientSecret, username, password };
}

async function getAccessToken(
  creds: ReturnType<typeof getCredentials>,
): Promise<string> {
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Dimissio/1.0",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: creds.username,
      password: creds.password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Reddit auth error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function postToReddit(
  title: string,
  body: string,
  subreddit: string,
): Promise<{ postUrl: string }> {
  const creds = getCredentials();
  const token = await getAccessToken(creds);

  const response = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Dimissio/1.0",
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: "self",
      title,
      text: body,
      resubmit: "true",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Reddit API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    json: { data: { url: string } };
  };

  return { postUrl: data.json.data.url };
}
