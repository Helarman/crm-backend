export function generateRandomCode(length: number): string {
    const numbers = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return result;
  }