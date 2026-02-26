import React, { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

SplashScreen.preventAutoHideAsync();

const SOLANAPOD_URL = 'https://solana-pod.vercel.app/';
const MIN_SPLASH_MS = 1000;

export default function App() {
  const player = useAudioPlayer(null);
  const currentAudioUrlRef = useRef(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewOpacity = useRef(new Animated.Value(0)).current;
  const mountTimeRef = useRef(Date.now());

  // Hide splash only after WebView has loaded AND minimum splash time – avoids flash when opening/closing fast
  useEffect(() => {
    if (!webViewReady) return;
    const elapsed = Date.now() - mountTimeRef.current;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      Animated.timing(webViewOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [webViewReady, webViewOpacity]);

  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'mixWithOthers',
        });
      } catch (e) {
        console.warn('expo-audio setAudioModeAsync:', e?.message);
      }
    })();
  }, []);

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type !== 'playback') return;

      if (msg.isPlaying && msg.audioUrl) {
        // Only replace source when the song actually changed (avoids restart loop from web heartbeat)
        if (currentAudioUrlRef.current !== msg.audioUrl) {
          currentAudioUrlRef.current = msg.audioUrl;
          player.replace(msg.audioUrl);
        }
        player.play();
        try {
          player.setActiveForLockScreen(true, {
            title: msg.title || 'SolanaPod',
            artist: msg.artist || '',
            album: msg.album || '',
            artwork: msg.artwork,
          });
        } catch (_) {}
      } else {
        player.pause();
      }
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.webviewWrap, { opacity: webViewOpacity }]}>
        <WebView
          source={{ uri: SOLANAPOD_URL }}
          style={styles.webview}
          backgroundColor="#050508"
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          overScrollMode="never"
          bounces={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          mixedContentMode="compatibility"
          onMessage={handleMessage}
          onLoadEnd={() => setWebViewReady(true)}
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
    overflow: 'hidden',
  },
  webviewWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#050508',
  },
});
