import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Camera, ShieldCheck, X, CheckCircle2 } from "lucide-react";

const CATEGORIES = ["Gents", "Ladies", "Kids", "Household"];

export default function PickupEntry() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState("count"); // count → otp
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  // Camera state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data));
    // Start GPS pinging every 30s
    const gpsInterval = setInterval(pingGps, 30000);
    pingGps();
    return () => {
      clearInterval(gpsInterval);
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pingGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        api.post("/gps/ping", { lat: coords.latitude, lng: coords.longitude, order_id: id })
          .catch(() => {}); // silent fail
      },
      () => {} // silent fail if denied
    );
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // rear camera on mobile
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch {
      toast.error("Camera not available. Please allow camera access.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedPhoto) return;
    setPhotoUploading(true);
    try {
      await api.post("/photos/upload", {
        order_id: id,
        checkpoint: "driver_count",
        data_url: capturedPhoto,
      });
      setPhotoUploaded(true);
      toast.success("Photo uploaded successfully.");
    } catch {
      toast.error("Photo upload failed — continuing without it.");
    } finally {
      setPhotoUploading(false);
    }
  };

  if (!order) return <div className="text-muted2 text-sm">Loading…</div>;

  const saveCount = async () => {
    setBusy(true);
    try {
      const items = CATEGORIES.filter((c) => counts[c]).map((c) => ({
        category: c, count: Number(counts[c]),
      }));
      if (items.length === 0) { toast.error("Enter counts for at least one category"); return; }
      await api.post(`/orders/${id}/driver-count`, { items, photo_urls: [], driver_notes: notes });
      toast.success("Count logged. Ask client to generate OTP now.");
      setStep("otp");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/${id}/verify-pickup-otp`, { otp });
      toast.success("Pickup confirmed!");
      nav("/delivery");
    } catch (e) { toast.error(e?.response?.data?.detail || "Invalid OTP"); }
    finally { setBusy(false); }
  };

  const expected = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalEntered = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <div className="space-y-5" data-testid="delivery-pickup">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <button onClick={() => nav(-1)} className="text-muted2 flex items-center gap-1 text-sm hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> back
      </button>

      <div>
        <div className="overline">Pickup · {order.number}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">{order.client_name}</h1>
        <div className="text-sm text-muted2 mt-1">{order.pickup_address}</div>
      </div>

      {step === "count" && (
        <>
          {/* Camera Section */}
          <div className="wf-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">📸 Photo Evidence</Label>
              {photoUploaded && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Uploaded
                </span>
              )}
            </div>

            {showCamera && (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 object-cover" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button
                    onClick={capturePhoto}
                    className="bg-white text-black rounded-full px-5 py-2 text-sm font-bold shadow-lg"
                  >
                    Capture
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-black/60 text-white rounded-full p-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {capturedPhoto && !showCamera && (
              <div className="relative rounded-lg overflow-hidden">
                <img src={capturedPhoto} alt="captured" className="w-full max-h-48 object-cover rounded-lg" />
                <button
                  onClick={() => { setCapturedPhoto(null); setPhotoUploaded(false); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {!showCamera && !capturedPhoto && (
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-brand text-brand text-sm font-medium hover:bg-brand-50"
                >
                  <Camera className="w-4 h-4" />
                  Open Camera
                </button>
              )}
              {capturedPhoto && !photoUploaded && (
                <Button
                  onClick={uploadPhoto}
                  disabled={photoUploading}
                  size="sm"
                  className="flex-1 bg-brand hover:bg-brand-600 text-white"
                >
                  {photoUploading ? "Uploading…" : "Upload Photo"}
                </Button>
              )}
            </div>
          </div>

          {/* Count Section */}
          <div className="space-y-3">
            {CATEGORIES.map((c) => (
              <div key={c} className="wf-card p-4">
                <Label className="text-xs">{c}</Label>
                <Input
                  type="number" inputMode="numeric" placeholder="0"
                  value={counts[c] || ""}
                  onChange={(e) => setCounts({ ...counts, [c]: e.target.value })}
                  data-testid={`count-${c.toLowerCase()}`}
                  className="mt-1 h-14 text-2xl font-display font-bold text-center"
                />
              </div>
            ))}
            <div className="wf-card p-3 text-sm flex justify-between">
              <span className="text-muted2">Expected {expected} · Entered {totalEntered}</span>
              <span className={totalEntered === expected ? "text-brand font-medium" : "text-amber-600 font-medium"}>
                {totalEntered === expected ? "match" : "diff"}
              </span>
            </div>
            <div>
              <Label className="text-xs">Driver notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                        data-testid="driver-notes" className="mt-1" placeholder="Stains, tears, missing buttons…" />
            </div>
          </div>

          <Button onClick={saveCount} disabled={busy}
                  data-testid="save-count-button"
                  className="w-full h-14 bg-brand hover:bg-brand-600 text-white text-base">
            {busy ? "Saving…" : "Save count & request OTP"}
          </Button>
        </>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="wf-card p-5 bg-brand-50 border-brand">
            <div className="overline text-brand">Step 2</div>
            <div className="font-display text-xl font-extrabold mt-1">Enter client&apos;s 6-digit OTP</div>
            <p className="text-xs text-muted2 mt-1">Ask the customer to show the OTP from their app.</p>
          </div>

          <Input
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            data-testid="otp-input"
            placeholder="••••••" maxLength={6}
            className="h-16 text-3xl font-mono text-center tracking-[0.3em] bg-white"
          />
          <Button onClick={verifyOtp} disabled={busy || otp.length !== 6}
                  data-testid="verify-otp-button"
                  className="w-full h-14 bg-brand hover:bg-brand-600 text-white text-base">
            <ShieldCheck className="w-5 h-5 mr-2" />
            {busy ? "Verifying…" : "Confirm pickup"}
          </Button>
        </div>
      )}
    </div>
  );
}
