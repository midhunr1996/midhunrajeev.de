// Contact block: copy the email address, and a draft email whose subject names the chosen role.
const COPY_STATUS_MS = 3000;
const SITE_HOST = 'midhunrajeev.de';

export function draftMailto(email, role) {
  const subject = role ? `${role.subject} via ${SITE_HOST}` : `Enquiry via ${SITE_HOST}`;
  const body = `Hi Midhun,\n\nI saw your portfolio at ${SITE_HOST} and would like to talk.\n\n`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function initContact({ copyButton, status, draft, profile }) {
  let timer;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      status.textContent = 'Copied';
    } catch {
      status.textContent = 'Copying is blocked here. Select the address instead.';
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = '';
    }, COPY_STATUS_MS);
  });

  function setRole(role) {
    draft.href = draftMailto(profile.email, role);
  }
  setRole(null);
  return { setRole };
}
