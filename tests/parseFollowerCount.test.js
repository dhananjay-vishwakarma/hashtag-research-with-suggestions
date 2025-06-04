const { parseFollowerCount } = require('../popup');

describe('parseFollowerCount', () => {
  test('handles plain numbers', () => {
    expect(parseFollowerCount('1,234 followers')).toBe(1234);
    expect(parseFollowerCount('56789')).toBe(56789);
  });

  test('handles K suffix', () => {
    expect(parseFollowerCount('12K followers')).toBe(12000);
    expect(parseFollowerCount('3.5K')).toBe(3500);
  });

  test('handles M suffix', () => {
    expect(parseFollowerCount('2M followers')).toBe(2000000);
    expect(parseFollowerCount('1.2M')).toBe(1200000);
  });

  test('handles invalid inputs', () => {
    expect(parseFollowerCount('N/A')).toBe(0);
    expect(parseFollowerCount(undefined)).toBe(0);
  });
});
