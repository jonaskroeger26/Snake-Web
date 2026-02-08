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
import * as LocalAuthentication from 'expo-local-authentication';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Dimensions, Platform, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRef, useEffect } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import { SolanaMobileWalletAdapterErrorCode } from '@solana-mobile/mobile-wallet-adapter-protocol';

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
      // Use MWA 2.0 authorize params (chain + identity). Mainnet for Seeker/production.
      const result = await transact(async (wallet) => {
        console.log('[Expo] Authorizing with wallet...');
        const authResult = await wallet.authorize({
          identity: APP_IDENTITY,
          chain: 'solana:mainnet-beta',
        });
        console.log('[Expo] Authorization result:', authResult);
        return authResult;
      });

      if (!result?.accounts || result.accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Protocol returns address as base64; decode to base58 for display/API
      let address = result.accounts[0].address;
      if (typeof address === 'string') {
        try {
          const bytes = Buffer.from(address, 'base64');
          if (bytes.length === 32) {
            address = new PublicKey(bytes).toBase58();
          }
        } catch (_) {
          // already base58 or other format
        }
      }
      if (typeof address !== 'string' && address && address.length) {
        address = new PublicKey(address).toBase58();
      } else if (typeof address !== 'string') {
        address = String(address);
      }
      const addressStr = address.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      console.log('[Expo] ✅ Connected, address:', address);

      const script = `
        (function() {
          var addr = '${addressStr}';
          console.log('[MWA Bridge] Injecting connection result:', addr);
          if (window.__snakeWalletAdapter) {
            window.__snakeWalletAdapter.connectedAccount = { address: addr };
            window.__snakeWalletAdapter.connectedWallet = { name: 'Mobile Wallet Adapter' };
            window.__snakeWalletAdapter.ready = true;
            window.dispatchEvent(new CustomEvent('snakeMWAConnected', { detail: { address: addr } }));
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
      // Minty-fresh pattern: handle "no wallet" explicitly with a clear user message
      const isNoWallet =
        error?.code === (SolanaMobileWalletAdapterErrorCode && SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND) ||
        error?.code === 'ERROR_WALLET_NOT_FOUND' ||
        (error?.message && /no installed wallet|wallet not found/i.test(error.message));
      const errorMessage = isNoWallet
        ? 'No wallet found. Please use the Seeker device wallet or install a compatible wallet.'
        : (error.message || String(error));
      const escaped = errorMessage.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const errorScript = `
        (function() {
          console.error('[MWA Bridge] Injecting error:', '${escaped}');
          window.dispatchEvent(new CustomEvent('snakeMWAError', { detail: { error: '${escaped}' } }));
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

      // Ensure connect function exists and uses React Native bridge
      window.__snakeWalletAdapter.connect = function() {
        console.log('[MWA Bridge] connect() called, using React Native bridge');
        if (!window.ReactNativeWebView) {
          console.error('[MWA Bridge] ReactNativeWebView not available!');
          return Promise.reject(new Error('React Native bridge not available'));
        }
        
        return new Promise((resolve, reject) => {
          // Send message to React Native
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'connect' }));
            console.log('[MWA Bridge] ✅ Sent connect message to React Native');
          } catch (err) {
            console.error('[MWA Bridge] Failed to send message:', err);
            reject(new Error('Failed to communicate with React Native'));
            return;
          }
          
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
      window.__snakeWalletAdapter.disconnect = function() {
        console.log('[MWA Bridge] disconnect() called');
        // Send disconnect message to React Native if needed
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'disconnect' }));
        }
        window.__snakeWalletAdapter.connectedAccount = null;
        window.__snakeWalletAdapter.connectedWallet = null;
      };
      
      console.log('[MWA Bridge] ✅ Bridge ready, adapter:', {
        ready: window.__snakeWalletAdapter.ready,
        hasConnect: typeof window.__snakeWalletAdapter.connect === 'function',
        hasDisconnect: typeof window.__snakeWalletAdapter.disconnect === 'function',
        inApp: window.__SNAKE_IN_APP,
        reactNativeWebView: !!window.ReactNativeWebView
      });
    })();
    true;
  `;

  const handleMessage = async (event) => {
    try {
      console.log('[Expo] Received message from WebView:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'connect') {
        console.log('[Expo] Connect requested – requiring biometric...');
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          const errMsg = 'Biometric (fingerprint/face) is not set up on this device. Please add it in device settings.';
          injectError(errMsg);
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm with fingerprint or face to connect wallet',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        if (!result.success) {
          const errMsg = result.error === 'user_cancel' ? 'Connection cancelled' : 'Biometric verification failed';
          injectError(errMsg);
          return;
        }
        console.log('[Expo] Biometric OK – starting wallet connection...');
        connectMWA().catch((err) => {
          console.error('[Expo] Connect failed:', err);
        });
      } else {
        console.log('[Expo] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[Expo] Message parse error:', error, 'Raw data:', event.nativeEvent.data);
      injectError(error?.message || 'Something went wrong');
    }
  };

  const injectError = (errorMessage) => {
    const escaped = (errorMessage || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const script = `
      (function() {
        window.dispatchEvent(new CustomEvent('snakeMWAError', { detail: { error: '${escaped}' } }));
      })();
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const webViewSource = TEST_WEBVIEW_WITH_HTML
    ? { html: '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#1a1a2e;color:#eee;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;font-size:24px">WebView OK</body></html>' }
    : {
        uri: PWA_URL + '?v=' + Date.now(),
        headers: Platform.OS === 'android' ? { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : undefined,
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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView] ❌ Error loading page:', {
            code: nativeEvent.code,
            description: nativeEvent.description,
            domain: nativeEvent.domain,
            url: nativeEvent.url || PWA_URL
          });
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView] ❌ HTTP Error:', {
            statusCode: nativeEvent.statusCode,
            url: nativeEvent.url,
            description: nativeEvent.description
          });
          // Show user-friendly error
          if (nativeEvent.statusCode === 404) {
            webViewRef.current?.injectJavaScript(`
              document.body.innerHTML = '<div style="padding:20px;text-align:center;color:#fff;background:#000;min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;"><h1>404 - Page Not Found</h1><p>The app could not load. Please check your internet connection.</p><p style="color:#666;font-size:12px;">URL: ${nativeEvent.url || PWA_URL}</p></div>';
            `);
          }
        }}
        onLoadStart={() => console.log('[WebView] Load started')}
        onLoadEnd={() => {
          console.log('[WebView] Load finished');
          // Re-inject bridge after a short delay so it runs after mwa-bundle.js and overwrites connect
          if (!TEST_WEBVIEW_WITH_HTML && webViewRef.current) {
            setTimeout(() => {
              webViewRef.current?.injectJavaScript(injectedJavaScript);
            }, 300);
          }
        }}
        onLoad={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('[WebView] Loaded:', nativeEvent.url);
        }}
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
