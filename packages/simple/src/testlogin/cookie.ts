const cookie = {
  set(name, value, days) {
    if (days) {
      const d = new Date();
      d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
      window.document.cookie = `${name}=${value};path=/;expires=${d.toGMTString()}`;
    } else {
      window.document.cookie = `${name}=${value};path=/`;
    }
  },
  get(name) {
    const v = window.document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
    return v ? v[2] : null;
  },
  delete(name) {
    this.set(name, '', -1);
  },
};

export default cookie;