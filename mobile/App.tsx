import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import type {AndroidWebViewProps} from 'react-native-webview/lib/WebViewTypes';
import {APP_URL, navigationKind, popupKind} from './src/navigation';

const GREEN = '#315B1C';
const CREAM = '#FFFCF5';
const MIN_SPLASH_DURATION_MS = 2200;
// The library's public types intersect iOS, Android and Windows props. This preview is Android-only.
const AndroidWebView = WebView as unknown as React.ComponentType<
  AndroidWebViewProps & React.RefAttributes<WebView>
>;

function AppContent() {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [splashTimeElapsed, setSplashTimeElapsed] = useState(false);
  const [initialPageReady, setInitialPageReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashTimeElapsed(true), MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) {
        return false;
      }
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const openExternal = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', 'Please check that a suitable app is installed.');
    });
  }, []);

  const retry = () => {
    setError(false);
    setProgress(0);
    setInitialPageReady(false);
    webView.current?.reload();
  };

  const showSplash = !error && (!splashTimeElapsed || !initialPageReady);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <AndroidWebView
        ref={webView}
        source={{uri: APP_URL}}
        style={styles.webView}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="never"
        setSupportMultipleWindows
        allowsFullscreenVideo
        onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
        onLoadStart={() => {
          setError(false);
          setProgress(0);
        }}
        onLoadProgress={({nativeEvent}) => setProgress(nativeEvent.progress)}
        onLoadEnd={() => {
          setProgress(1);
          setInitialPageReady(true);
        }}
        onError={() => setError(true)}
        onRenderProcessGone={() => setError(true)}
        onShouldStartLoadWithRequest={request => {
          const kind = navigationKind(request.url);
          if (kind === 'external') {
            openExternal(request.url);
          }
          return kind === 'web';
        }}
        onOpenWindow={({nativeEvent}) => {
          const url = nativeEvent.targetUrl;
          if (url === 'about:blank') {
            return;
          }
          if (popupKind(url) === 'internal') {
            webView.current?.injectJavaScript(
              `window.location.assign(${JSON.stringify(url)}); true;`,
            );
          } else if (navigationKind(url) !== 'blocked') {
            openExternal(url);
          }
        }}
      />
      {!error && !showSplash && progress < 1 ? (
        <View style={styles.progressTrack} accessibilityLabel="Loading Occanova">
          <View style={[styles.progressBar, {width: `${Math.max(8, progress * 100)}%`}]} />
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorOverlay}>
          <Image source={require('./assets/occanova-logo.jpg')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.errorTitle}>We could not open Occanova</Text>
          <Text style={styles.errorMessage}>Check your internet connection and try again.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading Occanova again"
            onPress={retry}
            style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : showSplash ? (
        <View style={styles.loadingOverlay} accessibilityLabel="Occanova is opening">
          <Image source={require('./assets/occanova-logo.jpg')} style={styles.splashLogo} resizeMode="contain" />
          <ActivityIndicator color={GREEN} size="small" />
          <Text style={styles.loadingText}>Opening Occanova…</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: CREAM},
  webView: {flex: 1, backgroundColor: CREAM},
  progressTrack: {height: 3, backgroundColor: '#E7ECD9'},
  progressBar: {height: 3, backgroundColor: GREEN},
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
  },
  splashLogo: {width: 260, height: 260, marginBottom: 12},
  loadingText: {fontSize: 14, color: '#586253', marginTop: 18},
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: CREAM,
  },
  logo: {width: 200, height: 200, marginBottom: 20},
  errorTitle: {fontSize: 24, fontWeight: '700', color: '#223519', textAlign: 'center'},
  errorMessage: {fontSize: 16, lineHeight: 23, color: '#586253', textAlign: 'center', marginTop: 12},
  retryButton: {marginTop: 28, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 12, backgroundColor: GREEN},
  retryText: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
});
