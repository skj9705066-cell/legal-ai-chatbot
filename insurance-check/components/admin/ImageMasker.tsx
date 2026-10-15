"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, ImagePlus, Undo2 } from "lucide-react";
import { REVIEW_IMAGE_MAX_BYTES } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Box = { x: number; y: number; w: number; h: number };

const MAX_WIDTH = 1080;

/**
 * 후기 캡처의 개인정보(프로필 사진·전화번호·실명)를 가리는 도구.
 * 드래그한 영역을 불투명 박스로 덮고, 캔버스에서 JPEG로 다시 저장한다
 * → 원본의 EXIF(촬영 위치·기기 정보)도 함께 제거된다. 원본 파일은 서버로 보내지 않는다.
 */
export function ImageMasker({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [drag, setDrag] = useState<Box | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  function draw(list: Box[], pending: Box | null) {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.fillStyle = "#1F2937";
    for (const b of list) ctx.fillRect(b.x, b.y, b.w, b.h);
    if (pending) {
      ctx.fillStyle = "rgba(31,41,55,0.55)";
      ctx.fillRect(pending.x, pending.y, pending.w, pending.h);
    }
  }

  function exportImage(list: Box[]) {
    const c = canvasRef.current;
    if (!c) return;
    draw(list, null);
    let q = 0.86;
    let url = c.toDataURL("image/jpeg", q);
    while (url.length * 0.75 > REVIEW_IMAGE_MAX_BYTES && q > 0.4) {
      q -= 0.12;
      url = c.toDataURL("image/jpeg", q);
    }
    onChange(url);
  }

  useEffect(() => {
    if (loaded) exportImage(boxes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes, loaded]);

  function load(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("JPEG·PNG·WEBP 이미지만 올릴 수 있습니다.");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
        const c = canvasRef.current!;
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        imgRef.current = img;
        setBoxes([]);
        setLoaded(true);
        draw([], null);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-navy-300 bg-white px-4 py-3 text-[14px] font-semibold text-navy hover:border-blue">
        <ImagePlus className="h-5 w-5 text-blue" aria-hidden="true" />
        고객 동의 캡처 이미지 선택
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => load(e.target.files?.[0])} data-testid="review-image-input" />
      </label>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className={loaded ? "space-y-2" : "hidden"}>
        <p className="text-[13px] font-semibold text-navy-600">
          <Eraser className="mr-1 inline h-4 w-4" aria-hidden="true" />
          프로필 사진·이름·전화번호 위를 드래그해 가려 주세요. 가린 결과만 저장됩니다.
        </p>
        <canvas
          ref={canvasRef}
          data-testid="review-image-canvas"
          className="max-h-[520px] w-auto max-w-full cursor-crosshair touch-none rounded-xl ring-1 ring-navy-200"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = point(e);
            setDrag({ x: p.x, y: p.y, w: 0, h: 0 });
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            const p = point(e);
            // drag는 처음 누른 지점(원점)을 유지한다
            draw(boxes, { x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
          }}
          onPointerUp={(e) => {
            if (!drag) return;
            const p = point(e);
            const b = { x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) };
            setDrag(null);
            if (b.w > 4 && b.h > 4) setBoxes((list) => [...list, b]);
            else draw(boxes, null);
          }}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={!boxes.length} onClick={() => setBoxes((l) => l.slice(0, -1))}>
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            마지막 가림 취소
          </Button>
          <span className="text-[13px] text-navy-600" data-testid="mask-count">
            가린 영역 {boxes.length}곳
          </span>
        </div>
      </div>
    </div>
  );
}
