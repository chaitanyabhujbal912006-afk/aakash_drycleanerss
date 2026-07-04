import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Complaints() {
  const [list, setList] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const load = () => api.get("/complaints").then(({ data }) => setList(data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    await api.post("/complaints", { subject, message });
    toast.success("Complaint submitted. We'll respond within 4 hours.");
    setSubject(""); setMessage(""); load();
  };

  return (
    <div className="space-y-4" data-testid="client-complaints">
      <div>
        <div className="overline">Support</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">Raise a concern</h1>
      </div>

      <form onSubmit={submit} className="wf-card p-4 space-y-3">
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)}
                 data-testid="complaint-subject" required className="mt-1 h-11" />
        </div>
        <div>
          <Label className="text-xs">Describe the issue</Label>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
                    data-testid="complaint-message" required className="mt-1" />
        </div>
        <Button type="submit" data-testid="complaint-submit"
                className="w-full h-11 bg-brand hover:bg-brand-600 text-white">
          Submit
        </Button>
      </form>

      <div>
        <div className="overline mb-2">Recent</div>
        {list.length === 0 && <div className="wf-card p-4 text-sm text-muted2">Nothing yet — we hope it stays that way.</div>}
        {list.map((c) => (
          <div key={c.id} className="wf-card p-3 mb-2">
            <div className="flex justify-between">
              <div className="font-medium text-sm">{c.subject}</div>
              <div className="text-[11px] text-muted2">{c.status}</div>
            </div>
            <div className="text-xs text-muted2 mt-1">{c.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
