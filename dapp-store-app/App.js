import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== 'undefined' ? crypto : new Crypto();

(() => {
  if (typeof crypto === 'undefined') {
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    });
  }
})();

import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Dimensions, Platform, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRef, useEffect } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const { width: W, height: H } = Dimensions.get('window');

// Set to true to verify WebView can render at all (shows "WebView OK" page).
const TEST_WEBVIEW_WITH_HTML = false;

const PWA_URL = 'https://snake-web-phi.vercel.app/';

const APP_IDENTITY = {
  name: 'Snake - Solana',
  uri: 'https://snake-web-phi.vercel.app',
  icon: 'icons/icon.svg',
};

export default function App() {
  const webViewRef = useRef(null);

  // Force-hide splash after 2s so we never stay stuck on black splash
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        SplashScreen.hideAsync().catch(() => {});
      } catch (_) {}
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  const connectMWA = async () => {
    try {
      console.log('[Expo] Starting MWA connection...');
      const result = await transact(async (wallet) => {
        console.log('[Expo] Authorizing with wallet...');
        const authResult = await wallet.authorize({
          cluster: 'solana:devnet',
          identity: APP_IDENTITY,
        });
        console.log('[Expo] Authorization result:', authResult);
        return authResult;
      });

      if (!result?.accounts || result.accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const address = result.accounts[0].address;
      console.log('[Expo] ✅ Connected, address:', address);
      
      const script = `
        (function() {
          console.log('[MWA Bridge] Injecting connection result:', '${address}');
          if (window.__snakeWalletAdapter) {
            window.__snakeWalletAdapter.connectedAccount = { address: '${address}' };
            window.__snakeWalletAdapter.connectedWallet = { name: 'Mobile Wallet Adapter' };
            window.__snakeWalletAdapter.ready = true;
            window.dispatchEvent(new CustomEvent('snakeMWAConnected', { detail: { address: '${address}' } }));
            console.log('[MWA Bridge] ✅ Connection event dispatched');
          } else {
            console.error('[MWA Bridge] ❌ __snakeWalletAdapter not found!');
          }
        })();
      `;
      webViewRef.current?.injectJavaScript(script);
      return address;
    } catch (error) {
      console.error('[Expo] ❌ MWA connect error:', error);
      const errorMessage = error.message || String(error);
      const errorScript = `
        (function() {
          console.error('[MWA Bridge] Injecting error:', '${errorMessage.replace(/'/g, "\\'")}');
          window.dispatchEvent(new CustomEvent('snakeMWAError', { detail: { error: '${errorMessage.replace(/'/g, "\\'")}' } }));
        })();
      `;
      webViewRef.current?.injectJavaScript(errorScript);
      throw error;
    }
  };

  const injectedJavaScript = `
    (function() {
      console.log('[MWA Bridge] Injecting bridge script...');
      
      if (!window.__snakeWalletAdapter) {
        window.__snakeWalletAdapter = {
          ready: false,
          connectedWallet: null,
          connectedAccount: null,
          connect: null,
          disconnect: null,
        };
      }

      window.__SNAKE_IN_APP = true;
      
      // Block arrow keys
      document.addEventListener('keydown', function(e) {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) !== -1) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);

      // Listen for MWA connect requests from PWA
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'snakeMWAConnect') {
          console.log('[MWA Bridge] Received connect request from PWA');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'connect' }));
        }
      });

      // Override connect to use React Native bridge
      const originalConnect = window.__snakeWalletAdapter.connect;
      window.__snakeWalletAdapter.connect = function() {
        console.log('[MWA Bridge] connect() called, using React Native bridge');
        return new Promise((resolve, reject) => {
          // Send message to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'connect' }));
          
          // Set up event listeners for response
          const handleConnected = (event) => {
            console.log('[MWA Bridge] Received connected event:', event.detail);
            if (event.detail && event.detail.address) {
              window.removeEventListener('snakeMWAConnected', handleConnected);
              window.removeEventListener('snakeMWAError', handleError);
              resolve(event.detail.address);
            }
          };
          const handleError = (event) => {
            console.error('[MWA Bridge] Received error event:', event.detail);
            window.removeEventListener('snakeMWAConnected', handleConnected);
            window.removeEventListener('snakeMWAError', handleError);
            reject(new Error(event.detail?.error || 'Connection failed'));
          };
          
          window.addEventListener('snakeMWAConnected', handleConnected);
          window.addEventListener('snakeMWAError', handleError);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            window.removeEventListener('snakeMWAConnected', handleConnected);
            window.removeEventListener('snakeMWAError', handleError);
            reject(new Error('Connection timeout - no response from Seeker wallet'));
          }, 30000);
        });
      };

      window.__snakeWalletAdapter.ready = true;
      console.log('[MWA Bridge] ✅ Bridge ready, adapter:', {
        ready: window.__snakeWalletAdapter.ready,
        hasConnect: typeof window.__snakeWalletAdapter.connect === 'function',
        inApp: window.__SNAKE_IN_APP
      });
    })();
    true;
  `;

  const handleMessage = (event) => {
    try {
      console.log('[Expo] Received message from WebView:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'connect') {
        console.log('[Expo] Handling connect request...');
        connectMWA().catch((err) => {
          console.error('[Expo] Connect failed:', err);
        });
      } else {
        console.log('[Expo] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[Expo] Message parse error:', error, 'Raw data:', event.nativeEvent.data);
    }
  };

  const webViewSource = TEST_WEBVIEW_WITH_HTML
    ? { html: '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#1a1a2e;color:#eee;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;font-size:24px">WebView OK</body></html>' }
    : {
        uri: PWA_URL,
        headers: Platform.OS === 'android' ? { 'Cache-Control': 'no-cache' } : undefined,
      };

  const injectedJavaScriptBeforeContentLoaded = TEST_WEBVIEW_WITH_HTML ? '' : 'window.__SNAKE_IN_APP=true;';

  const onRootLayout = () => {
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch (_) {}
  };

  const content = (
    <View style={[styles.container, { width: W, height: H }]} onLayout={onRootLayout}>
      <StatusBar style="light" />
      <WebView
        ref={webViewRef}
        source={webViewSource}
        style={[styles.webview, { width: W, height: H }]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={false}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        injectedJavaScript={TEST_WEBVIEW_WITH_HTML ? '' : injectedJavaScript}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onMessage={handleMessage}
        setSupportMultipleWindows={false}
        scrollEnabled={true}
        overScrollMode="never"
        nestedScrollEnabled={true}
        androidLayerType="hardware"
      />
    </View>
  );

  // Render inside Modal so content may show when main window stays black (no reinstall)
  return (
    <Modal visible={true} transparent={false} statusBarTranslucent>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    opacity: 1,
  },
});
