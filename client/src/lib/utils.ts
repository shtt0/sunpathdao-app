import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWalletAddress(address: string | null): string {
  if (!address) return '';
  if (address.length < 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';
  } catch {
    return '';
  }
}

export function formatSOL(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 SOL';
  
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numberAmount)) return '0 SOL';
  
  return `${numberAmount.toFixed(2)} SOL`;
}

export function calculateTimeLeft(expiryDate: string | Date): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  text: string;
} {
  const now = new Date();
  const expiryTime = new Date(expiryDate).getTime();
  const difference = expiryTime - now.getTime();
  
  const isExpired = difference <= 0;
  
  if (isExpired) {
    // Calculate how long ago it expired
    const absDifference = Math.abs(difference);
    const days = Math.floor(absDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDifference % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) {
      text = `Expired ${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      text = `Expired ${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      text = `Expired ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    return { days, hours, minutes, isExpired, text };
  }
  
  // Calculate time remaining
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  
  let text = '';
  if (days > 0) {
    text = `Expires in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    text = `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    text = `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return { days, hours, minutes, isExpired, text };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]); // Remove the data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Generate a static map URL for a route between two locations
export function generateStaticMapUrl(
  startLocation: string,
  endLocation: string,
  width: number = 800,
  height: number = 400
): string {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error("Google Maps API key not found");
      return '';
    }
    
    if (!startLocation || !endLocation) {
      console.error("Start or end location missing");
      return '';
    }
    
    const encodedStart = encodeURIComponent(startLocation);
    const encodedEnd = encodeURIComponent(endLocation);
    
    // Basic URL with start and end markers
    let url = `https://maps.googleapis.com/maps/api/staticmap?`;
    
    // Set size
    url += `size=${width}x${height}`;
    
    // Add markers
    url += `&markers=color:green|label:S|${encodedStart}`;
    url += `&markers=color:red|label:E|${encodedEnd}`;
    
    // Add path
    url += `&path=color:0x0000FF88|weight:5|${encodedStart}|${encodedEnd}`;
    
    // Add zoom and map type
    url += `&zoom=13&maptype=roadmap`;
    
    // Add API key
    url += `&key=${apiKey}`;
    
    console.log("Generated static map URL (without API key):", url.replace(apiKey, "API_KEY"));
    
    return url;
  } catch (error) {
    console.error("Error generating static map URL:", error);
    return '';
  }
}
