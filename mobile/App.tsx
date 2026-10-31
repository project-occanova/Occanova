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
// The library's public types intersect iOS, Android and Windows props. This preview is Android-only.
const AndroidWebView = WebView as unknown as React.ComponentType<
  AndroidWebViewProps & React.RefAttributes<WebView>
>;

function AppContent() {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

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
    webView.current?.reload();
  };

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
        onLoadEnd={() => setProgress(1)}
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
      {!error && progress < 1 ? (
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
      ) : progress === 0 ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={GREEN} size="large" />
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
