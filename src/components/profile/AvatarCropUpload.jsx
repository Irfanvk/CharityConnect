import React, { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a react-easy-crop pixel area to a Blob via canvas. */
async function getCroppedBlob(imageSrc, pixelCrop, rotation = 0) {
    const image = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    // Rotate around centre
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);
    ctx.drawImage(image, (safeArea - image.width) / 2, (safeArea - image.height) / 2);

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    // Apply crop
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
        }, "image/jpeg", 0.92);
    });
}

// ─── component ────────────────────────────────────────────────────────────────

/**
 * AvatarCropUpload
 *
 * Props:
 *   open         – boolean
 *   onOpenChange – (open) => void
 *   onSave       – async (file: File) => void   called with the cropped JPEG File
 */
export default function AvatarCropUpload({ open, onOpenChange, onSave }) {
    const fileInputRef = useRef(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [saving, setSaving] = useState(false);

    // Reset state when dialog closes
    const handleOpenChange = (next) => {
        if (!next) {
            setImageSrc(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setSaving(false);
        }
        onOpenChange(next);
    };

    const onCropComplete = useCallback((_croppedArea, pixels) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setImageSrc(reader.result);
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setSaving(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            await onSave(file);
            handleOpenChange(false);
        } catch {
            // parent handles toast
        } finally {
            setSaving(false);
        }
    };

    const resetAdjustments = () => {
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-sm p-0 overflow-hidden">
                <DialogHeader className="px-4 pt-4 pb-0">
                    <DialogTitle>Adjust Profile Photo</DialogTitle>
                </DialogHeader>

                <div className="px-4 pb-4 space-y-4 mt-3">
                    {/* Cropper area */}
                    {imageSrc ? (
                        <>
                            {/* Fixed-size crop window */}
                            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-black">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>

                            {/* Zoom slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><ZoomOut className="w-3.5 h-3.5" /> Zoom</span>
                                    <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5" />{zoom.toFixed(1)}×</span>
                                </div>
                                <Slider
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    value={[zoom]}
                                    onValueChange={([v]) => setZoom(v)}
                                />
                            </div>

                            {/* Rotation slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Rotate</span>
                                    <span>{rotation}°</span>
                                </div>
                                <Slider
                                    min={-180}
                                    max={180}
                                    step={1}
                                    value={[rotation]}
                                    onValueChange={([v]) => setRotation(v)}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={resetAdjustments}
                                    className="gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setImageSrc(null)}
                                >
                                    Choose different
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save photo"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        /* File picker */
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                            </div>
                            <p className="text-sm text-slate-500 text-center">
                                Pick a JPG or PNG photo.<br />You can zoom and pan to adjust it.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Choose Photo
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
