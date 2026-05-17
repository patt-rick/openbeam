import { useCallback, useEffect, useRef } from "react"
import { useAudioStore, useSettingsStore } from "@/stores"
import { getManager } from "@/streams/setup"
import type { DeviceInfo } from "@/types"

const AUDIO_CONSTRAINTS = {
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
} as const

export function useAudio() {
  const store = useAudioStore()
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const activeDeviceIdRef = useRef<string | null>(null)

  const loadDevices = useCallback(async () => {
    const mediaDevices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = mediaDevices.filter((d) => d.kind === "audioinput")
    const devices: DeviceInfo[] = audioInputs.map((d, i) => ({
      id: d.deviceId,
      name: d.label || `Microphone ${i + 1}`,
      sample_rate: 48000, // Browser default
      channels: 1,
      is_default: d.deviceId === "default",
    }))
    store.setDevices(devices)
    return devices
  }, [store])

  const startCapture = useCallback(
    async (deviceId?: string | null) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          ...AUDIO_CONSTRAINTS,
        },
      })

      const audioContext = new AudioContext({ sampleRate: 16000 })
      await audioContext.audioWorklet.addModule("/audio-processor.js")

      const source = audioContext.createMediaStreamSource(stream)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = store.gain

      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor")

      workletNode.port.onmessage = (event) => {
        const { type } = event.data
        if (type === "audio") {
          getManager()?.transcription.sendBinary(event.data.buffer)
        } else if (type === "level") {
          store.setLevel({ rms: event.data.rms, peak: event.data.peak })
        }
      }

      source.connect(gainNode)
      gainNode.connect(workletNode)
      // Connect to a silent destination so the worklet processes audio
      // without routing mic audio through speakers (avoids feedback)
      workletNode.connect(audioContext.createMediaStreamDestination())

      audioContextRef.current = audioContext
      streamRef.current = stream
      sourceRef.current = source
      gainNodeRef.current = gainNode
      activeDeviceIdRef.current = deviceId ?? null

      store.setCapturing(true)
    },
    [store],
  )

  const stopCapture = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }
    gainNodeRef.current = null
    activeDeviceIdRef.current = null
    store.setCapturing(false)
    store.setLevel({ rms: 0, peak: 0 })
  }, [store])

  // Hot-swap the mic into the existing AudioContext graph without dropping the
  // Deepgram socket. The worklet, gain node, and WebSocket keep running; only
  // the MediaStreamAudioSourceNode is replaced.
  const switchDevice = useCallback(async (deviceId: string | null) => {
    const audioContext = audioContextRef.current
    const gainNode = gainNodeRef.current
    if (!audioContext || !gainNode || !streamRef.current) return
    if (activeDeviceIdRef.current === deviceId) return

    let newStream: MediaStream
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          ...AUDIO_CONSTRAINTS,
        },
      })
    } catch (err) {
      console.error("[audio] switchDevice failed, keeping current device:", err)
      return
    }

    const newSource = audioContext.createMediaStreamSource(newStream)
    newSource.connect(gainNode)

    sourceRef.current?.disconnect()
    streamRef.current.getTracks().forEach((t) => t.stop())

    sourceRef.current = newSource
    streamRef.current = newStream
    activeDeviceIdRef.current = deviceId
  }, [])

  // React to deviceId changes from any source (settings dialog, OSC/HTTP control,
  // etc.) by hot-swapping the live capture. No-op when not capturing.
  useEffect(
    () =>
      useSettingsStore.subscribe((state, prev) => {
        if (state.audioDeviceId !== prev.audioDeviceId) {
          switchDevice(state.audioDeviceId)
        }
      }),
    [switchDevice],
  )

  const setGain = useCallback(
    (gain: number) => {
      store.setGain(gain)
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = gain
      }
    },
    [store],
  )

  return {
    ...store,
    loadDevices,
    startCapture,
    stopCapture,
    setGain,
  }
}
