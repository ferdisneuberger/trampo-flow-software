(function () {
  try {
    var key = 'trampo-flow:theme';
    var stored = window.localStorage.getItem(key);
    var systemDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    var preference =
      stored === 'dark' || stored === 'system' ? stored : 'light';
    var theme =
      preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;

    var meta = document.getElementById('theme-color');

    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#12100e' : '#f2e8d5');
    }
  } catch (error) {
    /* localStorage ou matchMedia indisponíveis: mantém o tema claro. */
  }
})();
