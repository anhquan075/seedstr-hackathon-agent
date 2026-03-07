export function formatBytes(bytes: number, decimals = 2): string {
 if (!+bytes) return '0 Bytes';
 const k = 1024;
 const dm = decimals < 0 ? 0 : decimals;
 const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function truncateFilename(name: string, maxLength: number = 30): string {
 if (name.length <= maxLength) return name;
 const extIndex = name.lastIndexOf('.');
 if (extIndex === -1) return name.slice(0, maxLength) + '...';
 
 const ext = name.slice(extIndex);
 const namePart = name.slice(0, extIndex);
 
 // Keep extension visible if possible
 const availableCharsForName = maxLength - ext.length - 3; // -3 for ellipsis
 
 if (availableCharsForName < 1) {
  // If extension is super long or name allowance is too small, just truncate the end
  return name.slice(0, maxLength) + '...';
 }
 
 return namePart.slice(0, availableCharsForName) + '...' + ext;
}

export function getFileIcon(filename: string): string {
 // Emojis removed per project requirements
 return '';
}
