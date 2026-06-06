"use client";

import {
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
  Trash2,
  Upload
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Badge, Button, Card, EmptyState } from "./ui";
import type { UplaneImage } from "@/lib/images/types";

type Notice = {
  tone: "success" | "danger" | "neutral";
  message: string;
};

function statusTone(status: UplaneImage["status"]) {
  if (status === "complete") return "success";
  if (status === "processing") return "warning";
  if (status === "failed" || status === "deleted") return "danger";
  return "neutral";
}

function stageLabel(image: UplaneImage | null) {
  if (!image?.processedUrl) return "Processing has not completed";
  if (image.processedStage === "flipped") return "Final image ready";
  if (image.processedStage === "background_removed") return "Removing background";
  return "Processing";
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Request failed.";
}

export function ImageTransformApp() {
  const [images, setImages] = useState<UplaneImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );

  const upsertImage = useCallback((image: UplaneImage) => {
    setImages((current) => {
      const next = current.filter((item) => item.id !== image.id);
      return [image, ...next].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    setSelectedId(image.id);
  }, []);

  const showNotice = useCallback((message: string, tone: Notice["tone"] = "neutral") => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadImages = useCallback(async () => {
    const response = await fetch("/api/images");
    if (!response.ok) {
      showNotice(await readError(response), "danger");
      return;
    }

    const body = (await response.json()) as { images: UplaneImage[] };
    setImages(body.images);
    setSelectedId((current) => current ?? body.images[0]?.id ?? null);
  }, [showNotice]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/images")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readError(response));
        }
        return (await response.json()) as { images: UplaneImage[] };
      })
      .then((body) => {
        if (cancelled) return;
        setImages(body.images);
        setSelectedId(body.images[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        showNotice(error instanceof Error ? error.message : "Could not load images.", "danger");
      });

    return () => {
      cancelled = true;
    };
  }, [showNotice]);

  const uploadFile = useCallback(
    async (file: File) => {
      setBusyAction("upload");
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/images", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const body = (await response.json()) as { image: UplaneImage };
        upsertImage(body.image);
        showNotice("Image processed.", "success");
      } catch (error) {
        showNotice(error instanceof Error ? error.message : "Processing failed.", "danger");
        await loadImages();
      } finally {
        setBusyAction(null);
      }
    },
    [loadImages, showNotice, upsertImage]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
        void uploadFile(file);
      }
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"]
    },
    maxFiles: 1,
    noClick: true,
    maxSize: 8 * 1024 * 1024,
    onDropRejected: () => {
      showNotice("Upload one PNG, JPEG, or WebP image under 8 MB.", "danger");
    }
  });

  const deleteImage = useCallback(
    async (image: UplaneImage) => {
      const confirmed = window.confirm(
        "Delete this image and all generated versions from storage?"
      );
      if (!confirmed) return;

      setBusyAction(`delete-${image.id}`);

      try {
        const response = await fetch(`/api/images/${image.id}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        setImages((current) => current.filter((item) => item.id !== image.id));
        setSelectedId((current) => (current === image.id ? null : current));
        showNotice("Image deleted.", "success");
      } catch (error) {
        showNotice(error instanceof Error ? error.message : "Delete failed.", "danger");
      } finally {
        setBusyAction(null);
      }
    },
    [showNotice]
  );

  const copyProcessedUrl = useCallback(async () => {
    if (!selectedImage?.processedUrl) return;
    await navigator.clipboard.writeText(selectedImage.processedUrl);
    showNotice("Final URL copied.", "success");
  }, [selectedImage, showNotice]);

  const isProcessing = selectedImage?.status === "processing";
  const isUploading = busyAction === "upload";
  const canShare =
    Boolean(selectedImage?.processedUrl) &&
    selectedImage?.status === "complete" &&
    !isProcessing &&
    !isUploading;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Uplane image service</p>
          <h1>Image Transform</h1>
        </div>
        <a
          className="github-link"
          href="https://github.com/sivze/int-projects/tree/assignment/uplane"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </header>

      {notice ? <div className={`notice notice-${notice.tone}`}>{notice.message}</div> : null}

      <div className="workspace-grid">
        <div className="main-column">
          <Card>
            <div className="card-heading">
              <div>
                <h2>Upload image</h2>
                <p>Upload starts background removal and horizontal flip automatically.</p>
              </div>
              {isUploading ? <Loader2 className="spin" size={20} /> : null}
            </div>

            <div
              {...getRootProps({
                className: `dropzone${isDragActive ? " dropzone-active" : ""}`
              })}
            >
              <input {...getInputProps()} />
              <Upload size={28} aria-hidden="true" />
              <strong>{isDragActive ? "Drop the image" : "Drag an image here"}</strong>
              <span>PNG, JPEG, or WebP up to 8 MB.</span>
              <Button type="button" variant="secondary" onClick={open} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    Processing
                  </>
                ) : (
                  "Choose file"
                )}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <h2>Final output</h2>
                <p>Background removed, horizontally flipped, and hosted as a PNG.</p>
              </div>
              {selectedImage ? (
                <Badge tone={statusTone(selectedImage.status)}>{selectedImage.status}</Badge>
              ) : null}
            </div>

            {isUploading ? (
              <div className="pipeline-note">
                <Loader2 className="spin" size={18} />
                Uploading, removing background, and flipping horizontally.
              </div>
            ) : null}

            <div className="action-row">
              <Button
                type="button"
                variant="primary"
                onClick={copyProcessedUrl}
                disabled={!canShare}
              >
                <Clipboard size={18} />
                Copy final URL
              </Button>
              {selectedImage?.processedUrl ? (
                <a
                  className="button button-secondary"
                  href={selectedImage.processedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={18} aria-hidden="true" />
                  Open final image
                </a>
              ) : null}
              <Button
                type="button"
                variant="danger"
                onClick={() => selectedImage && void deleteImage(selectedImage)}
                disabled={!selectedImage || busyAction !== null}
              >
                <Trash2 size={18} />
                Delete image set
              </Button>
            </div>

            <div className="url-panel">
              <span>Final URL</span>
              <code>{selectedImage?.processedUrl ?? "Available after processing"}</code>
            </div>

            {selectedImage?.error ? (
              <div className="inline-alert">{selectedImage.error}</div>
            ) : null}
          </Card>

          <div className="preview-grid">
            <PreviewCard
              title="Final processed image"
              subtitle={stageLabel(selectedImage)}
              url={selectedImage?.processedUrl ?? null}
            />
            <PreviewCard
              title="Original upload"
              subtitle="Reference"
              url={selectedImage?.originalUrl ?? null}
            />
          </div>
        </div>

        <Card className="history-card">
          <div className="card-heading">
            <div>
              <h2>Recent images</h2>
              <p>Select an item to preview its final image.</p>
            </div>
          </div>

          <div className="history-list">
            {images.length === 0 ? (
              <EmptyState>No images yet.</EmptyState>
            ) : (
              images.map((image) => (
                <button
                  type="button"
                  className={`history-item${image.id === selectedImage?.id ? " history-item-active" : ""}`}
                  key={image.id}
                  onClick={() => setSelectedId(image.id)}
                >
                  <span className="history-thumb">
                    <Image
                      src={image.processedUrl ?? image.originalUrl}
                      alt=""
                      fill
                      sizes="56px"
                    />
                  </span>
                  <span className="history-meta">
                    <strong>{image.originalFileName}</strong>
                    <span>{stageLabel(image)}</span>
                    <Badge tone={statusTone(image.status)}>{image.status}</Badge>
                  </span>
                  {busyAction === `delete-${image.id}` ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Check size={18} aria-hidden="true" />
                  )}
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

function PreviewCard({
  title,
  subtitle,
  url
}: {
  title: string;
  subtitle?: string;
  url: string | null;
}) {
  return (
    <Card className="preview-card">
      <div className="preview-heading">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="preview-frame">
        {url ? (
          <Image src={url} alt={`${title} image`} fill sizes="(max-width: 900px) 100vw, 420px" />
        ) : (
          <EmptyState>Waiting for image</EmptyState>
        )}
      </div>
    </Card>
  );
}
