"use client";

import {
  Check,
  Clipboard,
  Download,
  ExternalLink,
  FlipHorizontal,
  ImageOff,
  Loader2,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Badge, Button, Card, EmptyState } from "./ui";
import type { UplaneImage } from "@/lib/images/types";

type Notice = {
  tone: "success" | "danger" | "neutral";
  message: string;
};

type Phase = "idle" | "uploading" | "removing" | "flipping";

const TEMP_PREFIX = "temp-";

function statusTone(status: UplaneImage["status"]) {
  if (status === "complete") return "success";
  if (status === "processing") return "warning";
  if (status === "failed" || status === "deleted") return "danger";
  return "neutral";
}

function stageLabel(image: UplaneImage | null) {
  if (!image) return "";
  if (image.status === "failed") return "Processing failed";
  if (image.status === "processing") return "Processing…";
  if (image.processedStage === "flipped") return "Final image ready";
  if (image.processedStage === "background_removed") return "Background removed";
  return "Uploaded";
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Request failed.";
}

const PIPELINE = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "removing", label: "Remove bg", icon: Scissors },
  { key: "flipping", label: "Flip", icon: FlipHorizontal }
] as const;

function Stepper({ phase, failed }: { phase: Phase; failed: boolean }) {
  const order: Phase[] = ["uploading", "removing", "flipping"];
  const activeIndex = phase === "idle" ? -1 : order.indexOf(phase);

  return (
    <div className="stepper" role="status" aria-live="polite">
      {PIPELINE.map((stage, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        const isFailed = failed && isActive;
        const Icon = stage.icon;
        const stateClass = isFailed
          ? "step-failed"
          : isDone
            ? "step-done"
            : isActive
              ? "step-active"
              : "";

        return (
          <Fragment key={stage.key}>
            {index > 0 ? (
              <div
                className={`step-connector${index <= activeIndex ? " step-connector-filled" : ""}`}
                aria-hidden="true"
              />
            ) : null}
            <div className={`step ${stateClass}`}>
              <span className="step-dot">
                {isFailed ? (
                  <X size={16} />
                ) : isDone ? (
                  <Check size={16} />
                ) : isActive ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Icon size={16} />
                )}
              </span>
              <span className="step-label">{stage.label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export function ImageTransformApp() {
  const [images, setImages] = useState<UplaneImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pipelineFailed, setPipelineFailed] = useState(false);
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const timers = useRef<number[]>([]);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );

  const showNotice = useCallback((message: string, tone: Notice["tone"] = "neutral") => {
    setNotice({ message, tone });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4200);
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
        if (!response.ok) throw new Error(await readError(response));
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
      clearTimers();
      setBusyAction("upload");
      setPipelineFailed(false);
      setPhase("uploading");

      const tempId = `${TEMP_PREFIX}${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const placeholder: UplaneImage = {
        id: tempId,
        originalPath: "",
        processedPath: null,
        originalUrl: "",
        processedUrl: null,
        processedStage: "none",
        status: "processing",
        error: null,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      setImages((current) => [placeholder, ...current]);
      setSelectedId(tempId);

      // Optimistic stage timeline — reflects the real pipeline order
      // (upload -> remove background -> flip). Boundaries are indicative,
      // then reconciled to the true result when the request resolves.
      timers.current.push(window.setTimeout(() => setPhase("removing"), 650));

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/images", { method: "POST", body: formData });
        if (!response.ok) throw new Error(await readError(response));

        const body = (await response.json()) as { image: UplaneImage };
        clearTimers();
        setPhase("flipping");

        timers.current.push(
          window.setTimeout(() => {
            setImages((current) => [
              body.image,
              ...current.filter((item) => item.id !== tempId && item.id !== body.image.id)
            ]);
            setSelectedId(body.image.id);
            setPhase("idle");
            setBusyAction(null);
            showNotice("Image ready.", "success");
          }, 420)
        );
      } catch (error) {
        clearTimers();
        setPipelineFailed(true);
        setImages((current) =>
          current.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  status: "failed",
                  error: error instanceof Error ? error.message : "Processing failed."
                }
              : item
          )
        );
        showNotice(error instanceof Error ? error.message : "Processing failed.", "danger");
        timers.current.push(
          window.setTimeout(() => {
            setPhase("idle");
            setPipelineFailed(false);
            setBusyAction(null);
          }, 1400)
        );
        await loadImages();
      }
    },
    [clearTimers, loadImages, showNotice]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) void uploadFile(file);
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
      setArmedDeleteId(null);
      setRemovingId(image.id);
      setBusyAction(`delete-${image.id}`);

      // Let the collapse animation play before removing from state.
      await new Promise((resolve) => window.setTimeout(resolve, 240));

      try {
        const response = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error(await readError(response));

        setImages((current) => current.filter((item) => item.id !== image.id));
        setSelectedId((current) => (current === image.id ? null : current));
        showNotice("Image deleted.", "success");
      } catch (error) {
        showNotice(error instanceof Error ? error.message : "Delete failed.", "danger");
      } finally {
        setRemovingId(null);
        setBusyAction(null);
      }
    },
    [showNotice]
  );

  const copyProcessedUrl = useCallback(async () => {
    if (!selectedImage?.processedUrl) return;
    await navigator.clipboard.writeText(selectedImage.processedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    showNotice("Final URL copied.", "success");
  }, [selectedImage, showNotice]);

  const downloadProcessed = useCallback(async () => {
    if (!selectedImage?.processedUrl) return;
    setBusyAction("download");
    try {
      const response = await fetch(selectedImage.processedUrl);
      if (!response.ok) throw new Error("Could not fetch image.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedImage.originalFileName.replace(/\.[^.]+$/, "")}-transformed.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Download failed.", "danger");
    } finally {
      setBusyAction(null);
    }
  }, [selectedImage, showNotice]);

  const isUploading = busyAction === "upload";
  const isProcessingSelected =
    selectedImage?.status === "processing" || (isUploading && selectedImage?.id.startsWith(TEMP_PREFIX));
  const canShare =
    Boolean(selectedImage?.processedUrl) && selectedImage?.status === "complete" && !isUploading;

  const NoticeIcon = notice?.tone === "success" ? Check : notice?.tone === "danger" ? X : Sparkles;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Uplane image service</p>
            <h1>Image Transform</h1>
          </div>
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

      <div className="toast-region" aria-live="polite">
        {notice ? (
          <div className={`toast toast-${notice.tone}`}>
            <NoticeIcon size={16} aria-hidden="true" />
            {notice.message}
          </div>
        ) : null}
      </div>

      <div className="workspace-grid">
        <div className="top-row">
          <Card>
            <div className="card-heading">
              <div>
                <h2>Upload image</h2>
                <p>Drop a file to remove its background and flip it horizontally.</p>
              </div>
              {isUploading ? <Loader2 className="spin" size={20} aria-hidden="true" /> : null}
            </div>

            <div
              {...getRootProps({
                className: `dropzone${isDragActive ? " dropzone-active" : ""}`
              })}
            >
              <input {...getInputProps()} />
              <span className="dropzone-icon">
                <Upload size={24} aria-hidden="true" />
              </span>
              <strong>{isDragActive ? "Drop to upload" : "Drag an image here"}</strong>
              <span>PNG, JPEG, or WebP up to 8 MB</span>
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

          <Card className="history-card">
            <div className="history-inner">
              <div className="card-heading">
                <div>
                  <h2>Recent</h2>
                  <p>Select an image to preview.</p>
                </div>
              </div>

              <div className="history-list">
                {images.length === 0 ? (
                  <EmptyState>
                    <ImageOff size={22} aria-hidden="true" />
                    No images yet — upload one to begin.
                  </EmptyState>
                ) : (
                  images.map((image) => {
                    const isTemp = image.id.startsWith(TEMP_PREFIX);
                    const isArmed = armedDeleteId === image.id;
                    const isRemoving = removingId === image.id;
                    return (
                      <div
                        key={image.id}
                        className={`history-item${
                          image.id === selectedImage?.id ? " history-item-active" : ""
                        }${isRemoving ? " history-item-removing" : ""}`}
                      >
                        <button
                          type="button"
                          className="history-select"
                          onClick={() => setSelectedId(image.id)}
                        >
                          <span className="history-thumb">
                            {image.processedUrl || image.originalUrl ? (
                              <Image
                                src={image.processedUrl ?? image.originalUrl}
                                alt=""
                                fill
                                sizes="52px"
                              />
                            ) : (
                              <span className="skeleton skeleton-thumb" />
                            )}
                          </span>
                          <span className="history-meta">
                            <strong>{image.originalFileName}</strong>
                            <span className="history-stage">{stageLabel(image)}</span>
                            <Badge tone={statusTone(image.status)}>{image.status}</Badge>
                          </span>
                          {image.status === "processing" || isTemp ? (
                            <Loader2 className="spin" size={18} aria-hidden="true" />
                          ) : (
                            <Check size={18} aria-hidden="true" />
                          )}
                        </button>
                        {isArmed ? (
                          <span
                            className="row-confirm"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="confirm-button"
                              onClick={() => setArmedDeleteId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="confirm-button confirm-button-danger"
                              onClick={() => void deleteImage(image)}
                            >
                              Delete
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="row-delete"
                            aria-label={`Delete ${image.originalFileName}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setArmedDeleteId(image.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card>
            <div className="card-heading">
              <div>
                <h2>Final output</h2>
                <p>Background removed, flipped horizontally, and hosted as a PNG.</p>
              </div>
              {selectedImage ? (
                <Badge tone={statusTone(selectedImage.status)}>{selectedImage.status}</Badge>
              ) : null}
            </div>

            {isUploading || pipelineFailed ? (
              <Stepper phase={phase} failed={pipelineFailed} />
            ) : null}

            <div className="action-row">
              <Button
                type="button"
                variant="primary"
                className={copied ? "is-confirmed" : undefined}
                onClick={copyProcessedUrl}
                disabled={!canShare}
              >
                {copied ? <Check size={18} /> : <Clipboard size={18} />}
                {copied ? "Copied" : "Copy URL"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={downloadProcessed}
                disabled={!canShare || busyAction === "download"}
              >
                {busyAction === "download" ? (
                  <Loader2 className="spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                Download
              </Button>
              {selectedImage?.processedUrl ? (
                <a
                  className="button button-ghost"
                  href={selectedImage.processedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={18} aria-hidden="true" />
                  Open
                </a>
              ) : null}
            </div>

            <div className="url-panel">
              <span className="url-label">URL</span>
              <code>{selectedImage?.processedUrl ?? "Available after processing"}</code>
            </div>

            {selectedImage?.error ? (
              <div className="inline-alert">
                <X size={16} aria-hidden="true" />
                {selectedImage.error}
              </div>
            ) : null}
          </Card>

          <div className="preview-grid">
            <PreviewCard
              title="Result"
              subtitle={stageLabel(selectedImage)}
              url={selectedImage?.processedUrl ?? null}
              loading={Boolean(isProcessingSelected)}
            />
            <PreviewCard
              title="Original"
              subtitle="Reference"
              url={selectedImage?.originalUrl || null}
              loading={Boolean(isProcessingSelected && !selectedImage?.originalUrl)}
            />
          </div>
      </div>
    </main>
  );
}

function PreviewCard({
  title,
  subtitle,
  url,
  loading
}: {
  title: string;
  subtitle?: string;
  url: string | null;
  loading?: boolean;
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
        ) : loading ? (
          <span className="skeleton" />
        ) : (
          <EmptyState>
            <ImageOff size={20} aria-hidden="true" />
            Nothing here yet
          </EmptyState>
        )}
      </div>
    </Card>
  );
}
