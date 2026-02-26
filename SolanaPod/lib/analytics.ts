// Google Analytics event tracking utilities

declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: {
        [key: string]: string | number | boolean
      },
    ) => void
  }
}

export const trackEvent = (
  eventName: string,
  params?: {
    [key: string]: string | number | boolean
  },
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params)
    console.log("[v0] Analytics event:", eventName, params)
  }
}

// Device interaction events
export const trackDeviceSwitch = (deviceName: string) => {
  trackEvent("device_switch", {
    device_name: deviceName,
  })
}

// Music playback events
export const trackSongPlay = (artist: string, album: string, song: string, device: string) => {
  trackEvent("song_play", {
    artist,
    album,
    song,
    device,
  })
}

export const trackSongPause = (artist: string, album: string, song: string, device: string) => {
  trackEvent("song_pause", {
    artist,
    album,
    song,
    device,
  })
}

export const trackSongSkip = (
  direction: "next" | "previous",
  artist: string,
  album: string,
  song: string,
  device: string,
) => {
  trackEvent("song_skip", {
    direction,
    artist,
    album,
    song,
    device,
  })
}

// Navigation events
export const trackNavigation = (level: string, item: string, device: string) => {
  trackEvent("navigation", {
    level,
    item,
    device,
  })
}

export const trackMenuBack = (fromLevel: string, toLevel: string, device: string) => {
  trackEvent("menu_back", {
    from_level: fromLevel,
    to_level: toLevel,
    device,
  })
}

// Volume events
export const trackVolumeChange = (volume: number, device: string) => {
  trackEvent("volume_change", {
    volume,
    device,
  })
}

// Button press events
export const trackButtonPress = (buttonName: string, device: string) => {
  trackEvent("button_press", {
    button_name: buttonName,
    device,
  })
}

// Seek events
export const trackSeek = (position: number, device: string) => {
  trackEvent("seek", {
    position,
    device,
  })
}

export const trackAutoplay = (artist: string, album: string, song: string, device: string) => {
  trackEvent("song_autoplay", {
    artist,
    album,
    song,
    device,
  })
}
