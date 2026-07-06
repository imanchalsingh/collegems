export function scrollToFirstError(errors: Record<string, any>) {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return;

  const firstErrorKey = errorKeys[0];

  let element = document.getElementsByName(firstErrorKey)[0] as HTMLElement | undefined;

  if (!element) {
    element = document.getElementById(firstErrorKey) as HTMLElement | undefined;
  }

  if (!element) {
    element = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement | undefined;
  }

  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setTimeout(() => {
      element?.focus({ preventScroll: true });
    }, 200);
  }
}
