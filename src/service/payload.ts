import { EWENTS_PAYLOAD } from "../utils/const";

interface PayloadResponse {
  id: string;
  message: string;
  expireAt: string;
}

interface PayloadPayload {
  peerId: string;
  scan: string;
  clientKey: string;
  session: string;
}

export const createPayload = async (payload: PayloadPayload, ttl = 3600) => {
  const postResponse = await fetch(`${EWENTS_PAYLOAD}/api/payload`, {
    method: 'POST',
    headers: {
      "x-client-key": atob(payload.clientKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payload: btoa(JSON.stringify(payload)),
      ttl,
    }),
  });

  if (!postResponse.ok) {
    const errorResponse = await postResponse.json();
    throw new Error(errorResponse.error || `POST request failed: ${postResponse.statusText}`);
  }

  const { id }: PayloadResponse = await postResponse.json();

  return id;
}

export const getPayload = async (id: string) => {
  const getResponse = await fetch(`${EWENTS_PAYLOAD}/api/payload/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!getResponse.ok) {
    const errorResponse = await getResponse.json();
    throw new Error(errorResponse.error || `GET request failed: ${getResponse.statusText}`);
  }

  const payload: PayloadPayload = await getResponse.json();

  return payload;
};

