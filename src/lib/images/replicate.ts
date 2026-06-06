import Replicate from "replicate";

function getReplicateClient() {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    throw new Error("Replicate API token is not configured.");
  }

  return new Replicate({
    auth: token
  });
}

async function outputToBuffer(output: unknown): Promise<Buffer> {
  if (output && typeof output === "object" && "blob" in output) {
    const blob = await (output as { blob: () => Promise<Blob> }).blob();
    return Buffer.from(await blob.arrayBuffer());
  }

  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url: () => string }).url();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to download Replicate output.");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (typeof output === "string") {
    const response = await fetch(output);
    if (!response.ok) {
      throw new Error("Failed to download Replicate output.");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("Replicate returned an unsupported output format.");
}

export async function removeBackground(imageUrl: string): Promise<Buffer> {
  const replicate = getReplicateClient();
  const output = await replicate.run("bria/remove-background", {
    input: {
      image: imageUrl,
      preserve_alpha: true,
      content_moderation: false
    }
  });

  return outputToBuffer(output);
}
