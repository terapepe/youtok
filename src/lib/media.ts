import type { Booking, Position } from './db'

export type Overlay = Pick<Booking, 'type' | 'text' | 'style' | 'x' | 'y' | 'w' | 'h'>

// When the overlay is on screen, given the booked position and the video length
export function windowOf(pos: Position, duration: number, showFor: number) {
  const len = Math.min(showFor, duration)
  const start = pos === 'intro' ? Math.min(1, duration - len) : pos === 'outro' ? Math.max(0, duration - len - 1) : Math.max(0, duration / 2 - len / 2)
  return { start, end: start + len }
}

// Reads duration/size from a video file and grabs a thumbnail frame (JPEG)
export function probeVideo(file: Blob): Promise<{ duration: number; width: number; height: number; thumb: Blob }> {
  return new Promise((res, rej) => {
    const v = document.createElement('video')
    v.preload = 'auto'; v.muted = true; v.playsInline = true
    v.src = URL.createObjectURL(file)
    v.onerror = () => rej(new Error('This file could not be read as a video'))
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3) }
    v.onseeked = () => {
      const c = document.createElement('canvas')
      const scale = Math.min(1, 640 / v.videoWidth)
      c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale)
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
      c.toBlob((b) => {
        URL.revokeObjectURL(v.src)
        b ? res({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: b }) : rej(new Error('Thumbnail failed'))
      }, 'image/jpeg', 0.82)
    }
  })
}

const loadImg = (url: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url
})

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fill()
}

// Draws one placement on a canvas frame (same layout as <AdOverlay/>)
export function drawPlacement(g: CanvasRenderingContext2D, W: number, H: number, p: Overlay, img?: HTMLImageElement) {
  const x = (p.x / 100) * W, y = (p.y / 100) * H, w = (p.w / 100) * W, h = (p.h / 100) * H
  const s = p.style, k = W / 640
  g.save(); g.globalAlpha = s.opacity
  if (p.type !== 'image') { g.fillStyle = s.bg; roundRect(g, x, y, w, h, s.radius * k) }
  const pad = p.type === 'image' ? 0 : 8 * k
  let tx = x + pad
  if (img && p.type !== 'text') {
    const ih = h - pad * 2, iw = p.type === 'combo' ? Math.min(ih * (img.width / img.height), w * 0.4) : w
    const fit = Math.min(iw / img.width, ih / img.height)
    const dw = img.width * fit, dh = img.height * fit
    g.drawImage(img, x + pad + (iw - dw) / 2, y + pad + (ih - dh) / 2, dw, dh)
    tx = x + pad + iw + pad
  }
  if (p.text && p.type !== 'image') {
    g.fillStyle = s.color
    g.font = `${s.weight} ${s.size * k}px "Plus Jakarta Sans", Inter, sans-serif`
    g.textBaseline = 'middle'
    const maxW = x + w - pad - tx
    const words = p.text.split(/\s+/), lines: string[] = []
    let cur = ''
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd } else cur = t }
    if (cur) lines.push(cur)
    const lh = s.size * k * 1.2, top = y + h / 2 - ((lines.length - 1) * lh) / 2
    lines.forEach((l, i) => g.fillText(l, tx, top + i * lh, maxW))
  }
  g.restore()
}

// Renders the source video with the ad burned in → WebM blob (runs in real time)
export async function renderWithAd(src: string, p: Overlay & Pick<Booking, 'position' | 'showFor'>, imageUrl: string, onProgress: (f: number) => void): Promise<Blob> {
  const v = document.createElement('video')
  v.src = src; v.playsInline = true; v.crossOrigin = 'anonymous'
  await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = () => j(new Error('Video failed to load')) })
  const img = imageUrl ? await loadImg(imageUrl) : undefined
  const win = windowOf(p.position, v.duration, p.showFor)
  const scale = Math.min(1, 1280 / v.videoWidth)
  const c = document.createElement('canvas')
  c.width = Math.round(v.videoWidth * scale) & ~1; c.height = Math.round(v.videoHeight * scale) & ~1
  const g = c.getContext('2d')!
  const stream = c.captureStream(30)
  // keep the original audio track (routed silently, not to the speakers)
  const ac = new AudioContext()
  const dest = ac.createMediaStreamDestination()
  ac.createMediaElementSource(v).connect(dest)
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || ''
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<Blob>((r) => { rec.onstop = () => r(new Blob(chunks, { type: 'video/webm' })) })
  let raf = 0
  const frame = () => {
    g.drawImage(v, 0, 0, c.width, c.height)
    if (v.currentTime >= win.start && v.currentTime <= win.end) drawPlacement(g, c.width, c.height, p, img)
    onProgress(v.currentTime / (v.duration || 1))
    raf = requestAnimationFrame(frame)
  }
  rec.start(500)
  frame()
  await v.play()
  await new Promise((r) => { v.onended = r })
  cancelAnimationFrame(raf)
  rec.stop()
  ac.close()
  onProgress(1)
  return done
}
