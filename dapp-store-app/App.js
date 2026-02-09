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
import * as SecureStore from 'expo-secure-store';
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

const PWA_URL = 'https://solanasnake.app/';

const APP_IDENTITY = {
  name: 'Snake - Solana',
  uri: 'https://solanasnake.app',
  icon: 'icons/icon.svg',
};

const SESSION_KEY = 'snake_mwa_session';

function addressFromAccount(account) {
  let address = account?.address;
  if (typeof address === 'string') {
    try {
      const bytes = Buffer.from(address, 'base64');
      if (bytes.length === 32) return new PublicKey(bytes).toBase58();
    } catch (_) {}
  }
  if (address && typeof address !== 'string') address = new PublicKey(address).toBase58();
  return typeof address === 'string' ? address : String(address || '');
}

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

  const getStoredSession = async () => {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session?.address && session?.authToken) return session;
    } catch (_) {}
    return null;
  };

  const setStoredSession = async (address, authToken) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ address, authToken }));
    } catch (e) {
      console.warn('[Expo] Failed to store session:', e);
    }
  };

  const clearStoredSession = async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (_) {}
  };

  const injectConnected = (addressStr) => {
    const script = `
      (function() {
        var addr = '${addressStr}';
        if (window.__snakeWalletAdapter) {
          window.__snakeWalletAdapter.connectedAccount = { address: addr };
          window.__snakeWalletAdapter.connectedWallet = { name: 'Mobile Wallet Adapter' };
          window.__snakeWalletAdapter.ready = true;
          window.dispatchEvent(new CustomEvent('snakeMWAConnected', { detail: { address: addr } }));
        }
      })();
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const injectDisconnected = () => {
    const script = `
      (function() {
        if (window.__snakeWalletAdapter) {
          window.__snakeWalletAdapter.connectedAccount = null;
          window.__snakeWalletAdapter.connectedWallet = null;
          window.dispatchEvent(new CustomEvent('snakeMWADisconnected'));
        }
      })();
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const connectMWA = async () => {
    try {
      const stored = await getStoredSession();

      // If we have a stored session, try to re-authorize with auth_token (no sign-in prompt).
      if (stored?.address && stored?.authToken) {
        try {
          console.log('[Expo] Re-authorizing with stored session...');
          const result = await transact(async (wallet) => {
            return await wallet.authorize({
              identity: APP_IDENTITY,
              chain: 'solana:mainnet-beta',
              auth_token: stored.authToken,
            });
          });
          if (result?.accounts?.length > 0 && result?.auth_token) {
            const address = addressFromAccount(result.accounts[0]);
            await setStoredSession(address, result.auth_token);
            injectConnected(address.replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
            return address;
          }
        } catch (e) {
          console.log('[Expo] Stored session invalid, will do full sign-in:', e?.message);
          await clearStoredSession();
        }
      }

      // First-time or invalid session: require Sign in with Solana (signature) then persist.
      console.log('[Expo] First-time connect – Sign in with Solana (signature required)...');
      const result = await transact(async (wallet) => {
        return await wallet.authorize({
          identity: APP_IDENTITY,
          chain: 'solana:mainnet-beta',
          sign_in_payload: {
            domain: 'solanasnake.app',
            statement: 'Sign to connect Snake - Solana to your wallet. This proves you control the address.',
            uri: 'https://solanasnake.app',
          },
        });
      });

      if (!result?.accounts || result.accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }
      const address = addressFromAccount(result.accounts[0]);
      const authToken = result.auth_token;
      if (authToken) await setStoredSession(address, authToken);

      const addressStr = address.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      injectConnected(addressStr);
      return address;
    } catch (error) {
      console.error('[Expo] ❌ MWA connect error:', error);
      const isNoWallet =
        error?.code === (SolanaMobileWalletAdapterErrorCode && SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND) ||
        error?.code === 'ERROR_WALLET_NOT_FOUND' ||
        (error?.message && /no installed wallet|wallet not found/i.test(error.message));
      const errorMessage = isNoWallet
        ? 'No wallet found. Please use the Seeker device wallet or install a compatible wallet.'
        : (error?.message || String(error));
      const escaped = errorMessage.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const errorScript = `
        (function() {
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
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'connect') {
        console.log('[Expo] Connect requested – connecting via MWA (Seeker/Seed Vault)...');
        connectMWA().catch((err) => {
          console.error('[Expo] Connect failed:', err);
          injectError(err?.message || 'Connection failed');
        });
      } else if (data.type === 'disconnect') {
        const session = await getStoredSession();
        await clearStoredSession();
        if (session?.authToken) {
          try {
            await transact((wallet) => wallet.deauthorize({ auth_token: session.authToken }));
          } catch (_) {}
        }
        injectDisconnected();
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
            setTimeout(async () => {
              webViewRef.current?.injectJavaScript(injectedJavaScript);
              // Restore persisted session so user stays connected until they sign out
              const session = await getStoredSession();
              if (session?.address) {
                const addressStr = session.address.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                setTimeout(() => injectConnected(addressStr), 100);
              }
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
