import {navigationKind, popupKind} from '../src/navigation';

test('keeps HTTPS pages in the app and hands device links to Android', () => {
  expect(navigationKind('https://www.occanova.com/customer/login')).toBe('web');
  expect(navigationKind('https://checkout.razorpay.com/')).toBe('web');
  expect(navigationKind('tel:+919000000000')).toBe('external');
  expect(navigationKind('upi://pay?pa=merchant@example')).toBe('external');
  // eslint-disable-next-line no-script-url
  expect(navigationKind('javascript:alert(1)')).toBe('blocked');
  expect(navigationKind('file:///private/data')).toBe('blocked');
});

test('only Occanova popups navigate in the same WebView', () => {
  expect(popupKind('https://www.occanova.com/customer/verify')).toBe('internal');
  expect(popupKind('https://www.occanova.com.evil.example/')).toBe('external');
  expect(popupKind('https://checkout.razorpay.com/')).toBe('external');
});
