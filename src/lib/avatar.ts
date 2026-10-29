import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { clientStorage } from "@/lib/firebase/client";

export function compressAvatar(file: File): Promise<File> {
  return imageCompression(file, { maxSizeMB: 0.05, maxWidthOrHeight: 256, fileType: "image/webp", useWebWorker: true });
}

export async function uploadAvatar(file: File): Promise<string> {
  const avatarRef = ref(clientStorage(), `avatars/${crypto.randomUUID()}.webp`);
  await uploadBytes(avatarRef, file, { contentType: "image/webp" });
  return getDownloadURL(avatarRef);
}
