class AuthManager {
  static get loginCount(): number {
    return parseInt(localStorage.getItem('loginCount') || '0', 10);
  }

  static set loginCount(value: number) {
    localStorage.setItem('loginCount', value.toString());
  }

  static incrementLoginCount(): void {
    const currentCount = this.loginCount;
    this.loginCount = currentCount + 1;
  }
}
export default AuthManager;