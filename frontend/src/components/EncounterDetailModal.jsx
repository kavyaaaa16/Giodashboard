import React from "react";
import { X, Eye } from "lucide-react";
import { C } from "../theme.js";
import { btnGhost } from "./ui.jsx";

export default function EncounterDetailModal({ id, onClose, onSeen }) {
  React.useEffect(() => { onSeen(id); }, [id]);
  const timeline = [
    { t: "00:00.0", agent: "Clinical Transcription", conf: 0.98, event: "Utterance transcribed, speaker=clinician" },
    { t: "00:03.2", agent: "Medical Interpretation", conf: 0.94, event: "Interpreted en→es, medication entity detected" },
    { t: "00:03.6", agent: "Entity Check", conf: null, event: "RxNorm cross-check: pass" },
    { t: "00:41.1", agent: "Orchestrator", conf: 0.61, event: "Confidence below threshold on laterality entity" },
    { t: "00:41.3", agent: "Escalation", conf: null, event: "escalation.triggered — trigger_type=confidence" },
    { t: "18:22.0", agent: "Escalation", conf: null, event: "escalation.abandoned — wait_ms=41200, reason=no_interpreter_available" },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(14,23,38,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50
    }}>
      <div style={{ background: C.panel, borderRadius: 10, width: 640, maxWidth: "92vw", maxHeight: "82vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: C.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>ENCOUNTER DETAIL · RESTRICTED</div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "IBM Plex Mono, monospace" }}>{id}</div>
          </div>
          <button onClick={onClose} style={{ ...btnGhost, padding: 6 }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16, display: "flex", gap: 6, alignItems: "center" }}>
          <Eye size={13} /> This view was just recorded to the audit log with your identity and a timestamp.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {timeline.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 64, fontSize: 11, color: C.inkFaint, fontFamily: "IBM Plex Mono, monospace", flexShrink: 0 }}>{e.t}</div>
              <div style={{ width: 150, fontSize: 12, fontWeight: 600, color: C.ink, flexShrink: 0 }}>{e.agent}</div>
              <div style={{ flex: 1, fontSize: 12.5, color: C.inkSub }}>{e.event}</div>
              {e.conf !== null && (
                <div style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: e.conf < 0.7 ? C.critical : C.inkFaint, flexShrink: 0 }}>
                  conf {e.conf.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
