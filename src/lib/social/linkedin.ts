const API_URL = "https://api.linkedin.com/v2/ugcPosts";

function getCredentials() {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    throw new Error("LinkedIn API credentials not configured");
  }

  return { accessToken, personUrn };
}

export async function postToLinkedIn(text: string): Promise<{ postUrl: string }> {
  const { accessToken, personUrn } = getCredentials();

  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  // UGC post URN → shareable URL
  const postId = data.id.split(":").pop() ?? data.id;
  return { postUrl: `https://www.linkedin.com/feed/update/${data.id ?? postId}` };
}
