// Saves text as a file on the phone, using a Blob and a temporary link.
// downloadText('name.json', '{...}', 'application/json')
export function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before the link is released.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
