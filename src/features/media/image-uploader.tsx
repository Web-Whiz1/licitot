"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ImagePlus, Loader2, RotateCcw, Star, X } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MAX_IMAGES } from "@/features/auctions/constants"
import { uploadImage, UploadError, type UploadedImage } from "./upload-image"

type Item = {
  key: string
  status: "uploading" | "done" | "error"
  progress: number
  /** Object URL for fresh uploads, ImageKit path for saved images. */
  src: string
  file?: File
  image?: UploadedImage
}

type Props = {
  initial: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  onPendingChange: (pending: boolean) => void
  invalid?: boolean
  describedBy?: string
}

export function ImageUploader({ initial, onChange, onPendingChange, invalid, describedBy }: Props) {
  const t = useTranslations("sell")
  const inputId = useId()
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((image) => ({
      key: image.fileId,
      status: "done",
      progress: 100,
      src: image.path,
      image,
    })),
  )
  const [dragOver, setDragOver] = useState(false)
  const objectUrls = useRef(new Set<string>())

  // Report finished images (in display order) and whether uploads are still running.
  useEffect(() => {
    onChange(items.flatMap((i) => (i.status === "done" && i.image ? [i.image] : [])))
    onPendingChange(items.some((i) => i.status === "uploading"))
  }, [items, onChange, onPendingChange])

  useEffect(() => {
    const urls = objectUrls.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const patch = useCallback((key: string, update: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...update } : i)))
  }, [])

  const start = useCallback(
    async (key: string, file: File) => {
      patch(key, { status: "uploading", progress: 0 })
      try {
        const image = await uploadImage(file, "auction", {
          onProgress: (progress) => patch(key, { progress }),
        })
        patch(key, { status: "done", progress: 100, image })
      } catch (err) {
        patch(key, { status: "error" })
        if (err instanceof UploadError && err.code === "rate_limited") {
          toast.error(t("errors.rate_limited"))
        }
      }
    },
    [patch, t],
  )

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    const room = MAX_IMAGES - items.length
    if (room <= 0) {
      toast.error(t("photoTooMany"))
      return
    }
    const accepted: Item[] = []
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        toast.error(t("photoNotImage", { name: file.name }))
        continue
      }
      if (accepted.length >= room) {
        toast.error(t("photoTooMany"))
        break
      }
      const src = URL.createObjectURL(file)
      objectUrls.current.add(src)
      accepted.push({ key: crypto.randomUUID(), status: "uploading", progress: 0, src, file })
    }
    setItems((prev) => [...prev, ...accepted])
    for (const item of accepted) void start(item.key, item.file!)
  }

  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const from = prev.findIndex((i) => i.key === active.id)
      const to = prev.findIndex((i) => i.key === over.id)
      return arrayMove(prev, from, to)
    })
  }

  const position = (id: string | number) => items.findIndex((i) => i.key === id) + 1

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault()
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-tint" : "border-input bg-muted/40",
          invalid && "border-destructive",
        )}
      >
        <ImagePlus aria-hidden className="size-8 text-primary" />
        <p className="text-sm">
          {t("photosDrop")}{" "}
          <label
            htmlFor={inputId}
            className="cursor-pointer font-semibold text-primary underline underline-offset-4 focus-within:outline-2"
          >
            {t("photosBrowse")}
            <input
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-describedby={describedBy}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </label>
        </p>
        <p className="text-xs text-muted-foreground">{t("photosCount", { count: items.length })}</p>
      </div>

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: { draggable: t("dnd.instructions") },
            announcements: {
              onDragStart: ({ active }) => t("dnd.picked", { from: position(active.id) }),
              onDragOver: ({ active, over }) =>
                over
                  ? t("dnd.over", { from: position(active.id), to: position(over.id) })
                  : undefined,
              onDragEnd: ({ over }) =>
                over ? t("dnd.dropped", { to: position(over.id) }) : undefined,
              onDragCancel: () => t("dnd.cancelled"),
            },
          }}
        >
          <SortableContext items={items.map((i) => i.key)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {items.map((item, index) => (
                <SortableTile
                  key={item.key}
                  item={item}
                  index={index}
                  onRemove={() => remove(item.key)}
                  onRetry={() => item.file && void start(item.key, item.file)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  )
}

function SortableTile({
  item,
  index,
  onRemove,
  onRetry,
}: {
  item: Item
  index: number
  onRemove: () => void
  onRetry: () => void
}) {
  const t = useTranslations("sell")
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative aspect-square touch-manipulation overflow-hidden rounded-lg border bg-muted",
        isDragging && "z-10 shadow-overlay ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label={t("photoMove", { n: index + 1 })}
        {...attributes}
        {...listeners}
      >
        <Image
          src={item.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 33vw"
          className={cn("object-cover", item.status !== "done" && "opacity-60")}
          unoptimized={item.src.startsWith("blob:")}
          placeholder={item.image?.blurDataUrl ? "blur" : "empty"}
          blurDataURL={item.image?.blurDataUrl ?? undefined}
        />
      </button>

      {index === 0 && item.status === "done" ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
          <Star aria-hidden className="size-3" /> {t("photoMain")}
        </span>
      ) : null}

      {item.status === "uploading" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/80 p-1.5">
          <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium">
            <Loader2 aria-hidden className="size-3 animate-spin" />
            <span role="status">{t("photoUploading")}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {item.status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-destructive-soft/90 p-2 text-center">
          <div className="space-y-1">
            <p role="alert" className="text-[0.6875rem] font-medium text-destructive">
              {t("photoFailed")}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-xs font-semibold text-destructive underline"
            >
              <RotateCcw aria-hidden className="size-3" /> {t("photoRetry")}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        aria-label={t("photoRemove")}
        className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-background/90 text-foreground hover:bg-background"
      >
        <X aria-hidden className="size-4" />
      </button>
    </li>
  )
}
