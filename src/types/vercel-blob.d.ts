declare module "@vercel/blob" {
    export function put(
      path: string,
      data: Blob | File | ArrayBuffer | string,
      options?: {
        access?: "public" | "private";
        addRandomSuffix?: boolean;
        token?: string;
        contentType?: string;
      }
    ): Promise<{
      url: string;
      pathname: string;
    }>;
  }
  