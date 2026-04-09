import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverAdapter } from "@/lib/queue/board";

const expressApp = serverAdapter.getRouter();

async function handler(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Convert Next.js request to something Express can handle
  return new Promise<Response>((resolve) => {
    const url = new URL(req.url);
    const method = req.method;

    // Build a minimal IncomingMessage-like object
    const fakeReq = {
      method,
      url: url.pathname + url.search,
      headers: Object.fromEntries(req.headers.entries()),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      on: () => fakeReq,
      pipe: () => fakeReq,
    } as unknown as import("http").IncomingMessage;

    // Build a minimal ServerResponse-like object
    let statusCode = 200;
    const responseHeaders = new Headers();
    const chunks: Buffer[] = [];

    const fakeRes = {
      statusCode,
      setHeader(name: string, value: string) {
        responseHeaders.set(name, value);
        return fakeRes;
      },
      getHeader(name: string) {
        return responseHeaders.get(name);
      },
      writeHead(code: number, headers?: Record<string, string>) {
        statusCode = code;
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            responseHeaders.set(k, v);
          }
        }
        return fakeRes;
      },
      write(chunk: string | Buffer) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      },
      end(chunk?: string | Buffer) {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks);
        resolve(
          new Response(body, {
            status: statusCode,
            headers: responseHeaders,
          }),
        );
      },
      on: () => fakeRes,
      once: () => fakeRes,
      emit: () => false,
      removeListener: () => fakeRes,
    } as unknown as import("http").ServerResponse;

    expressApp(fakeReq, fakeRes, () => {
      resolve(new Response("Not Found", { status: 404 }));
    });
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
