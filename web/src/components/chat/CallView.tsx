"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneCall, PhoneOff, Video, VideoOff, X } from "lucide-react";
import type { CallMode, CallSignal } from "@/lib/hq-chat";

/* ------------------------------------------------------------------ */
/*  WebRTC call manager                                                */
/* ------------------------------------------------------------------ */

export type CallState = "idle" | "ringing-out" | "ringing-in" | "active" | "ending";

export function useCallManager(opts: {
  self: { id: string; name: string } | null;
  peerName: string;
  initialMode: CallMode;
  onSignal: (signal: CallSignal) => void;
}) {
  const { self, peerName, initialMode } = opts;
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const iceBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const callTokenRef = useRef(0);
  const [state, setState] = useState<CallState>("idle");
  const [mode, setMode] = useState<CallMode>(initialMode);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(initialMode === "video");
  const [timer, setTimer] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteStreamObj = useRef(new MediaStream());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const send = opts.onSignal;

  const flushIce = useCallback((pc: RTCPeerConnection) => {
    const q = iceBufferRef.current;
    while (q.length) {
      const c = q.shift()!;
      void pc.addIceCandidate(c).catch(() => {});
    }
  }, []);

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && self) {
        send({
          type: "candidate",
          from: self,
          candidate: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          },
        });
      }
    };
    pc.ontrack = (e) => {
      const track = e.track;
      if (track.kind === "audio" || track.kind === "video") {
        remoteStreamObj.current.addTrack(track);
        setRemoteStream(remoteStreamObj.current);
      }
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "failed" || s === "disconnected" || s === "closed") {
        cleanup();
      }
    };
    return pc;
  }, [self, send]);

  const ensureMedia = useCallback(async (targetMode: CallMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true, // always request so SDP has video transceiver
      });
      const [audio] = stream.getAudioTracks();
      const [video] = stream.getVideoTracks();
      audioTrackRef.current = audio;
      videoTrackRef.current = video;
      const ls = new MediaStream([audio, video]);
      setLocalStream(ls);
      // If audio-only mode, pause video sending right away
      if (targetMode === "audio" && video && videoSenderRef.current) {
        video.enabled = false;
        void videoSenderRef.current.replaceTrack(null);
        setVideoEnabled(false);
      }
      return { audio, video };
    } catch {
      return null;
    }
  }, []);

  const cleanup = useCallback(() => {
    callTokenRef.current++;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    audioTrackRef.current?.stop();
    videoTrackRef.current?.stop();
    audioTrackRef.current = null;
    videoTrackRef.current = null;
    videoSenderRef.current = null;
    iceBufferRef.current = [];
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) pc.close();
    setLocalStream(null);
    setRemoteStream(null);
    remoteStreamObj.current = new MediaStream();
    setTimer(0);
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(0);
    intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }, []);

  /* ---- public actions ---- */

  const startCall = useCallback(
    (targetMode: CallMode) => {
      if (!self) return;
      setMode(targetMode);
      setState("ringing-out");
      send({ type: "ring", from: self, mode: targetMode });
    },
    [self, send],
  );

  const acceptCall = useCallback(() => {
    if (!self) return;
    setState("active"); // will be set properly once offer arrives
    send({ type: "accept", from: self, mode });
  }, [self, send, mode]);

  const declineCall = useCallback(() => {
    if (!self) return;
    send({ type: "decline", from: self, mode });
    setState("idle");
  }, [self, send, mode]);

  const hangUp = useCallback(() => {
    if (!self) return;
    send({ type: "end", from: self, mode });
    cleanup();
    setState("idle");
  }, [self, send, mode, cleanup]);

  const toggleAudio = useCallback(() => {
    const next = !audioTrackRef.current?.enabled;
    if (audioTrackRef.current) audioTrackRef.current.enabled = next;
    setAudioEnabled(next);
  }, []);

  const toggleVideo = useCallback(async () => {
    if (videoEnabled) {
      // mute: stop sending video
      if (videoSenderRef.current) {
        void videoSenderRef.current.replaceTrack(null);
      }
      videoTrackRef.current?.stop();
      videoTrackRef.current = null;
      setVideoEnabled(false);
    } else {
      // unmute: get new camera and send
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        const [track] = s.getVideoTracks();
        videoTrackRef.current = track;
        if (videoSenderRef.current) {
          void videoSenderRef.current.replaceTrack(track);
        }
        setVideoEnabled(true);
      } catch {
        // no camera → stay audio
      }
    }
  }, [videoEnabled]);

  const switchMode = useCallback(
    (target: CallMode) => {
      if (!self) return;
      if (target === mode) return;
      setMode(target);
      if (target === "audio") {
        if (videoSenderRef.current) void videoSenderRef.current.replaceTrack(null);
        videoTrackRef.current?.stop();
        videoTrackRef.current = null;
        setVideoEnabled(false);
      } else {
        toggleVideo();
      }
      send({ type: "switch", from: self, mode: target });
    },
    [self, send, mode, toggleVideo],
  );

  /* ---- handle remote signals ---- */

  const handleSignal = useCallback(
    async (signal: CallSignal) => {
      if (signal.type === "ring" && state === "idle") {
        setMode(signal.mode);
        setState("ringing-in");
        return;
      }
      if (signal.type === "cancel" && state === "ringing-out") {
        setState("idle");
        cleanup();
        return;
      }
      if (signal.type === "decline" && state === "ringing-out") {
        setState("idle");
        cleanup();
        return;
      }
      if (signal.type === "end") {
        setState("idle");
        cleanup();
        return;
      }

      // Caller received accept → create offer
      if (signal.type === "accept" && state === "ringing-out") {
        setState("active");
        callTokenRef.current++;
        const pc = createPC();
        pcRef.current = pc;
        const media = await ensureMedia(mode);
        if (!media) {
          setState("idle");
          return;
        }
        const stream = new MediaStream([media.audio, media.video]);
        const aSender = pc.addTrack(media.audio, stream);
        const vSender = pc.addTrack(media.video, stream);
        videoSenderRef.current = vSender;
        if (mode === "audio") {
          media.video.enabled = false;
          void vSender.replaceTrack(null);
          setVideoEnabled(false);
        }
        setLocalStream(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        flushIce(pc);
        send({ type: "offer", from: self!, mode, sdp: { type: "offer", sdp: offer.sdp! } });
        startTimer();
        return;
      }

      // Callee received offer → create answer
      if (signal.type === "offer" && self) {
        callTokenRef.current++;
        const pc = createPC();
        pcRef.current = pc;
        const media = await ensureMedia(signal.mode);
        if (!media) return;
        const stream = new MediaStream([media.audio, media.video]);
        const aSender = pc.addTrack(media.audio, stream);
        const vSender = pc.addTrack(media.video, stream);
        videoSenderRef.current = vSender;
        setLocalStream(stream);
        await pc.setRemoteDescription(signal.sdp);
        flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({
          type: "answer",
          from: self,
          mode: signal.mode,
          sdp: { type: "answer", sdp: answer.sdp! },
        });
        setMode(signal.mode);
        if (signal.mode === "audio") {
          media.video.enabled = false;
          void vSender.replaceTrack(null);
          setVideoEnabled(false);
        }
        setState("active");
        startTimer();
        return;
      }

      // Caller received answer
      if (signal.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(signal.sdp);
        flushIce(pcRef.current);
        setState("active");
        startTimer();
        return;
      }

      // ICE candidate
      if (signal.type === "candidate" && pcRef.current) {
        if (pcRef.current.remoteDescription) {
          void pcRef.current.addIceCandidate(signal.candidate).catch(() => {});
        } else {
          iceBufferRef.current.push(signal.candidate);
        }
        return;
      }

      // Remote switch mode
      if (signal.type === "switch") {
        setMode(signal.mode);
        if (signal.mode === "audio" && videoSenderRef.current) {
          void videoSenderRef.current.replaceTrack(null);
          videoTrackRef.current?.stop();
          videoTrackRef.current = null;
          setVideoEnabled(false);
        }
        if (signal.mode === "video" && videoSenderRef.current) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            const [track] = s.getVideoTracks();
            videoTrackRef.current = track;
            void videoSenderRef.current.replaceTrack(track);
            setVideoEnabled(true);
          } catch {}
        }
      }
    },
    [
      state,
      self,
      mode,
      createPC,
      ensureMedia,
      send,
      cleanup,
      flushIce,
      startTimer,
    ],
  );

  return {
    state,
    mode,
    audioEnabled,
    videoEnabled,
    timer,
    localStream,
    remoteStream,
    peerName,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleAudio,
    toggleVideo,
    switchMode,
    handleSignal,
  } as const;
}

/* ------------------------------------------------------------------ */
/*  UI components                                                      */
/* ------------------------------------------------------------------ */

function Avatar({
  name,
  size = 64,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-pos-primary-soft text-pos-primary ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="grid h-full w-full place-items-center text-sm font-semibold">
        {initials}
      </span>
    </div>
  );
}

export function IncomingCallModal({
  callerName,
  mode,
  onAccept,
  onDecline,
}: {
  callerName: string;
  mode: CallMode;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-4 rounded-2xl bg-pos-surface p-8 shadow-pos-lg">
        <div className="relative">
          <Avatar name={callerName} size={72} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-pos-success text-white">
            <Phone size={12} />
          </span>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-pos-ink">{callerName}</p>
          <p className="text-sm text-pos-ink-faint">
            Incoming {mode === "video" ? "video" : "audio"} call…
          </p>
        </div>
        <div className="mt-2 flex gap-4">
          <button
            onClick={onDecline}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
          >
            <PhoneOff size={22} />
          </button>
          <button
            onClick={onAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-pos-success text-white shadow transition hover:opacity-90"
          >
            <Phone size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActiveCallOverlay({
  call,
}: {
  call: ReturnType<typeof useCallManager>;
}) {
  const { state, mode, audioEnabled, videoEnabled, timer, localStream, remoteStream, peerName } =
    call;

  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (state === "idle") return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(Math.floor(timer / 60))}:${pad(timer % 60)}`;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-pos-bg/95">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-pos-border/70 bg-pos-surface px-5 py-4">
        <Avatar name={peerName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-pos-ink">{peerName}</p>
          <p className="text-[12px] text-pos-ink-faint">
            {state === "ringing-out" && "Calling…"}
            {state === "ringing-in" && "Ringing…"}
            {state === "active" && (mode === "video" ? "Video" : "Audio") + " call"}
            {state === "active" && ` · ${time}`}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {mode === "video" && remoteStream ? (
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar name={peerName} size={96} />
            <p className="text-xl font-semibold text-pos-ink">{peerName}</p>
            {state === "active" && (
              <p className="text-sm text-pos-ink-faint">{time}</p>
            )}
          </div>
        )}

        {/* Local preview (picture-in-picture) */}
        {mode === "video" && videoEnabled && localStream ? (
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 h-28 w-20 rounded-xl border-2 border-white/30 object-cover shadow-lg"
          />
        ) : null}
      </div>

      {/* Controls */}
      {state === "active" && (
        <div className="flex items-center justify-center gap-5 border-t border-pos-border/70 bg-pos-surface px-5 py-4">
          <button
            onClick={call.toggleAudio}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              audioEnabled
                ? "bg-pos-surface-muted text-pos-ink hover:bg-pos-border"
                : "bg-red-500 text-white"
            }`}
          >
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={call.toggleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              videoEnabled
                ? "bg-pos-surface-muted text-pos-ink hover:bg-pos-border"
                : "bg-red-500 text-white"
            }`}
          >
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            onClick={() =>
              call.switchMode(call.mode === "audio" ? "video" : "audio")
            }
            className="flex h-12 w-12 items-center justify-center rounded-full bg-pos-surface-muted text-pos-ink transition hover:bg-pos-border"
            title={call.mode === "audio" ? "Switch to video" : "Switch to audio only"}
          >
            <Phone size={20} />
          </button>

          <button
            onClick={call.hangUp}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}

      {state === "ringing-out" && (
        <div className="flex items-center justify-center gap-4 border-t border-pos-border/70 bg-pos-surface px-5 py-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-pos-ink-faint"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <button
            onClick={call.hangUp}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}

      {state === "ringing-in" && (
        <div className="flex items-center justify-center gap-4 border-t border-pos-border/70 bg-pos-surface px-5 py-4">
          <button
            onClick={call.declineCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
          >
            <PhoneOff size={24} />
          </button>
          <button
            onClick={call.acceptCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-pos-success text-white shadow transition hover:opacity-90"
          >
            <Phone size={24} />
          </button>
        </div>
      )}
    </div>
  );
}