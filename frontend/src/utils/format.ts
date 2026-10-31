const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return dateFormatter.format(date);
}

export function formatFileSize(sizeInBytes: number): string {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes < 0) {
    return '—';
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = sizeInBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} ${units[unitIndex]}`;
}
